import { CallParameters, formatEther, parseEther, parseUnits } from 'viem';
import { SynthetixSdk } from '..';
import { ZERO_ADDRESS } from '../constants';
import {
  CollateralData,
  FundingParameters,
  MarketData,
  MarketMetadata,
  MarketSummary,
  MaxMarketValue,
  OrderData,
  OrderFees,
  SettlementStrategy,
} from './interface';
import { convertWeiToEther } from '../utils';

/**
 * Class for interacting with Synthetix V3 core contracts
 * @remarks
 *
 */
export class Perps {
  sdk: SynthetixSdk;
  defaultAccountId?: bigint;
  accountIds: bigint[];

  // Markets data
  marketMetadata: Map<number, MarketMetadata>;
  marketsById: Map<number, MarketData>;
  marketsByName: Map<string, MarketData>;

  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
    this.accountIds = [];

    // Initialize empty market data
    this.marketsById = new Map<number, MarketData>();
    this.marketsByName = new Map<string, MarketData>();
    this.marketMetadata = new Map<number, MarketMetadata>();
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
      resolvedMarketName: (resolvedMarketName ?? marketName) as string,
    };
  }

  /**
   * Fetch a list of perps ``account_id`` owned by an address. Perps accounts
   * are minted as an NFT to the owner's address. The ``account_id`` is the
   * token id of the NFTs held by the address.
   * @param address: The address to get accounts for. Uses connected address if not provided.
   * @param defaultAccountId: The default account ID to set after fetching.
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
    const accountIds = await this.sdk.utils.multicallErc7412(
      accountProxy.address,
      accountProxy.abi,
      'tokenOfOwnerByIndex',
      argsList,
    );

    console.log('accountIds', accountIds);
    this.sdk.accountIds = accountIds as bigint[];
    if (defaultAccountId) {
      this.defaultAccountId = defaultAccountId;
    } else if (this.sdk.accountIds.length > 0) {
      this.defaultAccountId = this.sdk.accountIds[0];
    }
    console.log('Using default account id as ', this.defaultAccountId);
    this.accountIds = accountIds as bigint[];
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
    const marketIds: number[] = (await perpsMarketProxy.read.getMarkets([])) as number[];
    console.log('marketIds', marketIds);

    // Response type from metadata smart contract call
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
      const settlementStrategy = settlementStrategies.find((strategy) => strategy.marketName == marketName);
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
      const marketSummary = marketSummaries.find((summary) => summary.marketId == marketId);
      const fundingParam = fundingParameters.find((fundingParam) => fundingParam.marketId == marketId);
      const orderFee = orderFees.find((orderFee) => orderFee.marketId == marketId);
      const maxMarketValue = maxMarketValues.find((maxMarketValue) => maxMarketValue.marketId == marketId);

      const marketName = this.marketMetadata.get(marketId)?.marketName ?? '0x';
      const marketData = {
        marketId: marketId,
        marketName: marketName,
        symbol: this.marketMetadata.get(marketId)?.symbol,
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

    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const interestRate = await this.sdk.utils.callErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'interestRate',
      [],
    );

    const marketSummariesInput = marketIds.map((marketId) => [marketId]);
    const marketSummariesResponse: MarketSummaryResponse[] = (await this.sdk.utils.multicallErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'getMarketSummary',
      marketSummariesInput,
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

    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const interestRate = await this.sdk.utils.callErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'interestRate',
      [],
    );
    console.log('interestRate', interestRate);

    const marketSummaryResponse: MarketSummaryResponse = (await this.sdk.utils.callErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'getMarketSummary',
      [resolvedMarketId],
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

  public async canLiquidate(accountId: bigint | undefined = undefined): Promise<boolean> {
    if (accountId == undefined) {
      console.log('Using default account ID value :', this.defaultAccountId);
      accountId = this.defaultAccountId;
    }

    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const canBeLiquidated = await this.sdk.utils.callErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'canLiquidate',
      [accountId],
    );
    console.log('canBeLiquidated', canBeLiquidated);
    return canBeLiquidated as boolean;
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
    const { resolvedMarketId, resolvedMarketName } = this.resolveMarket(marketId, marketName);
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
      marketName: resolvedMarketName,
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
        marketName: this.marketMetadata.get(marketIds[index])?.symbol,
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
   * @param desiredFillPrice The max price for longs and minimum price for shorts. If not provided, one will be calculated based on `maxPriceImpact`
   * @param maxPriceImpact The maximum price impact to allow when filling the order as a percentage (1.0 = 1%). If not provided, it will inherit the default value from `snx.max_price_impact`
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

    const txArgs = {
      marketId: resolvedMarketId,
      accountId: accountId,
      sizeDelta: sizeInWei,
      settlementStrategyId: settlementStrategyId,
      acceptablePrice: parseEther(acceptablePrice.toString()),
      trackingCode: this.sdk.trackingCode,
      referrer: this.sdk.referrer,
    };

    console.log('txArgs', txArgs);
    const tx = await this.sdk.utils.writeErc7412(perpsMarketProxy.address, perpsMarketProxy.abi, 'commitOrder', [
      txArgs,
    ]);
    if (submit) {
      console.log(
        `Committing order size ${sizeInWei} (${size}) to ${marketName} (id: ${resolvedMarketId}) for account ${accountId}`,
      );
      const txHash = this.sdk.executeTransaction(tx);
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

    // 4. Get account collateral ids
    functionNames.push('getAccountCollateralIds');
    argsList.push([accountId]);

    // // 5. Get account debt
    // functionNames.push('debt');
    // argsList.push([accountId]);

    const multicallResponse: unknown[] = await this.sdk.utils.multicallMultifunctionErc7412(
      marketProxy.address,
      marketProxy.abi,
      functionNames,
      argsList,
    );

    const totalCollateralValue = multicallResponse.at(0) as bigint;
    const availableMargin = multicallResponse.at(1) as bigint;
    const withdrawableMargin = multicallResponse.at(2) as bigint;

    // returns (uint256 requiredInitialMargin,uint256 requiredMaintenanceMargin,uint256 maxLiquidationReward)
    const requiredMarginsResponse = multicallResponse.at(3) as bigint[];
    const requiredInitialMargin = requiredMarginsResponse.at(0) as bigint;
    const requiredMaintenanceMargin = requiredMarginsResponse.at(1) as bigint;
    const maxLiquidationReward = requiredMarginsResponse.at(2) as bigint;

    // returns and array of collateral ids(uint256[] memory)
    const collateralIds = multicallResponse.at(4) as bigint[];

    // @todo Check why 'debt' function doesn't exist on ABI. Get debt

    let collateralAmountsRecord: Record<number, number> = [];

    if (collateralIds.length != 0) {
      const inputs = collateralIds.map((id) => {
        return [accountId, id];
      });
      console.log(inputs);
      const collateralAmounts = (await this.sdk.utils.multicallErc7412(
        marketProxy.address,
        marketProxy.abi,
        'getCollateralAmount',
        inputs,
      )) as bigint[];

      collateralIds.map((collateralId, index) => {
        return [collateralId, formatEther(collateralAmounts.at(index) ?? 0n)];
      });
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

    const { resolvedMarketId, resolvedMarketName } = this.resolveMarket(marketId, marketName);
    console.log('resolvedMarketId', resolvedMarketId);
    console.log('resolvedMarketName', resolvedMarketName);

    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }

    const tx = await this.sdk.utils.writeErc7412(marketProxy.address, marketProxy.abi, 'modifyCollateral', [
      accountId,
      resolvedMarketId,
      parseUnits(amount.toString(), 6),
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
}
