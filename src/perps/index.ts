import {
  CallParameters,
  encodeAbiParameters,
  encodeFunctionData,
  formatEther,
  getAbiItem,
  Hex,
  parseEther,
} from 'viem';
import { SynthetixSdk } from '..';
import { DISABLED_MARKETS, ZERO_ADDRESS } from '../constants';
import {
  CollateralData,
  FundingParameters,
  MarketData,
  MarketMetadata,
  MarketSummary,
  MaxMarketValue,
  OpenPositionData,
  OrderData,
  OrderFees,
  OrderQuote,
  SettlementStrategy,
} from './interface';
import { convertEtherToWei, convertWeiToEther, generateRandomAccountId, sleep } from '../utils';
import { Call3Value } from '../interface/contractTypes';

/**
 * Class for interacting with Synthetix Perps V3 contracts
 * Provides methods for creating and managing accounts, depositing and withdrawing
 * collateral, committing and settling orders, and liquidating accounts.
 *
 * Use ``get`` methods to fetch information about accounts, markets, and orders::
 *    const markets = await sdk.perps.getMarkets()
 *    const openPositions = await sdk.perps.getOpenPositions()
 * Other methods prepare transactions, and submit them to your RPC::
 *    const createTxHash = await sdk.perps.createAccount(submit=True)
 *    const collateralTxHash = await sdk.perps.modifyCollateral(amount=1000, market_name='sUSD', submit=True)
 *    const orderTxHash = await sdk.perps.commitOrder(size=10, market_name='ETH', desired_fill_price=2000, submit=True)
 * An instance of this module is available as ``sdk.perps``. If you are using a network without
 * perps deployed, the contracts will be unavailable and the methods will raise an error.
 * The following contracts are required:
 * - PerpsMarketProxy
 * - PerpsAccountProxy
 * - PythERC7412Wrapper
 * @param synthetixSdk An instance of the Synthetix class
 */
export class Perps {
  sdk: SynthetixSdk;
  defaultAccountId?: bigint;
  accountIds: bigint[];

  // Markets data
  marketMetadata: Map<number, MarketMetadata>;
  marketsById: Map<number, MarketData>;
  marketsByName: Map<string, MarketData>;

  // Mapping of Market Symbol to MarketData.
  // @note Ideally prefer using market symbol over market name
  marketsBySymbol: Map<string, MarketData>;

  isErc7412Enabled: boolean = true;
  // Set multicollateral to false by default
  isMulticollateralEnabled: boolean = false;
  disabledMarkets: number[] = [];

  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
    this.accountIds = [];

    // Initialize empty market data
    this.marketMetadata = new Map<number, MarketMetadata>();
    this.marketsById = new Map<number, MarketData>();
    this.marketsByName = new Map<string, MarketData>();
    this.marketsBySymbol = new Map<string, MarketData>();

    // Set disabled markets
    if (synthetixSdk.rpcConfig.chainId in DISABLED_MARKETS) {
      this.disabledMarkets = DISABLED_MARKETS[synthetixSdk.rpcConfig.chainId];
    }
  }

  async initPerps() {
    await this.getMarkets();
    await this.getAccountIds();

    // Check if the Multicollateral is enabled
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    const debtFunctionData = getAbiItem({
      abi: marketProxy.abi,
      name: 'debt',
    });

    const payDebtFunctionData = getAbiItem({
      abi: marketProxy.abi,
      name: 'payDebt',
    });
    if (debtFunctionData != undefined && payDebtFunctionData != undefined) {
      this.isMulticollateralEnabled = true;
      console.log('Multicollateral perps is enabled');
    }
  }

  /**
   * Look up the market_id and market_name for a market. If only one is provided,
   * the other is resolved. If both are provided, they are checked for consistency.
   * @param marketId Id of the market to resolve
   * @param marketName Name of the market to resolve
   */
  public resolveMarket(
    marketId: number | undefined = undefined,
    marketName: string | undefined = undefined,
  ): { resolvedMarketId: number; resolvedMarketName: string } {
    let resolvedMarketId, resolvedMarketName;

    const hasMarketId = marketId != undefined;
    const hasMarketName = marketName != undefined;

    if (!hasMarketId && hasMarketName) {
      if (this.marketsByName.has(marketName)) {
        resolvedMarketId = this.marketsByName.get(marketName)?.marketId;
      } else {
        throw new Error('Invalid market name');
      }
    } else if (hasMarketId && !hasMarketName) {
      if (this.marketsById.has(marketId)) {
        resolvedMarketName = this.marketsById.get(marketId)?.marketName;
      }
    } else if (hasMarketId && hasMarketName) {
      const marketNameLookup = this.marketsById.get(marketId)?.marketName;
      if (marketNameLookup != marketName) {
        throw new Error(`Market name ${marketName} does not match market id ${marketId}`);
      }
    } else {
      throw new Error('Must provide either a marketId or marketName');
    }
    return {
      resolvedMarketId: (resolvedMarketId ?? marketId) as number,
      resolvedMarketName: resolvedMarketName ?? marketName ?? 'Unresolved market',
    };
  }

  /**
   *   Prepare a call to the external node with oracle updates for the specified market names.
   * The result can be passed as the first argument to a multicall function to improve performance
   * of ERC-7412 calls. If no market names are provided, all markets are fetched. This is useful for
   * read functions since the user does not pay gas for those oracle calls, and reduces RPC calls and
   * runtime.
   * @param marketIds An array of market ids to fetch prices for. If not provided, all markets are fetched
   */
  public async prepareOracleCall(marketIds: number[] = []): Promise<Call3Value[]> {
    let marketSymbols: string[] = [];
    if (marketIds.length == 0) {
      marketSymbols = Array.from(this.marketsBySymbol.keys());
    } else {
      marketIds.forEach((marketId) => {
        const marketSymbol = this.marketsById.get(marketId)?.symbol;
        if (marketSymbol != undefined) {
          marketSymbols.push(marketSymbol);
        }
      });
    }

    const priceFeedIds: string[] = [];
    marketSymbols.forEach((marketSymbol) => {
      const feedId = this.sdk.pyth.priceFeedIds.get(marketSymbol);
      if (feedId != undefined) {
        priceFeedIds.push(feedId);
      }
    });

    if (priceFeedIds.length == 0) {
      return [];
    }

    const stalenessTolerance = 30n; // 30 seconds
    const updateData = await this.sdk.pyth.getPriceFeedsUpdateData(priceFeedIds as Hex[]);

    const signedRequiredData = encodeAbiParameters(
      [
        { type: 'uint8', name: 'updateType' },
        { type: 'uint64', name: 'stalenessTolerance' },
        { type: 'bytes32[]', name: 'priceIds' },
        { type: 'bytes[]', name: 'updateData' },
      ],
      [1, stalenessTolerance, priceFeedIds as Hex[], updateData],
    );

    const pythWrapper = await this.sdk.contracts.getPythErc7412WrapperInstance();
    const dataVerificationTx = this.sdk.utils.generateDataVerificationTx(pythWrapper.address, signedRequiredData);

    // set `requireSuccess` to false in this case, since sometimes
    // the wrapper will return an error if the price has already been updated
    dataVerificationTx.requireSuccess = false;

    // @note A better approach would be to fetch the priceUpdateFee for tx dynamically
    // from the Pyth contract instead of using arbitrary values for pyth price update fees
    dataVerificationTx.value = 500n;
    return [dataVerificationTx];
  }

  /**
   * Fetch a list of perps ``account_id`` owned by an address. Perps accounts
   * are minted as an NFT to the owner's address. The ``account_id`` is the
   * token id of the NFTs held by the address.
   * @param address The address to get accounts for. Uses connected address if not provided.
   * @param defaultAccountId The default account ID to set after fetching.
   * @returns A list of account IDs owned by the address
   */

  public async getAccountIds(
    address: string | undefined = undefined,
    defaultAccountId: bigint | undefined = undefined,
  ): Promise<bigint[]> {
    const accountAddress: string = address !== undefined ? address : this.sdk.accountAddress || ZERO_ADDRESS;
    if (accountAddress == ZERO_ADDRESS) {
      throw new Error('Invalid address');
    }

    const accountProxy = await this.sdk.contracts.getPerpsAccountProxyInstance();
    const balance = await accountProxy.read.balanceOf([accountAddress]);
    console.log('balance', balance);

    const argsList = [];

    for (let index = 0; index < Number(balance); index++) {
      argsList.push([accountAddress, index]);
    }
    const accountIds = (await this.sdk.utils.multicallErc7412(
      accountProxy.address,
      accountProxy.abi,
      'tokenOfOwnerByIndex',
      argsList,
    )) as unknown[];

    if (accountIds == undefined) return [];
    // Set Perps account ids
    this.accountIds = accountIds as bigint[];

    console.log('accountIds', accountIds);
    if (defaultAccountId) {
      this.defaultAccountId = defaultAccountId;
    } else if (this.accountIds.length > 0) {
      this.defaultAccountId = this.accountIds[0] as bigint;
      console.log('Using default account id as ', this.defaultAccountId);
    }
    return accountIds as bigint[];
  }

  /**
   * Create a perps account. An account NFT is minted to the sender,
   * who owns the account.
   * @param accountId Id of the account. If not passed, default Perps account ID is used
   * @param submit Executes the transaction if true
   * @returns Transaction hash or transaction data
   */
  public async createAccount(accountId: bigint | undefined = undefined, submit: boolean = false) {
    const txArgs = [];
    if (accountId != undefined) {
      txArgs.push(accountId);
    }

    // const perpsAccountProxy = await this.sdk.contracts.getPerpsAccountProxyInstance();
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    const tx: CallParameters = await this.sdk.utils.writeErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'createAccount',
      txArgs,
    );

    if (submit) {
      const txHash = await this.sdk.executeTransaction(tx);
      console.log('Transaction hash: ', txHash);
      await this.getAccountIds();
      return txHash;
    } else {
      return tx;
    }
  }

  /**
   * Fetch the ids and summaries for all perps markets. Market summaries include
   * information about the market's price, open interest, funding rate, and skew
   */
  // @todo Add logic for disabled markets
  public async getMarkets(): Promise<{ marketsById: Map<number, MarketData>; marketsByName: Map<string, MarketData> }> {
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    const marketIdsResponse: bigint[] = (await perpsMarketProxy.read.getMarkets([])) as bigint[];

    const marketIds = marketIdsResponse.map((id) => {
      return Number(id);
    });

    // Response type from metadata smart contract call - [MarketName, MarketSymbol]
    type MetadataResponse = [string, string];

    const marketMetadataResponse = (await this.sdk.utils.multicallErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'metadata',
      marketIds as unknown[],
    )) as MetadataResponse[];

    const settlementStrategies = await this.getSettlementStrategies(marketIds);
    const pythPriceIds: { symbol: string; feedId: string }[] = [];

    // Set market metadata for all markets and populate Pyth price ids
    marketMetadataResponse.forEach((market, index) => {
      const marketName = market[0];
      const marketSymbol = market[1];
      const settlementStrategy = settlementStrategies.find((strategy) => strategy.marketId == marketIds[index]);

      this.marketMetadata.set(marketIds[index], {
        marketName: marketName,
        symbol: marketSymbol,
        feedId: settlementStrategy?.feedId ?? '0x',
      });

      pythPriceIds.push({
        symbol: marketSymbol,
        feedId: settlementStrategy?.feedId ?? '0x',
      });
    });

    // Update Pyth price feeds
    this.sdk.pyth.updatePriceFeedIds(pythPriceIds);

    const marketSummaries = await this.getMarketSummaries(marketIds);
    const fundingParameters = await this.getFundingParameters(marketIds);
    const orderFees = await this.getOrderFees(marketIds);
    const maxMarketValues = await this.getMaxMarketValues(marketIds);

    marketIds.forEach((marketId) => {
      if (!this.disabledMarkets.includes(marketId)) {
        const marketSummary = marketSummaries.find((summary) => summary.marketId == marketId);
        const fundingParam = fundingParameters.find((fundingParam) => fundingParam.marketId == marketId);
        const orderFee = orderFees.find((orderFee) => orderFee.marketId == marketId);
        const maxMarketValue = maxMarketValues.find((maxMarketValue) => maxMarketValue.marketId == marketId);

        const marketName = this.marketMetadata.get(marketId)?.marketName ?? '0x';
        const marketSymbol = this.marketMetadata.get(marketId)?.symbol ?? 'INVALID';

        const marketData = {
          marketId: marketId,
          marketName: marketName,
          symbol: marketSymbol,
          feedId: this.marketMetadata.get(marketId)?.feedId,
          skew: marketSummary?.skew,
          size: marketSummary?.size,
          maxOpenInterest: marketSummary?.maxOpenInterest,
          interestRate: marketSummary?.interestRate,
          currentFundingRate: marketSummary?.currentFundingRate,
          currentFundingVelocity: marketSummary?.currentFundingVelocity,
          indexPrice: marketSummary?.indexPrice,
          skewScale: fundingParam?.skewScale,
          maxFundingVelocity: fundingParam?.maxFundingVelocity,
          makerFee: orderFee?.makerFeeRatio,
          takerFee: orderFee?.takerFeeRatio,
          maxMarketValue: maxMarketValue?.maxMarketValue,
        };

        this.marketsById.set(marketId, marketData);
        this.marketsByName.set(marketName, marketData);
        this.marketsBySymbol.set(marketSymbol, marketData);
      }
    });

    return { marketsById: this.marketsById, marketsByName: this.marketsByName };
  }

  /**
   * Fetch the market summaries for an array of marketIds
   * @param marketIds Array of market ids to fetch
   * @returns Summary of market ids data fetched from the contract
   */
  public async getMarketSummaries(marketIds: number[]): Promise<MarketSummary[]> {
    // Intermediate interface to map the values from smart contract types to sdk types
    // i.e to convert bigint values to formatted values in sdk
    interface MarketSummaryResponse {
      skew: bigint;
      size: bigint;
      maxOpenInterest: bigint;
      currentFundingRate: bigint;
      currentFundingVelocity: bigint;
      indexPrice: bigint;
    }

    const oracleCalls = await this.prepareOracleCall(marketIds);
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const interestRate = await this.sdk.utils.callErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'interestRate',
      [],
      oracleCalls,
    );

    const marketSummariesInput = marketIds.map((marketId) => [marketId]);
    const marketSummariesResponse: MarketSummaryResponse[] = (await this.sdk.utils.multicallErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'getMarketSummary',
      marketSummariesInput,
      oracleCalls,
    )) as MarketSummaryResponse[];

    if (marketIds.length !== marketSummariesResponse.length) {
      console.log('Inconsistent data');
    }

    const marketSummaries: MarketSummary[] = [];
    marketSummariesResponse.forEach((market, index) => {
      const marketId = marketIds[index];

      marketSummaries.push({
        marketId: marketId,
        marketName: this.marketsById.get(marketId)?.marketName,
        feedId: this.marketsById.get(marketId)?.feedId,
        indexPrice: Number(formatEther(market.indexPrice)),
        skew: Number(formatEther(market.skew)),
        size: Number(formatEther(market.size)),
        maxOpenInterest: Number(formatEther(market.maxOpenInterest)),
        interestRate: Number(formatEther(interestRate as bigint)),
        currentFundingRate: Number(formatEther(market.currentFundingRate)),
        currentFundingVelocity: Number(formatEther(market.currentFundingVelocity)),
      });
    });
    return marketSummaries;
  }

  /**
   * Fetch the market summary for a single market, including information about
   * the market's price, open interest, funding rate, and skew.
   * Provide either the `marketId` or `marketName`.
   * @param marketId Market id to fetch the summary
   * @param marketName Name of the market to fetch summary
   * @returns Summary of market data fetched from the contract
   */
  public async getMarketSummary(
    marketId: number | undefined = undefined,
    marketName: string | undefined = undefined,
  ): Promise<MarketSummary> {
    const { resolvedMarketId, resolvedMarketName } = this.resolveMarket(marketId, marketName);

    interface MarketSummaryResponse {
      skew: bigint;
      size: bigint;
      maxOpenInterest: bigint;
      currentFundingRate: bigint;
      currentFundingVelocity: bigint;
      indexPrice: bigint;
    }

    const oracleCalls = await this.prepareOracleCall([resolvedMarketId]);
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const interestRate = await this.sdk.utils.callErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'interestRate',
      [],
      oracleCalls,
    );
    console.log('interestRate', interestRate);

    const marketSummaryResponse: MarketSummaryResponse = (await this.sdk.utils.callErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'getMarketSummary',
      [resolvedMarketId],
      oracleCalls,
    )) as MarketSummaryResponse;

    console.log('marketSummaryResponse', marketSummaryResponse);

    return {
      marketId: resolvedMarketId,
      marketName: resolvedMarketName,
      feedId: '',
      indexPrice: Number(formatEther(marketSummaryResponse.indexPrice)),
      skew: Number(formatEther(marketSummaryResponse.skew)),
      size: Number(formatEther(marketSummaryResponse.size)),
      maxOpenInterest: Number(formatEther(marketSummaryResponse.maxOpenInterest)),
      interestRate: Number(formatEther(interestRate as bigint)),
      currentFundingRate: Number(formatEther(marketSummaryResponse.currentFundingRate)),
      currentFundingVelocity: Number(formatEther(marketSummaryResponse.currentFundingVelocity)),
    } as MarketSummary;
  }

  /**
   * Fetch the settlement strategy for a market. Settlement strategies describe the
   * conditions under which an order can be settled.
   * Provide either a `marketId` or `marketName`
   * @param marketId Id of the market to get settlement strategy
   * @param marketName Name of the market to get settlement strategy
   * @returns Settlement strategy for market
   */
  public async getSettlementStrategy(
    settlementStrategyId: number,
    marketId: number | undefined = undefined,
    marketName: string | undefined = undefined,
  ): Promise<SettlementStrategy> {
    const { resolvedMarketId } = this.resolveMarket(marketId, marketName);
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    interface SettlementStrategyResponse {
      strategyType?: number;
      settlementDelay?: bigint;
      settlementWindowDuration?: bigint;
      priceVerificationContract?: string;
      feedId?: string;
      settlementReward?: bigint;
      disabled?: boolean;
      commitmentPriceDelay?: bigint;
    }

    const settlementStrategy: SettlementStrategyResponse = (await this.sdk.utils.callErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'getSettlementStrategy',
      [resolvedMarketId, settlementStrategyId],
    )) as SettlementStrategyResponse;

    return {
      marketId: resolvedMarketId,
      strategyType: settlementStrategy.strategyType,
      settlementDelay: Number(settlementStrategy.settlementDelay),
      settlementWindowDuration: Number(settlementStrategy.settlementWindowDuration),
      priceVerificationContract: settlementStrategy.priceVerificationContract,
      feedId: settlementStrategy.feedId,
      settlementReward: Number(formatEther(settlementStrategy.settlementReward ?? 0n)),
      disabled: settlementStrategy.disabled,
      commitmentPriceDelay: Number(settlementStrategy.commitmentPriceDelay),
    } as SettlementStrategy;
  }

  /**
   * Fetch the settlement strategies for an array of market ids. Settlement strategies describe the
   * conditions under which an order can be settled.
   * @param marketIds Array of marketIds to fetch settlement strategy
   * @returns Settlement strategy array for markets
   */
  public async getSettlementStrategies(marketIds: number[]): Promise<SettlementStrategy[]> {
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    interface SettlementStrategyResponse {
      strategyType?: number;
      settlementDelay?: bigint;
      settlementWindowDuration?: bigint;
      priceVerificationContract?: string;
      feedId?: string;
      settlementReward?: bigint;
      disabled?: boolean;
      commitmentPriceDelay?: bigint;
    }

    const settlementStrategies: SettlementStrategy[] = [];

    const argsList: [number, number][] = marketIds.map((marketId) => [marketId, 0]);

    const settlementStrategiesResponse: SettlementStrategyResponse[] = (await this.sdk.utils.multicallErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'getSettlementStrategy',
      argsList,
    )) as SettlementStrategyResponse[];

    settlementStrategiesResponse.forEach((strategy, index) => {
      settlementStrategies.push({
        marketId: marketIds[index],
        strategyType: strategy.strategyType,
        settlementDelay: Number(strategy.settlementDelay),
        settlementWindowDuration: Number(strategy.settlementWindowDuration),
        priceVerificationContract: strategy.priceVerificationContract,
        feedId: strategy.feedId,
        settlementReward: Number(formatEther(strategy.settlementReward ?? 0n)),
        disabled: strategy.disabled,
        commitmentPriceDelay: Number(strategy.commitmentPriceDelay),
      });
    });
    return settlementStrategies;
  }

  /**
   * Fetch funding parameters for an array of market ids.
   * @param marketIds Array of marketIds to fetch settlement strategy
   * @returns Funding Parameters array for markets
   */
  public async getFundingParameters(marketIds: number[]): Promise<FundingParameters[]> {
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    type FundingParamsResponse = [bigint, bigint];
    const fundingParams: FundingParameters[] = [];

    const fundingParamsResponse = (await this.sdk.utils.multicallErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'getFundingParameters',
      marketIds,
    )) as FundingParamsResponse[];

    fundingParamsResponse.forEach((param, index) => {
      fundingParams.push({
        marketId: marketIds[index],
        skewScale: Number(formatEther(param[0])),
        maxFundingVelocity: Number(formatEther(param[1])),
      });
    });
    return fundingParams;
  }

  /**
   * Gets the order fees of a market.
   * @param marketIds Array of market ids.
   * @return Order fees array for markets
   */
  public async getOrderFees(marketIds: number[]): Promise<OrderFees[]> {
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    type OrderFeesResponse = [bigint, bigint];
    const orderFees: OrderFees[] = [];

    const orderFeesResponse = (await this.sdk.utils.multicallErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'getOrderFees',
      marketIds,
    )) as OrderFeesResponse[];

    orderFeesResponse.forEach((param, index) => {
      orderFees.push({
        marketId: marketIds[index],
        makerFeeRatio: Number(formatEther(param[0])),
        takerFeeRatio: Number(formatEther(param[1])),
      });
    });
    return orderFees;
  }

  /**
   * Gets the max size (in value) of an array of marketIds.
   * @param marketIds Array of market ids.
   * @return Max market size in market USD value for each market
   */
  public async getMaxMarketValues(marketIds: number[]): Promise<MaxMarketValue[]> {
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const maxMarketValues: MaxMarketValue[] = [];

    const maxMarketValuesResponse = (await this.sdk.utils.multicallErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'getMaxMarketValue',
      marketIds,
    )) as bigint[];

    maxMarketValuesResponse.forEach((maxMarketValue, index) => {
      maxMarketValues.push({
        marketId: marketIds[index],
        maxMarketValue: Number(formatEther(maxMarketValue)),
      });
    });
    return maxMarketValues;
  }

  /**
   * Submit an order to the specified market. Keepers will attempt to fill the order
   * according to the settlement strategy. If ``desired_fill_price`` is provided, the order
   * will be filled at that price or better. If ``max_price_impact`` is provided, the
   * ``desired_fill_price`` is calculated from the current market price and the price impact.
   * @param size The size of the order to submit
   * @param settlementStrategyId The id of the settlement strategy to use
   * @param marketId The id of the market to submit the order to. If not provided, `marketName` must be provided
   * @param marketName The name of the market to submit the order to. If not provided, `marketId` must be provided.
   * @param accountId The id of the account to submit the order for. Defaults to `defaultAccountId`.
   * @param desiredFillPrice The max price for longs and minimum price for shorts. If not provided,
   * one will be calculated based on `maxPriceImpact`
   * @param maxPriceImpact The maximum price impact to allow when filling the order as a percentage (1.0 = 1%).
   * If not provided, it will inherit the default value from `snx.max_price_impact`
   * @param submit If ``true``, submit the transaction to the blockchain
   */
  public async commitOrder(
    size: number,
    settlementStrategyId: number = 0,
    marketId: number | undefined,
    marketName: string | undefined,
    accountId: bigint | undefined,
    desiredFillPrice: number | undefined,
    maxPriceImpact: number | undefined,
    submit: boolean = false,
  ) {
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const { resolvedMarketId } = this.resolveMarket(marketId, marketName);
    if (desiredFillPrice != undefined && maxPriceImpact != undefined) {
      throw new Error('Cannot set both desiredFillPrice and maxPriceImpact');
    }
    const isShort = size < 0 ? -1 : 1;
    const sizeInWei = parseEther(Math.abs(size).toString()) * BigInt(isShort);
    let acceptablePrice: number;

    // If desired price is provided, use the provided price, else fetch price
    if (desiredFillPrice) {
      acceptablePrice = desiredFillPrice;
    } else {
      const updatedMaxPriceImpact = maxPriceImpact ?? 1; // @todo Replace with config value
      const marketSummary = await this.getMarketSummary(resolvedMarketId);
      const priceImpact = 1 + (isShort * updatedMaxPriceImpact) / 100;
      acceptablePrice = (marketSummary.indexPrice ?? 0) * priceImpact;
    }
    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }

    const oracleCalls = await this.prepareOracleCall();
    const txArgs = [
      resolvedMarketId,
      accountId,
      sizeInWei,
      settlementStrategyId,
      convertEtherToWei(acceptablePrice),
      this.sdk.trackingCode,
      this.sdk.referrer,
    ];

    console.log('txArgs', txArgs);
    const tx = await this.sdk.utils.writeErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'commitOrder',
      [txArgs],
      oracleCalls,
    );
    if (submit) {
      console.log(
        `Committing order size ${sizeInWei} (${size}) to ${marketName} (id: ${resolvedMarketId}) for account ${accountId}`,
      );
      const txHash = await this.sdk.executeTransaction(tx);
      console.log('Transaction hash for commit order tx: ', txHash);
      return txHash;
    } else {
      return tx;
    }
  }

  /**
   *   Fetches the open order for an account. Optionally fetches the settlement strategy,
   * which can be useful for order settlement and debugging.
   * @param accountId The id of the account. If not provided, the default account is used
   * @param fetchSettlementStrategy Flag to indicate whether to fetch the settlement strategy
   */
  public async getOrder(
    accountId: bigint | undefined = undefined,
    fetchSettlementStrategy: boolean = true,
  ): Promise<OrderData> {
    interface OrderCommitmentRequestRes {
      marketId: bigint;
      accountId: bigint;
      sizeDelta: bigint;
      settlementStrategyId: bigint;
      acceptablePrice: bigint;
      trackingCode: string;
      referrer: string;
    }

    interface AsyncOrderDataRes {
      commitmentTime: bigint;
      request: OrderCommitmentRequestRes;
    }

    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }
    const orderResponse = (await this.sdk.utils.callErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'getOrder',
      [accountId],
    )) as AsyncOrderDataRes;
    const orderReq = orderResponse.request;

    const orderData: OrderData = {
      marketId: Number(orderReq.marketId),
      commitmentTime: Number(orderResponse.commitmentTime),
      accountId: orderReq.accountId,
      sizeDelta: Number(formatEther(orderReq.sizeDelta)),
      settlementStrategyId: Number(orderReq.settlementStrategyId),
      acceptablePrice: Number(orderReq.acceptablePrice),
      trackingCode: orderReq.trackingCode,
      referrer: orderReq.referrer,
    };

    if (fetchSettlementStrategy) {
      const strategy = await this.getSettlementStrategy(
        Number(orderReq.settlementStrategyId),
        Number(orderReq.marketId),
      );
      orderData.settlementStrategy = strategy;
    }
    return orderData;
  }

  /**
   * Fetch information about an account's margin requirements and balances.
   * Accounts must maintain an ``available_margin`` above the ``maintenance_margin_requirement``
   * to avoid liquidation. Accounts with ``available_margin`` below the ``initial_margin_requirement``
   * can not interact with their position unless they deposit more collateral.
   * @param accountId  The id of the account to fetch the margin info for. If not provided, the default account is used
   */
  public async getMarginInfo(accountId: bigint | undefined = undefined): Promise<CollateralData> {
    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }

    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const functionNames: string[] = [];
    const argsList: unknown[] = [];

    // 0. Get Total collateral value
    functionNames.push('totalCollateralValue');
    argsList.push([accountId]);

    // 1. Get available margin
    functionNames.push('getAvailableMargin');
    argsList.push([accountId]);

    // 2. Get withdrawable margin
    functionNames.push('getWithdrawableMargin');
    argsList.push([accountId]);

    // 3. Get required margins
    functionNames.push('getRequiredMargins');
    argsList.push([accountId]);
    const oracleCalls = await this.prepareOracleCall();

    const multicallResponse: unknown[] = await this.sdk.utils.multicallMultifunctionErc7412(
      marketProxy.address,
      marketProxy.abi,
      functionNames,
      argsList,
      oracleCalls,
    );

    const totalCollateralValue = multicallResponse.at(0) as bigint;
    const availableMargin = multicallResponse.at(1) as bigint;
    const withdrawableMargin = multicallResponse.at(2) as bigint;

    // returns (uint256 requiredInitialMargin,uint256 requiredMaintenanceMargin,uint256 maxLiquidationReward)
    const requiredMarginsResponse = multicallResponse.at(3) as bigint[];
    const requiredInitialMargin = requiredMarginsResponse.at(0) as bigint;
    const requiredMaintenanceMargin = requiredMarginsResponse.at(1) as bigint;
    const maxLiquidationReward = requiredMarginsResponse.at(2) as bigint;

    const collateralAmountsRecord: Record<number, number> = [];
    // let debt = 0;
    if (this.isMulticollateralEnabled) {
      const fNames: string[] = []; // Function names
      const aList: unknown[] = []; // Argument list

      // 0. Get account collateral ids
      fNames.push('getAccountCollateralIds');
      aList.push([accountId]);

      // 1. Get account debt
      fNames.push('debt');
      aList.push([accountId]);

      const response: unknown[] = await this.sdk.utils.multicallMultifunctionErc7412(
        marketProxy.address,
        marketProxy.abi,
        fNames,
        aList,
        oracleCalls,
      );

      // returns and array of collateral ids(uint256[] memory)
      const collateralIds = response.at(0) as bigint[];
      // debt = convertWeiToEther(response.at(1) as bigint);

      // 'debt' function is only available for markets with Multicollateral enabled
      if (collateralIds.length != 0) {
        const inputs = collateralIds.map((id) => {
          return [accountId, id];
        });
        console.log('inputs', inputs);
        const collateralAmounts = (await this.sdk.utils.multicallErc7412(
          marketProxy.address,
          marketProxy.abi,
          'getCollateralAmount',
          inputs,
          oracleCalls,
        )) as bigint[];

        collateralIds.forEach((collateralId, index) => {
          collateralAmountsRecord[Number(collateralId)] = convertWeiToEther(collateralAmounts.at(index));
        });
      }
    } else {
      collateralAmountsRecord[0] = convertWeiToEther(totalCollateralValue);
    }

    const marginInfo: CollateralData = {
      totalCollateralValue: convertWeiToEther(totalCollateralValue),
      collateralBalances: collateralAmountsRecord,
      debt: 0,
      availableMargin: convertWeiToEther(availableMargin),
      withdrawableMargin: convertWeiToEther(withdrawableMargin),
      initialMarginRequirement: convertWeiToEther(requiredInitialMargin),
      maintenanceMarginRequirement: convertWeiToEther(requiredMaintenanceMargin),
      maxLiquidationReward: convertWeiToEther(maxLiquidationReward),
    };

    console.log('marginInfo', marginInfo);
    return marginInfo;
  }

  /**
   * Move collateral in or out of a specified perps account. The ``market_id`` or ``market_name``
   * must be provided to specify the collateral type.
   * Provide either a ``market_id`` or a ``market_name``.  Note that the ``market_id`` here refers
   * to the spot market id, not the perps market id. Make sure to approve the market proxy to transfer
   * tokens of the collateral type before calling this function.
   * @param amount The amount of collateral to move. Positive values deposit collateral, negative values withdraw collateral
   * @param marketId The id of the market to move collateral for
   * @param marketName The name of the market to move collateral for.
   * @param accountId The id of the account to move collateral for. If not provided, the default account is used.
   * @param submit If ``True``, submit the transaction to the blockchain.
   */
  public async modifyCollateral(
    amount: number,
    marketId: number | undefined = undefined,
    marketName: string | undefined = undefined,
    accountId: bigint | undefined = undefined,
    submit: boolean = false,
  ) {
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const { resolvedMarketId, resolvedMarketName } = this.sdk.spot.resolveMarket(marketId, marketName);
    console.log('resolvedMarketId', resolvedMarketId);
    console.log('resolvedMarketName', resolvedMarketName);

    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }

    const tx = await this.sdk.utils.writeErc7412(marketProxy.address, marketProxy.abi, 'modifyCollateral', [
      accountId,
      resolvedMarketId,
      this.sdk.spot.formatSize(amount, resolvedMarketId),
    ]);

    if (submit) {
      const txHash = await this.sdk.executeTransaction(tx);
      console.log(`Transferring ${amount} ${resolvedMarketName} for account ${accountId}`);
      console.log('Modify collateral tx: ', txHash);
      return txHash;
    } else {
      return tx;
    }
  }

  /**
   * Fetch the balance of each collateral type for an account.
   * @param accountId The id of the account to fetch the collateral balances for. If not provided, the default account is used.
   */
  public async getCollateralBalances(_accountId: bigint | undefined = undefined) {
    // const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    // if (accountId == undefined) {
    // accountId = this.defaultAccountId;
    // }
    // @todo Add function in spot to get market ids
  }

  /**
   * Check if an `accountId` is eligible for liquidation.
   * @param accountId The id of the account to check. If not provided, the default account is used.
   * @returns
   */
  public async getCanLiquidate(accountId: bigint | undefined = undefined): Promise<boolean> {
    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }

    const oracleCalls = await this.prepareOracleCall();
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const canBeLiquidated = (await this.sdk.utils.callErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'canLiquidate',
      [accountId],
      oracleCalls,
    )) as boolean;
    console.log('canBeLiquidated', canBeLiquidated);
    return canBeLiquidated;
  }

  /**
   * Check if a batch of `accountId`'s are eligible for liquidation.
   * @param accountIds An array of account ids
   * @returns
   */
  public async getCanLiquidates(
    accountIds: bigint[] | undefined = undefined,
  ): Promise<{ accountId: bigint; canLiquidate: boolean }[]> {
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    if (accountIds == undefined) {
      if (this.defaultAccountId != undefined) {
        accountIds = this.accountIds;
      } else {
        throw new Error('Invalid account ID');
      }
    }

    const oracleCalls = await this.prepareOracleCall();

    // Format the args to the required array format
    const input = accountIds.map((accountId) => [accountId]);

    const canLiquidatesResponse = (await this.sdk.utils.multicallErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'canLiquidate',
      input,
      oracleCalls,
    )) as boolean[];

    const canLiquidates = canLiquidatesResponse.map((response, index) => {
      return {
        accountId: accountIds.at(index) ?? 0n,
        canLiquidate: response,
      };
    });

    console.log('canLiquidates', canLiquidates);
    return canLiquidates;
  }

  /**
   * Fetch the position for a specified account and market. The result includes the unrealized
   * pnl since the last interaction with this position, any accrued funding, and the position size.
   * Provide either a ``marketId`` or a ``marketName``::
   * @param marketId The id of the market to fetch the position for.
   * @param marketName The name of the market to fetch the position for.
   * @param accountId The id of the account to fetch the position for. If not provided, the default account is used.
   */
  public async getOpenPosition(
    marketId: number | undefined = undefined,
    marketName: string | undefined = undefined,
    accountId: bigint | undefined = undefined,
  ): Promise<OpenPositionData> {
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }
    const { resolvedMarketId, resolvedMarketName } = this.resolveMarket(marketId, marketName);
    const oracleCalls = await this.prepareOracleCall([resolvedMarketId]);

    // Smart contract response:
    // returns (int256 totalPnl, int256 accruedFunding, int128 positionSize, uint256 owedInterest);
    const response = (await this.sdk.utils.callErc7412(
      marketProxy.address,
      marketProxy.abi,
      'getOpenPosition',
      [accountId, resolvedMarketId],
      oracleCalls,
    )) as bigint[];

    const openPositionData: OpenPositionData = {
      marketId: resolvedMarketId,
      marketName: resolvedMarketName,
      totalPnl: convertWeiToEther(response.at(0)),
      accruedFunding: convertWeiToEther(response.at(1)),
      positionSize: convertWeiToEther(response.at(2)),
      owedInterest: convertWeiToEther(response.at(3)),
    };
    console.log('openPositionData', openPositionData);
    return openPositionData;
  }

  /**
   * Fetch positions for an array of specified markets. The result includes the unrealized
   * pnl since the last interaction with this position, any accrued funding, and the position size.
   * Provide either an array of ``marketIds`` or a ``marketNames``::
   * @param marketIds Array of market ids to fetch the position for.
   * @param marketNames Array of market names to fetch the position for.
   * @param accountId The id of the account to fetch the position for. If not provided, the default account is used.
   */
  public async getOpenPositions(
    marketIds: number[] | undefined = undefined,
    marketNames: string[] | undefined = undefined,
    accountId: bigint | undefined = undefined,
  ): Promise<OpenPositionData[]> {
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }

    // If market ids and market names both are undefined, then fetch all markets
    if (marketIds == undefined && marketNames == undefined) {
      marketIds = Array.from(this.marketsById.keys());
      marketNames = Array.from(this.marketsByName.keys());
    } else if (marketNames != undefined && marketIds == undefined) {
      marketIds = marketNames.map((marketName) => {
        return this.resolveMarket(undefined, marketName).resolvedMarketId;
      });
    }
    const oracleCalls = await this.prepareOracleCall(marketIds);

    const inputs = marketIds?.map((marketId) => {
      return [accountId, marketId];
    }) as unknown[];

    // Smart contract response:
    // returns (int256 totalPnl, int256 accruedFunding, int128 positionSize, uint256 owedInterest);
    const response = (await this.sdk.utils.multicallErc7412(
      marketProxy.address,
      marketProxy.abi,
      'getOpenPosition',
      inputs,
      oracleCalls,
    )) as bigint[][];

    const openPositionsData: OpenPositionData[] = [];
    response.forEach((positionData, idx) => {
      const marketId = marketIds?.at(idx) ?? 0;
      const positionSize = convertWeiToEther(positionData.at(2));
      if (Math.abs(positionSize) > 0) {
        openPositionsData.push({
          marketId: marketId,
          marketName: this.marketsById.get(marketId)?.marketName ?? 'Unresolved market',
          totalPnl: convertWeiToEther(positionData.at(0)),
          accruedFunding: convertWeiToEther(positionData.at(1)),
          positionSize: positionSize,
          owedInterest: convertWeiToEther(positionData.at(3)),
        });
      }
    });
    return openPositionsData;
  }

  /**
   * Get a quote for the size of an order in a specified market. The quote includes the provided price
   * and the fill price of the order after price impact. If a price is not provided, a price will be fetched
   * from Pyth. Provide either a ``marketId`` or ``marketName``.
   * @param size The size of the order to quote.
   * @param price The price to quote the order at. If not provided, the current market price is used
   * @param marketId The id of the market to quote the order for
   * @param marketName The name of the market to quote the order for
   * @param accountId The id of the account to quote the order for. If not provided, the default account is used
   * @param settlementStrategyId The id of the settlement strategy to use for the settlement reward calculation
   * @param includeRequiredMargin If ``true``, include the required margin for the account in the quote.
   */
  public async getQuote(
    size: number,
    price?: number,
    marketId: number | undefined = undefined,
    marketName: string | undefined = undefined,
    accountId: bigint | undefined = undefined,
    settlementStrategyId: number = 0,
    includeRequiredMargin: boolean = true,
  ): Promise<OrderQuote> {
    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }

    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    const { resolvedMarketId } = this.resolveMarket(marketId, marketName);

    const feedId = this.marketsById.get(resolvedMarketId)?.feedId;
    if (feedId == undefined) {
      throw new Error('Invalid feed id received from market data');
    }

    const oracleCalls = await this.prepareOracleCall([resolvedMarketId]);

    if (price == undefined) {
      price = await this.sdk.pyth.getFormattedPrice(feedId as Hex);
      console.log('Formatted price:', price);
    }

    // Smart contract call returns (uint256 orderFees, uint256 fillPrice)
    const orderFeesWithPriceResponse = (await this.sdk.utils.callErc7412(
      marketProxy.address,
      marketProxy.abi,
      'computeOrderFeesWithPrice',
      [resolvedMarketId, convertEtherToWei(size), convertEtherToWei(price)],
      oracleCalls,
    )) as [bigint, bigint];

    const settlementRewardCost = (await this.sdk.utils.callErc7412(
      marketProxy.address,
      marketProxy.abi,
      'getSettlementRewardCost',
      [resolvedMarketId, settlementStrategyId],
      oracleCalls,
    )) as bigint;

    const orderQuote: OrderQuote = {
      orderSize: size,
      indexPrice: price,
      orderFees: convertWeiToEther(orderFeesWithPriceResponse[0]),
      settlementRewardCost: convertWeiToEther(settlementRewardCost),
      fillPrice: convertWeiToEther(orderFeesWithPriceResponse[1]),
    };

    if (includeRequiredMargin && accountId) {
      const requiredMargin = (await this.sdk.utils.callErc7412(
        marketProxy.address,
        marketProxy.abi,
        'requiredMarginForOrderWithPrice',
        [accountId, resolvedMarketId, convertEtherToWei(size), convertEtherToWei(price)],
        oracleCalls,
      )) as bigint;

      orderQuote.requiredMargin = convertWeiToEther(requiredMargin);
    }
    return orderQuote;
  }

  // @todo Function `debt` not found for ABI
  /**
   * Returns the debt of the account id
   * @param accountId The id of the account to get the debt for. If not provided, the default account is used.
   * @returns debt Account debt in ether
   */
  public async getDebt(accountId: bigint | undefined = undefined): Promise<number> {
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }

    const debt = (await this.sdk.utils.callErc7412(marketProxy.address, marketProxy.abi, 'debt', [
      accountId,
    ])) as bigint;
    console.log('Account Debt: ', debt);
    return convertWeiToEther(debt);
  }

  // @todo Function `payDebt` not found for ABI
  /**
   * Pay the debt of a perps account. If no amount is provided, the full debt
   * of the account is repaid. Make sure to approve the proxy to transfer sUSD before
   * calling this function.
   * @param amount The amount of debt to repay. If not provided, the full debt is repaid.
   * @param accountId The id of the account to repay the debt for. If not provided, the default account is used.
   * @param submit If ``true``, submit the transaction to the blockchain. If not provided, transaction object is returned
   */
  public async payDebt(
    amount: number | undefined = undefined,
    accountId: bigint | undefined = undefined,
    submit: boolean = false,
  ) {
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }

    if (amount == undefined) {
      // amount = await this.getDebt(accountId);
      amount = 0;
    }
    const tx = await this.sdk.utils.writeErc7412(marketProxy.address, marketProxy.abi, 'payDebt', [
      accountId,
      convertEtherToWei(amount),
    ]);

    if (submit) {
      console.log(`Repaying debt of ${amount} for account ${accountId}`);
      const txHash = await this.sdk.executeTransaction(tx);
      console.log('Repay debt transaction: ', txHash);
      return txHash;
    } else {
      return tx;
    }
  }

  /**
   * Submit a liquidation for an account, or static call the liquidation function to fetch
   * the liquidation reward. The static call is important for accounts which have been
   * partially liquidated. Due to the throughput limit on liquidated value, the static call
   * returning a nonzero value means more value can be liquidated (and rewards collected).
   * This function can not be called if ``submit`` and ``staticCall`` are true.
   * @param accountId The id of the account to liquidate. If not provided, the default account is used.
   * @param submit If ``true``, submit the transaction to the blockchain.
   * @param staticCall If ``true``, static call the liquidation function to fetch the liquidation reward.
   */
  public async liquidate(
    accountId: bigint | undefined = undefined,
    submit: boolean = false,
    staticCall: boolean = false,
  ) {
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }

    if (submit && staticCall) {
      throw new Error('Cannot submit and use static call in the same transaction');
    }

    if (staticCall) {
      const liquidationReward = (await this.sdk.utils.callErc7412(marketProxy.address, marketProxy.abi, 'liquidate', [
        accountId,
      ])) as bigint;
      return convertWeiToEther(liquidationReward);
    } else {
      const tx = await this.sdk.utils.writeErc7412(marketProxy.address, marketProxy.abi, 'liquidate', [accountId]);
      if (submit) {
        console.log('Liquidating account :', accountId);
        const txHash = await this.sdk.executeTransaction(tx);
        console.log('Liquidate transaction: ', txHash);
        return txHash;
      } else {
        return tx;
      }
    }
  }

  /**
   * Settles an order using ERC7412 by handling ``OracleDataRequired`` errors and forming a multicall.
   * If the order is not yet ready to be settled, this function will wait until the settlement time.
   * If the transaction fails, this function will retry until the max number of tries is reached with a
   * configurable delay.
   * @param accountId The id of the account to settle. If not provided, the default account is used.
   * @param submit If ``true``, submit the transaction to the blockchain.
   * @param maxTxTries The max number of tries to submit the transaction
   * @param txDelay The delay in seconds between transaction submissions.
   */
  public async settleOrder(
    accountId: bigint | undefined = undefined,
    submit: boolean = false,
    maxTxTries: number = 3,
    txDelay: number = 2,
  ) {
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }

    const order = await this.getOrder(accountId);
    const settlementStrategy = order.settlementStrategy;
    const settlementTime = order.commitmentTime + (settlementStrategy?.settlementDelay ?? 0);
    const expirationTime = order.commitmentTime + (settlementStrategy?.settlementWindowDuration ?? 0);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    if (order.sizeDelta == 0) {
      throw new Error(`Order is already settled for account ${accountId}`);
    } else if (settlementTime > currentTimestamp) {
      const duration = settlementTime - currentTimestamp;
      console.log(`Waiting ${duration} seconds to settle order`);
      await sleep(duration);
    } else if (expirationTime < currentTimestamp) {
      throw new Error(`Order has expired for account ${accountId}`);
    } else {
      console.log('Order is ready to be settled');
    }

    let totalTries = 0;
    let tx;
    while (totalTries < maxTxTries) {
      try {
        tx = await this.sdk.utils.writeErc7412(marketProxy.address, marketProxy.abi, 'settleOrder', [accountId]);
      } catch (error) {
        console.log('Settle order error: ', error);
        totalTries += 1;
        sleep(txDelay);
        continue;
      }

      if (submit) {
        console.log(`Settling order for account ${accountId}`);
        const txHash = await this.sdk.executeTransaction(tx);
        console.log('Settle txHash: ', txHash);

        const updatedOrder = await this.getOrder(accountId);
        if (updatedOrder.sizeDelta == 0) {
          console.log('Order settlement successful for account ', accountId);
          return txHash;
        }

        // If order settlement failed, retry after a delay
        totalTries += 1;
        if (totalTries > maxTxTries) {
          throw new Error('Failed to settle order');
        } else {
          console.log(`Failed to settle order, waiting ${txDelay} seconds and retrying`);
          sleep(txDelay);
        }
      } else {
        return tx;
      }
    }
  }

  /**
   * The function is used to create an isolated order (position) for a user. The isolated order creation
   * process involves 3 steps: new account creation, collateral deposit and order creation (commitOrder)
   * The function returns the tx hash and new account id when `submit` is true, else returns the final
   * encoded transaction object
   * @param collateralAmount The amount of collateral to be deposited to new account
   * @param collateralMarketId Market ID of the collateral token
   * @param size Formatted Order size
   * @param marketId Id of the market for which order is to be created
   * @param marketName Name of the market for which order is to be created
   * @param settlementStrategyId Strategy ID for settlement
   * @param accountId Preferred account ID. If not provided, a random account id is generated an used
   * @param desiredFillPrice The max price for longs and minimum price for shorts. If not provided,
   * one will be calculated based on `maxPriceImpact`
   * @param maxPriceImpact The maximum price impact to allow when filling the order as a percentage (1.0 = 1%).
   * @param submit Execute the order if true, else return the transaction object
   * @returns The tx hash and isolated order account id when `submit` is true, else returns the final
   * encoded transaction object
   */
  public async createIsolatedAccountOrder(
    collateralAmount: number,
    collateralMarketId: number,
    size: number,
    marketId?: number,
    marketName?: string,
    settlementStrategyId: number = 0,
    accountId?: bigint,
    desiredFillPrice?: number,
    maxPriceImpact?: number,
    submit: boolean = false,
  ): Promise<{ txHash: string; accountId: bigint } | CallParameters> {
    if (accountId == undefined) {
      accountId = generateRandomAccountId();
    }
    const { resolvedMarketId } = this.resolveMarket(marketId, marketName);

    // 1. Create Account
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    const createAccountCall: Call3Value = {
      target: marketProxy.address,
      callData: encodeFunctionData({
        abi: marketProxy.abi,
        functionName: 'createAccount',
        args: [accountId],
      }),
      value: 0n,
      requireSuccess: true,
    };

    // 2. Add Collateral
    const { resolvedMarketId: resolvedCollateralId } = this.sdk.spot.resolveMarket(collateralMarketId);
    const collateralAmountInWei = this.sdk.spot.formatSize(collateralAmount, resolvedCollateralId);
    const modifyCollateralCall: Call3Value = {
      target: marketProxy.address,
      callData: encodeFunctionData({
        abi: marketProxy.abi,
        functionName: 'modifyCollateral',
        args: [accountId, resolvedCollateralId, collateralAmountInWei],
      }),
      value: 0n,
      requireSuccess: true,
    };

    // 3. Commit Order
    if (desiredFillPrice != undefined && maxPriceImpact != undefined) {
      throw new Error('Cannot set both desiredFillPrice and maxPriceImpact');
    }
    const isShort = size < 0 ? -1 : 1;
    const sizeInWei = parseEther(Math.abs(size).toString()) * BigInt(isShort);
    let acceptablePrice: number;

    if (desiredFillPrice) {
      // If desired price is provided, use the provided price, else fetch price
      acceptablePrice = desiredFillPrice;
    } else {
      const updatedMaxPriceImpact = maxPriceImpact ?? 1; // @todo Replace with config value
      const marketSummary = await this.getMarketSummary(resolvedMarketId);
      const priceImpact = 1 + (isShort * updatedMaxPriceImpact) / 100;
      acceptablePrice = (marketSummary.indexPrice ?? 0) * priceImpact;
    }

    const oracleCalls = await this.prepareOracleCall();
    const txArgs = [
      resolvedMarketId,
      accountId,
      sizeInWei,
      settlementStrategyId,
      convertEtherToWei(acceptablePrice),
      this.sdk.trackingCode,
      this.sdk.referrer,
    ];

    const commitOrderCall: Call3Value = {
      target: marketProxy.address,
      callData: encodeFunctionData({
        abi: marketProxy.abi,
        functionName: 'commitOrder',
        args: [txArgs],
      }),
      value: 0n,
      requireSuccess: true,
    };

    const callsArray: Call3Value[] = oracleCalls.concat([createAccountCall, modifyCollateralCall, commitOrderCall]);
    const finalTx = await this.sdk.utils.writeErc7412(undefined, undefined, undefined, undefined, callsArray);
    if (!submit) return finalTx;

    const txHash = await this.sdk.executeTransaction(finalTx);
    console.log('Transaction hash: ', txHash);
    return { txHash, accountId };
  }
}
