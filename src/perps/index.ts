import { Address, encodeFunctionData, formatEther, getAbiItem, Hex } from 'viem';
import { SynthetixSdk } from '..';
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
  PayDebtAndWithdraw,
  SettlementStrategy,
} from './interface';
import { convertEtherToWei, convertWeiToEther, generateRandomAccountId, sleep } from '../utils';
import { Call3Value } from '../interface/contractTypes';
import { MarketIdOrName, OverrideParamsRead, OverrideParamsWrite, WriteReturnType } from '../interface/commonTypes';
import {
  AccountPermissions,
  CommitOrder,
  CreateIsolateOrder,
  GetPermissions,
  GetPerpsQuote,
  GrantPermission,
  ModifyCollateral,
  PayDebt,
} from '../interface/Perps';
import { PerpsRepository } from '../interface/Perps/repositories';
import { Market } from '../utils/market';
import { PERPS_PERMISSIONS } from '../constants/perpsPermissions';
import { MetadataResponse, PythPriceId } from '../interface/Markets';

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
export class Perps extends Market<MarketData> implements PerpsRepository {
  sdk: SynthetixSdk;
  defaultAccountId?: bigint;
  accountIds: bigint[];
  marketMetadata: Map<number, MarketMetadata>;

  // Markets data

  isErc7412Enabled: boolean = true;
  // Set multicollateral to false by default
  isMulticollateralEnabled: boolean = false;
  disabledMarkets: number[] = [];
  isInitialized: boolean = false;

  constructor(synthetixSdk: SynthetixSdk) {
    super(synthetixSdk);
    this.sdk = synthetixSdk;
    this.accountIds = [];

    this.marketMetadata = new Map<number, MarketMetadata>();
  }

  // === READ CALLS ===

  async initPerps() {
    if (this.isInitialized) return;
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
    this.isInitialized = true;
  }

  /**
   * Fetch a list of perps ``account_id`` owned by an address. Perps accounts
   * are minted as an NFT to the owner's address. The ``account_id`` is the
   * token id of the NFTs held by the address.
   * @param {string} address The address to get accounts for. Uses connected address if not provided.
   * @param {bigint} defaultAccountId The default account ID to set after fetching.
   * @returns A list of account IDs owned by the address
   */

  public async getAccountIds(accountAddress = this.sdk.accountAddress, defaultAccountId?: bigint): Promise<bigint[]> {
    if (!accountAddress) throw new Error('Invalid address');

    const accountProxy = await this.sdk.contracts.getPerpsAccountProxyInstance();
    const balance = await accountProxy.read.balanceOf([accountAddress]);

    const argsList = [];

    for (let index = 0; index < Number(balance); index++) {
      argsList.push([accountAddress, index]);
    }
    const accountIds = (await this.sdk.utils.multicallErc7412({
      contractAddress: accountProxy.address,
      abi: accountProxy.abi,
      functionName: 'tokenOfOwnerByIndex',
      args: argsList,
    })) as unknown[];

    if (accountIds == undefined) return [];
    // Set Perps account ids
    this.accountIds = accountIds as bigint[];

    if (defaultAccountId) {
      this.defaultAccountId = defaultAccountId;
    } else if (this.accountIds.length > 0) {
      this.defaultAccountId = this.accountIds[0] as bigint;
      console.log('Using default account id as ', this.defaultAccountId);
    }
    return accountIds as bigint[];
  }

  public async getMarkets(): Promise<MarketData[]> {
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    const marketIdResponse: bigint[] = (await perpsMarketProxy.read.getMarkets()) as bigint[];

    const marketMetadataResponse = (await this.sdk.utils.multicallErc7412({
      contractAddress: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,
      functionName: 'metadata',
      args: marketIdResponse as unknown[],
    })) as MetadataResponse[];

    const marketIds = marketIdResponse.map((id) => Number(id));

    const settlementStrategies = await this.getSettlementStrategies(marketIds);
    const { marketMetadatas, pythPriceIds } = marketMetadataResponse.reduce(
      (acc, market, index) => {
        const [name, symbol] = market;
        const strategy = settlementStrategies.find((strategy) => strategy.marketId == marketIds[index]);

        acc.pythPriceIds.push({
          symbol,
          feedId: strategy?.feedId ?? '0x',
        });

        acc.marketMetadatas.push({
          marketName: name,
          symbol,
          feedId: strategy?.feedId ?? '0x',
        });

        return acc;
      },
      {
        pythPriceIds: [],
        marketMetadatas: [],
      } as { pythPriceIds: PythPriceId[]; marketMetadatas: MarketMetadata[] },
    );

    this.sdk.pyth.updatePriceFeedIds(pythPriceIds);

    const [marketSummaries, fundingParameters, orderFees, maxMarketValues] = await Promise.all([
      this.getMarketSummaries(marketIds),
      this.getFundingParameters(marketIds),
      this.getOrderFees(marketIds),
      this.getMaxMarketValues(marketIds),
    ]);

    const marketId = Number(marketIds.at(0) || 0);
    const marketSummary = marketSummaries.find((summary) => summary.marketId == marketId);
    const fundingParam = fundingParameters.find((fundingParam) => fundingParam.marketId == marketId);
    const orderFee = orderFees.find((orderFee) => orderFee.marketId == marketId);
    const maxMarketValue = maxMarketValues.find((maxMarketValue) => maxMarketValue.marketId == marketId);

    const datas = marketMetadatas.map((marketMetadata) => {
      const result = {
        marketId,
        marketName: marketMetadata.marketName,
        symbol: marketMetadata.symbol,
        feedId: marketMetadata.feedId,
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

      this.marketMetadata.set(marketId, marketMetadata);
      this.marketsById.set(marketId, result);
      this.marketsByName.set(marketMetadata.marketName, result);
      this.marketsBySymbol.set(marketMetadata.symbol, result);

      return result;
    });

    return datas;
  }

  public async getMarket(marketIdOrName: MarketIdOrName): Promise<MarketData> {
    const market = this.marketsById.get(Number(marketIdOrName)) ?? this.marketsByName.get(marketIdOrName as string);
    if (market) return market;

    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    const marketIdResponse: bigint[] = (await perpsMarketProxy.read.getMarkets()) as bigint[];

    const marketMetadataResponse = (await this.sdk.utils.multicallErc7412({
      contractAddress: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,
      functionName: 'metadata',
      args: marketIdResponse as unknown[],
    })) as MetadataResponse[];

    const marketIds = marketIdResponse
      .map((id) => Number(id))
      .filter((id, index) => {
        const name = marketMetadataResponse[index][0];
        const symbol = marketMetadataResponse[index][1];

        return name == marketIdOrName || symbol == marketIdOrName || id == marketIdOrName;
      });

    const settlementStrategies = await this.getSettlementStrategies(marketIds);
    const { marketMetadata, pythPriceIds } = marketMetadataResponse.reduce(
      (acc, market, index) => {
        const [name, symbol] = market;
        const strategy = settlementStrategies.find((strategy) => strategy.marketId == marketIds[index]);

        acc.pythPriceIds = {
          symbol,
          feedId: strategy?.feedId ?? '0x',
        };
        acc.marketMetadata = {
          marketName: name,
          symbol,
          feedId: strategy?.feedId ?? '0x',
        };

        return acc;
      },
      {
        pythPriceIds: {},
        marketMetadata: {},
      } as { pythPriceIds: PythPriceId; marketMetadata: MarketMetadata },
    );

    this.sdk.pyth.updatePriceFeedIds([pythPriceIds]);

    const [marketSummaries, fundingParameters, orderFees, maxMarketValues] = await Promise.all([
      this.getMarketSummaries(marketIds),
      this.getFundingParameters(marketIds),
      this.getOrderFees(marketIds),
      this.getMaxMarketValues(marketIds),
    ]);

    const marketId = Number(marketIds.at(0) || 0);
    const marketSummary = marketSummaries.find((summary) => summary.marketId == marketId);
    const fundingParam = fundingParameters.find((fundingParam) => fundingParam.marketId == marketId);
    const orderFee = orderFees.find((orderFee) => orderFee.marketId == marketId);
    const maxMarketValue = maxMarketValues.find((maxMarketValue) => maxMarketValue.marketId == marketId);

    const result = {
      marketId,
      marketName: marketMetadata.marketName,
      symbol: marketMetadata.symbol,
      feedId: marketMetadata.feedId,
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

    this.marketMetadata.set(marketId, marketMetadata);

    this.marketsById.set(marketId, result);
    this.marketsByName.set(marketMetadata.marketName, result);
    this.marketsBySymbol.set(marketMetadata.symbol, result);

    return result;
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

    const interestRate = await this.sdk.utils.callErc7412({
      contractAddress: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,
      functionName: 'interestRate',
      args: [],
    });

    const marketSummariesInput = marketIds.map((marketId) => [marketId]);
    const marketSummariesResponse: MarketSummaryResponse[] = (await this.sdk.utils.multicallErc7412({
      contractAddress: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,
      functionName: 'getMarketSummary',
      args: marketSummariesInput,
    })) as MarketSummaryResponse[];

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
   * @name getMarketSummary
   * @description Fetches the summary of a given market. This includes information like skew, size, max open interest, current funding rate, and more.
   * @param {string|number} marketIdOrName - The identifier or name of the market to fetch the summary for.
   * @returns {MarketSummary} - An object containing the summary data for the specified market.
   */

  public async getMarketSummary(marketIdOrName: MarketIdOrName): Promise<MarketSummary> {
    const { resolvedMarketId, resolvedMarketName } = await this.resolveMarket(marketIdOrName);

    interface MarketSummaryResponse {
      skew: bigint;
      size: bigint;
      maxOpenInterest: bigint;
      currentFundingRate: bigint;
      currentFundingVelocity: bigint;
      indexPrice: bigint;
    }

    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const interestRate = await this.sdk.utils.callErc7412({
      contractAddress: perpsMarketProxy.address,

      abi: perpsMarketProxy.abi,
      functionName: 'interestRate',
      args: [],
    });

    const marketSummaryResponse: MarketSummaryResponse = (await this.sdk.utils.callErc7412({
      contractAddress: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,
      functionName: 'getMarketSummary',
      args: [resolvedMarketId],
    })) as MarketSummaryResponse;

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
   * @name getSettlementStrategy
   * @description This function retrieves the settlement strategy for a given market by its ID and either Market ID or Name.
   * @param {number} settlementStrategyId - The ID of the settlement strategy to retrieve.
   * @param {MarketIdOrName} marketIdOrName - The unique identifier (ID or Name) of the market this settlement strategy belongs to.
   * @returns {SettlementStrategy} - An object containing the details of the retrieved settlement strategy, including its strategy type, delay times, associated contract addresses, feed ID, settlement reward, and whether it is disabled or not.
   */
  public async getSettlementStrategy(
    settlementStrategyId: number,
    marketIdOrName: MarketIdOrName,
  ): Promise<SettlementStrategy> {
    const { resolvedMarketId } = await this.resolveMarket(marketIdOrName);
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

    const settlementStrategy: SettlementStrategyResponse = (await this.sdk.utils.callErc7412({
      contractAddress: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,

      functionName: 'getSettlementStrategy',
      args: [resolvedMarketId, settlementStrategyId],
    })) as SettlementStrategyResponse;

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

    const settlementStrategiesResponse: SettlementStrategyResponse[] = (await this.sdk.utils.multicallErc7412({
      contractAddress: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,
      functionName: 'getSettlementStrategy',
      args: argsList,
    })) as SettlementStrategyResponse[];

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

    const fundingParamsResponse = (await this.sdk.utils.multicallErc7412({
      contractAddress: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,
      functionName: 'getFundingParameters',
      args: marketIds,
    })) as FundingParamsResponse[];

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

    const orderFeesResponse = (await this.sdk.utils.multicallErc7412({
      contractAddress: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,
      functionName: 'getOrderFees',
      args: marketIds,
    })) as OrderFeesResponse[];

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

    const maxMarketValuesResponse = (await this.sdk.utils.multicallErc7412({
      contractAddress: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,
      functionName: 'getMaxMarketValue',
      args: marketIds,
    })) as bigint[];

    maxMarketValuesResponse.forEach((maxMarketValue, index) => {
      maxMarketValues.push({
        marketId: marketIds[index],
        maxMarketValue: Number(formatEther(maxMarketValue)),
      });
    });
    return maxMarketValues;
  }

  /**
   *   Fetches the open order for an account. Optionally fetches the settlement strategy,
   * which can be useful for order settlement and debugging.
   * @param {bigint} accountId The id of the account. If not provided, the default account is used
   * @param {boolean} fetchSettlementStrategy Flag to indicate whether to fetch the settlement strategy
   * @returns {OrderData} The order data for the account
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
    const orderResponse = (await this.sdk.utils.callErc7412({
      contractAddress: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,
      functionName: 'getOrder',
      args: [accountId],
    })) as AsyncOrderDataRes;
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
   * @param {bigint} accountId  The id of the account to fetch the margin info for. If not provided, the default account is used
   * @returns {CollateralData} The margin information for the account
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

    const multicallResponse: unknown[] = await this.sdk.utils.multicallMultifunctionErc7412({
      contractAddress: marketProxy.address,
      abi: marketProxy.abi,
      functionNames,
      args: argsList,
    });

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

      const response: unknown[] = await this.sdk.utils.multicallMultifunctionErc7412({
        contractAddress: marketProxy.address,
        abi: marketProxy.abi,
        functionNames: fNames,
        args: aList,
      });

      // returns and array of collateral ids(uint256[] memory)
      const collateralIds = response.at(0) as bigint[];
      // debt = convertWeiToEther(response.at(1) as bigint);

      // 'debt' function is only available for markets with Multicollateral enabled
      if (collateralIds.length != 0) {
        const inputs = collateralIds.map((id) => {
          return [accountId, id];
        });
        console.log('inputs', inputs);
        const collateralAmounts = (await this.sdk.utils.multicallErc7412({
          contractAddress: marketProxy.address,
          abi: marketProxy.abi,
          functionName: 'getCollateralAmount',
          args: inputs,
        })) as bigint[];

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
   * @name _buildModifyCollateral
   * @description This function builds the call to modify collateral in a perp market. It takes an amount, market ID or name, account ID, and collateral ID as parameters and returns an array of Call3Value objects.
   * @param {string | number} data.amount - The amount of the underlying asset to modify collateral for.
   * @param {string | number} data.marketIdOrName - The ID or name of the perp market where the collateral will be modified.
   * @param {string} data.accountId - The ID of the account whose collateral is being modified.
   * @param {string} data.collateralId - The ID of the collateral being modified.
   * @returns {Call3Value[]} - An array of Call3Value objects containing the target contract address, call data, value, requireSuccess flag, and other relevant information for executing the 'modifyCollateral' function on the market proxy contract.
   */
  protected async _buildModifyCollateral({
    amount,
    collateralMarketIdOrName,
    accountId,
  }: ModifyCollateral): Promise<Call3Value> {
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const { resolvedMarketId: collateralMarketId, resolvedMarketName: collateralMarketName } =
      await this.sdk.spot.resolveMarket(collateralMarketIdOrName);

    console.log(`Building ${amount} ${collateralMarketName} for account ${accountId}`);
    return {
      target: marketProxy.address,
      callData: encodeFunctionData({
        abi: marketProxy.abi,
        functionName: 'modifyCollateral',
        args: [accountId, collateralMarketId, await this.formatSize(amount, collateralMarketId)],
      }),
      value: 0n,
      requireSuccess: true,
    };
  }

  /**
   * Fetch the balance of each collateral type for an account.
   * @param {bigint} accountId The id of the account to fetch the collateral balances for. If not provided, the default account is used.
   * @returns {Promise<number>} The balance of the account's collateral.
   */

  public async getCollateralBalances(accountId?: bigint): Promise<number> {
    // const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    // if (accountId == undefined) {
    // accountId = this.defaultAccountId;
    // }
    throw new Error('Not implemented ' + accountId);
  }

  /**
   * Check if an `accountId` is eligible for liquidation.
   * @param accountId The id of the account to check. If not provided, the default account is used.
   * @returns {Promise<boolean>} A boolean indicating whether the account can be liquidated.
   */
  public async getCanLiquidate(accountId: bigint | undefined = undefined): Promise<boolean> {
    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }

    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const canBeLiquidated = (await this.sdk.utils.callErc7412({
      contractAddress: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,
      functionName: 'canLiquidate',
      args: [accountId],
    })) as boolean;
    console.log('canBeLiquidated', canBeLiquidated);
    return canBeLiquidated;
  }

  /**
   * Check if a batch of `accountId`'s are eligible for liquidation.
   * @param {string[]} accountIds An array of account ids
   * @returns {Promise<{ accountId: bigint; canLiquidate: boolean }[]>} An array of objects containing the account id and whether the account can be liquidated.
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

    // Format the args to the required array format
    const input = accountIds.map((accountId) => [accountId]);

    const canLiquidatesResponse = (await this.sdk.utils.multicallErc7412({
      contractAddress: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,
      functionName: 'canLiquidate',
      args: input,
    })) as boolean[];

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
   * @param {string | number} marketIdOrName - The identifier or name of the market for which the collateral is being modified
   * @param {bigint} accountId The id of the account to fetch the position for. If not provided, the default account is used.
   * @returns {OpenPositionData} An object containing the open position data for the specified market.
   */
  public async getOpenPosition(
    marketIdOrName: MarketIdOrName,
    accountId = this.defaultAccountId,
  ): Promise<OpenPositionData> {
    if (!accountId) throw new Error('Account ID is required');
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    const { resolvedMarketId, resolvedMarketName } = await this.resolveMarket(marketIdOrName);

    // Smart contract response:
    // returns (int256 totalPnl, int256 accruedFunding, int128 positionSize, uint256 owedInterest);
    const response = (await this.sdk.utils.callErc7412({
      contractAddress: marketProxy.address,
      abi: marketProxy.abi,
      functionName: 'getOpenPosition',
      args: [accountId, resolvedMarketId],
    })) as bigint[];

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
   * @param {MarketIdOrName} marketIdsOrNames - The ID or name of the Perpetual market to get a quote for.
   * @param {bigint} accountId The id of the account to fetch the position for. If not provided, the default account is used.
   * @returns {OpenPositionData[]} An array of objects containing the open position data for the specified markets.
   */
  // NOTE: maybe is better use subgraph?
  public async getOpenPositions(
    marketIdsOrNames?: MarketIdOrName[],
    accountId = this.defaultAccountId,
  ): Promise<OpenPositionData[]> {
    if (!accountId) throw new Error('Account ID is required');
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const marketIds: number[] = !marketIdsOrNames
      ? Array.from(this.marketsById.keys())
      : await Promise.all(marketIdsOrNames.map(async (market) => (await this.resolveMarket(market)).resolvedMarketId));

    const inputs = marketIds?.map((marketId) => {
      return [accountId, marketId];
    }) as unknown[];

    // Smart contract response:
    // returns (int256 totalPnl, int256 accruedFunding, int128 positionSize, uint256 owedInterest);
    const response = (await this.sdk.utils.multicallErc7412({
      contractAddress: marketProxy.address,
      abi: marketProxy.abi,
      functionName: 'getOpenPosition',
      args: inputs,
    })) as bigint[][];

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
   * @name getQuote
   * @description Fetches a quote for a Perpetual market, calculating the fees, fill price and required margin.
   * @param {number} data.size - The size of the order in base asset units
   * @param {number} data.price - The price of the order in quote asset units. If not provided, it will be fetched from Pyth Oracle.
   * @param {MarketIdOrName} data.marketIdOrName - The ID or name of the Perpetual market to get a quote for.
   * @param {number} [data.accountId=this.defaultAccountId] - The account ID of the user requesting the quote. Defaults to the default account ID.
   * @param {number} [data.settlementStrategyId=0] - The settlement strategy ID of the market. Defaults to 0 (no leverage).
   * @param {boolean} [data.includeRequiredMargin=true] - Whether to include the required margin in the quote. Defaults to true.
   * @returns {OrderQuote} An object containing the order size, index price, order fees, settlement reward cost, fill price and required margin (if provided).
   */
  public async getQuote({
    size,
    price,
    marketIdOrName,
    accountId = this.defaultAccountId,
    settlementStrategyId = 0,
    includeRequiredMargin = true,
  }: GetPerpsQuote): Promise<OrderQuote> {
    if (!accountId) throw new Error('No account Id!');

    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    const { resolvedMarketId } = await this.resolveMarket(marketIdOrName);

    const feedId = this.marketsById.get(resolvedMarketId)?.feedId;
    if (!feedId) throw new Error('Invalid feed id received from market data');

    if (!price) {
      price = await this.sdk.pyth.getFormattedPrice(feedId as Hex);
      console.log('Formatted price:', price);
    }
    const [orderFeesWithPriceResponse, settlementRewardCost, requiredMargin] = await Promise.all([
      this.sdk.utils.callErc7412({
        contractAddress: marketProxy.address,
        abi: marketProxy.abi,
        functionName: 'computeOrderFeesWithPrice',
        args: [resolvedMarketId, convertEtherToWei(size), convertEtherToWei(price)],
      }) as Promise<[bigint, bigint]>,
      this.sdk.utils.callErc7412({
        contractAddress: marketProxy.address,
        abi: marketProxy.abi,
        functionName: 'getSettlementRewardCost',
        args: [resolvedMarketId, settlementStrategyId],
      }) as Promise<bigint>,
      includeRequiredMargin && accountId
        ? (this.sdk.utils.callErc7412({
            contractAddress: marketProxy.address,
            abi: marketProxy.abi,
            functionName: 'requiredMarginForOrderWithPrice',
            args: [accountId, resolvedMarketId, convertEtherToWei(size), convertEtherToWei(price)],
          }) as Promise<bigint>)
        : 0n,
    ]);

    const orderQuote: OrderQuote = {
      orderSize: size,
      indexPrice: price,
      orderFees: convertWeiToEther(orderFeesWithPriceResponse[0]),
      settlementRewardCost: convertWeiToEther(settlementRewardCost),
      fillPrice: convertWeiToEther(orderFeesWithPriceResponse[1]),
    };

    if (includeRequiredMargin && accountId) {
      orderQuote.requiredMargin = convertWeiToEther(requiredMargin);
    }
    return orderQuote;
  }

  /**
   * Returns the debt of the account id
   * @param accountId The id of the account to get the debt for. If not provided, the default account is used.
   * @returns debt Account debt in ether
   */
  public async getDebt(accountId: bigint | undefined = this.defaultAccountId): Promise<number> {
    if (!accountId) throw new Error('No account id selected');
    if (!this.isMulticollateralEnabled)
      throw new Error(`Multicollateral is not enabled for chainId ${this.sdk.rpcConfig.chainId}`);

    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const debt = (await this.sdk.utils.callErc7412({
      contractAddress: marketProxy.address,
      abi: marketProxy.abi,
      functionName: 'debt',
      args: [accountId],
    })) as bigint;

    console.log('Account Debt: ', debt);

    return convertWeiToEther(debt);
  }

  /**
   * Calculate the approximate liquidation price for an account with single position
   * Provide either a ``marketId`` or a ``marketName``
   * @param {string | number} marketIdOrName - The identifier or name of the market for which the collateral is being modified
   * @param {bigint} accountId The id of the account to fetch the position for. If not provided, the default account is used.
   * @returns
   * liquidation price = ((maintenance margin -  available margin) / position size) + index price
   */
  public async getApproxLiquidationPrice(
    marketIdOrName: MarketIdOrName,
    accountId = this.defaultAccountId,
    override?: OverrideParamsRead,
  ): Promise<bigint> {
    if (!accountId) throw new Error('Account ID is required');
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    const { resolvedMarketId } = await this.resolveMarket(marketIdOrName);

    const functionNames: string[] = [];
    const argsList: unknown[] = [];

    // 0. Get available margin
    functionNames.push('getAvailableMargin');
    argsList.push([accountId]);

    // 1. Get required margins
    functionNames.push('getRequiredMargins');
    argsList.push([accountId]);

    // 2. Get position size
    functionNames.push('getOpenPositionSize');
    argsList.push([accountId, resolvedMarketId]);

    // 3. Get market index price
    functionNames.push('indexPrice');
    argsList.push([resolvedMarketId]);

    const multicallResponse: unknown[] = await this.sdk.utils.multicallMultifunctionErc7412(
      {
        contractAddress: marketProxy.address,
        abi: marketProxy.abi,
        functionNames,
        args: argsList,
      },
      override,
    );

    // 0. Available Margin
    const availableMargin = multicallResponse.at(0) as bigint;

    // 1. Required margin
    // returns (uint256 requiredInitialMargin,uint256 requiredMaintenanceMargin,uint256 maxLiquidationReward)
    const requiredMarginsResponse = multicallResponse.at(1) as bigint[];
    const requiredMaintenanceMargin = requiredMarginsResponse.at(1) as bigint;

    // 2. Position size
    const positionSize = multicallResponse.at(2) as bigint;
    if (positionSize == 0n) {
      return 0n;
    }

    // 3. Market index price
    const indexPrice = multicallResponse.at(3) as bigint;

    const liquidationPrice = (requiredMaintenanceMargin - availableMargin) / positionSize + indexPrice;
    return liquidationPrice;
  }

  // === WRITE CALLS ===

  /**
   * @name _buildCommitOrder
   * @description Builds a commit order for a given size, settlement strategy ID, market ID or name, account ID (default to the defaultAccountId), desired fill price, and max price impact.
   * @param {number} size - The size of the order in the base asset unit.
   * @param {string|number} data.settlementStrategyId - The ID of the settlement strategy for the market.
   * @param {string|number} data.marketIdOrName - The ID or name of the market to trade on.
   * @param {string|undefined} data.accountId - The ID of the account for which the order is being built (default to defaultAccountId).
   * @param {number|undefined} data.desiredFillPrice - The desired fill price for the order in the base asset unit.
   * @param {number|undefined} data.maxPriceImpact - The maximum price impact for the order as a percentage of the market index price.
   * @returns {Call3Value[]} An array containing the details of the transaction to be executed on the contract, including the target contract address, call data, value, and requireSuccess flag.
   */
  protected async _buildCommitOrder({
    size,
    settlementStrategyId,
    marketIdOrName,
    accountId = this.defaultAccountId,
    desiredFillPrice,
    maxPriceImpact,
  }: CommitOrder): Promise<Call3Value> {
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const { resolvedMarketId, resolvedMarketName: marketName } = await this.resolveMarket(marketIdOrName);
    if (desiredFillPrice != undefined && maxPriceImpact != undefined) {
      throw new Error('Cannot set both desiredFillPrice and maxPriceImpact');
    }
    const isShort = size < 0 ? -1 : 1;
    const sizeInWei = (await this.sdk.perps.formatSize(Math.abs(size), resolvedMarketId)) * BigInt(isShort);
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

    const txArgs = [
      resolvedMarketId,
      accountId,
      sizeInWei,
      settlementStrategyId,
      convertEtherToWei(acceptablePrice),
      this.sdk.trackingCode,
      this.sdk.referrer,
    ];

    console.log(
      `Building order size ${sizeInWei} (${size}) to ${marketName} (id: ${resolvedMarketId}) for account ${accountId}`,
    );

    return {
      target: perpsMarketProxy.address,
      callData: encodeFunctionData({ abi: perpsMarketProxy.abi, functionName: 'commitOrder', args: [txArgs] }),
      value: 0n,
      requireSuccess: true,
    };
  }

  /**
   * @name commitOrder
   * @description This function commits an order by building the necessary transactions and either executing them or returning them for later submission.
   * @param {CommitOrder} data - The details of the order to be committed.
   * @param {OverrideParamsWrite} [override] - Optional parameters to override default write settings, specifically whether to submit the transaction immediately (when `submit` is true). If not provided, the function will return the transaction object.
   * @returns {WriteReturnType} - Returns either a transaction hash if `submit` is true, or the transaction object for later submission when `submit` is false.
   */
  public async commitOrder(data: CommitOrder, override: OverrideParamsWrite = {}): Promise<WriteReturnType> {
    const builtTx = await this._buildCommitOrder(data);
    const txs = [builtTx];

    return this.sdk.utils.processTransactions(txs, { ...override });
  }
  /**
   * @name modifyCollateral
   * @description This function modifies the collateral for a given market and account. It builds the necessary transaction, then writes it to the ERC7412 contract. If submit is not provided in the override object, it returns the built transaction object. Otherwise, it executes the transaction and logs the transaction hash.
   * @param {string} data.amount - The amount of collateral to modify
   * @param {string | number} data.marketIdOrName - The identifier or name of the market for which the collateral is being modified
   * @param {string} data.accountId - The ID of the account (default is the defaultAccountId)
   * @param {OverrideParamsWrite} [override] - An optional object that overrides the function behavior. If provided, submit must be truthy to execute the transaction and log the transaction hash.
   * @returns {WriteReturnType} The built transaction object if override.submit is falsy, otherwise the transaction hash.
   */
  public async modifyCollateral(
    { amount, collateralMarketIdOrName, accountId = this.defaultAccountId }: ModifyCollateral,
    override: OverrideParamsWrite = {},
  ): Promise<WriteReturnType> {
    const processedTx = await this._buildModifyCollateral({
      amount,
      collateralMarketIdOrName,
      accountId,
    });
    const txs = [processedTx];
    return this.sdk.utils.processTransactions(txs, { ...override });
  }
  /**
   * @name payDebt
   * @description This function is used to repay a debt on Perps market using the SDK. It takes an amount and accountId as parameters, and optionally accepts an override for write operations. If no amount is provided, it will first fetch the current debt of the given accountId.
   * @param {number} data.amount - The amount to be repaid in Ether. Defaults to 0 if not provided.
   * @param {string} data.accountId - The ID of the account whose debt is being repaid. If not provided, it defaults to the defaultAccountId of the SDK instance.
   * @param {OverrideParamsWrite} override - An optional object for overriding parameters for write operations.
   * @returns {Promise<ReturnWriteCall>} A promise that resolves to a transaction hash when the debt is successfully repaid.
   */
  public async payDebt(
    { amount = 0, accountId = this.defaultAccountId }: PayDebt = { amount: 0 },
    override: OverrideParamsWrite = {},
  ): Promise<WriteReturnType> {
    if (!this.isMulticollateralEnabled) {
      throw new Error(`Multicollateral is not enabled for chainId ${this.sdk.rpcConfig.chainId}`);
    }

    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    // `debt` and `payDebt` functions are only available for multicollateral perps
    if (!amount) {
      amount = await this.getDebt(accountId);
    }

    const rawTx: Call3Value = {
      target: marketProxy.address,
      callData: encodeFunctionData({
        abi: marketProxy.abi,
        functionName: 'payDebt',
        args: [accountId, convertEtherToWei(amount)],
      }),
      value: 0n,
      requireSuccess: true,
    };
    const txs = [rawTx];

    return this.sdk.utils.processTransactions(txs, { ...override });
  }
  /**
   * Submit a liquidation for an account, or static call the liquidation function to fetch
   * the liquidation reward. The static call is important for accounts which have been
   * partially liquidated. Due to the throughput limit on liquidated value, the static call
   * returning a nonzero value means more value can be liquidated (and rewards collected).
   * This function can not be called if ``submit`` and ``staticCall`` are true.
   * @param {bigint} accountId The id of the account to liquidate. If not provided, the default account is used.
   * @param {OverrideParamsWrite} override - An optional object for overriding parameters for write operations.
   */
  public async liquidate(
    accountId = this.defaultAccountId,
    override: OverrideParamsWrite = {},
  ): Promise<WriteReturnType> {
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    // if (override.staticCall) {
    //   const liquidationReward = (await this.sdk.utils.callErc7412({
    //     contractAddress: marketProxy.address,
    //     abi: marketProxy.abi,
    //     functionName: 'liquidate',
    //     args: [accountId],
    //   })) as bigint;
    //   return convertWeiToEther(liquidationReward);
    // }
    const rawTx: Call3Value = {
      target: marketProxy.address,
      callData: encodeFunctionData({
        abi: marketProxy.abi,
        functionName: 'liquidate',
        args: [accountId],
      }),
      value: 0n,
      requireSuccess: true,
    };

    const txs = [rawTx];

    return this.sdk.utils.processTransactions(txs, { ...override });
  }
  /**
   * @name settleOrderperps
   * @description Settles an open order by executing the 'settleOrder' function on Perps Market Proxy contract.
   * @param {bigint} accountId - The ID of the account associated with the order. Defaults to `this.defaultAccountId`.
   * @param {OverrideParamsWrite} override - Optional override parameters for writing transactions (defaults to default values).
   * @returns The transaction receipt if the order is successfully settled, otherwise throws an error.
   */
  public async settleOrder(
    accountId = this.defaultAccountId,
    override: OverrideParamsWrite = {},
  ): Promise<WriteReturnType> {
    const marketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

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

    const settleTx: Call3Value = {
      requireSuccess: true,
      target: marketProxy.address,
      callData: encodeFunctionData({
        abi: marketProxy.abi,
        functionName: 'settleOrder',
        args: [accountId],
      }),
      value: 0n,
    };
    const txs = [settleTx];

    return this.sdk.utils.processTransactions(txs, { ...override });
  }

  /**
   * @name _buildCreateAccount
   * @description This function builds the data for creating an account in the PerpsMarketProxy contract using the given accountId.
   * @param {bigint} accountId - The optional accountId to be created. If not provided, a new account will be generated.
   * @returns {Call3Value[]} - An array of Call3Value objects representing the target contract, call data, value, requireSuccess flag and other necessary details for executing the function in the blockchain.
   */
  protected async _buildCreateAccount(accountId?: bigint): Promise<Call3Value> {
    const txArgs = [];
    if (accountId != undefined) {
      txArgs.push(accountId);
    }
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    return {
      target: perpsMarketProxy.address,
      callData: encodeFunctionData({
        abi: perpsMarketProxy.abi,
        functionName: 'createAccount',
        args: txArgs,
      }),
      value: 0n,
      requireSuccess: true,
    };
  }

  /**
   * @ame createAccount
   * @description Creates a new account and returns either the transaction hash or the transaction parameters. If `submit` is provided in `override`, the transaction will be submitted and the transaction hash will be returned. Otherwise, the transaction parameters will be returned.
   * @param {bigint | undefined} accountId - The ID of the account to create (optional)
   * @param {OverrideParamsWrite} override - Options for submitting or returning the transaction parameters
   * @returns {WriteReturnType} - If `submit` is provided in `override`, a string representing the transaction hash. Otherwise, an object containing the transaction parameters as defined by the CallParameters type.
   */
  public async createAccount(
    accountId?: bigint,
    override: Omit<OverrideParamsWrite, 'useOracleCalls'> = {},
  ): Promise<WriteReturnType> {
    const processedTx = await this._buildCreateAccount(accountId);
    const txs = [processedTx];

    return this.sdk.utils.processTransactions(txs, { ...override });
  }

  /**
   * @name createIsolatedAccountOrder
   * @description Creates an isolated account order for a given market, adding the specified collateral and creating the order.
   * @param {CreateIsolateOrder} params - The parameters to create an isolated account order.
   * @param {OverrideParamsWrite} override - Optional override parameters for writing transactions (defaults to default values).
   * @returns An array of CallParameters if multi-call is not used, or the transaction hash if it is submitted.
   */
  public async createIsolatedAccountOrder(
    {
      collateralAmount,
      size,
      marketIdOrName,
      settlementStrategyId = 0,
      accountId = generateRandomAccountId(),
      desiredFillPrice,
      maxPriceImpact,
      collateralMarketId,
    }: CreateIsolateOrder,
    override: OverrideParamsWrite = {},
  ): Promise<WriteReturnType> {
    const spotInstance = await this.sdk.contracts.getSpotMarketProxyInstance();
    const perpsInstance = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const { resolvedMarketId: spotCollateralId } = await this.sdk.spot.resolveMarket(collateralMarketId);

    const synthCollateral = await this.sdk.spot.getMarket(spotCollateralId);

    // Remove Synthetix asset's `s` from market name.
    // For example, remove `s` from `sUSDe` to get `USDe`
    const collateral = await this.sdk.contracts.getCollateralInstance(
      (synthCollateral.marketName ?? 'Unresolved Market').replace('s', ''),
    );

    const approveCollateral = await this.sdk.spot._buildApprove({
      spender: spotInstance.address,
      amount: collateralAmount,
      token: collateral.address,
    });

    const approveSyntCollateral = await this.sdk.spot._buildApprove({
      spender: perpsInstance.address,
      amount: collateralAmount,
      token: synthCollateral.contractAddress as Address,
    });

    // 1. Create Account
    const createAccountCall = await this._buildCreateAccount(accountId);

    // 2. Add Collateral
    const wrapTxs = await this.sdk.spot._buildWrap({
      size: collateralAmount,
      marketIdOrName: collateralMarketId,
    });

    const modifyCollateralCall = await this._buildModifyCollateral({
      amount: collateralAmount,
      collateralMarketIdOrName: collateralMarketId,
      accountId,
    });

    const commitOrderCall = await this._buildCommitOrder({
      size: size,
      settlementStrategyId,
      marketIdOrName,
      accountId,
      desiredFillPrice,
      maxPriceImpact,
    });

    const rawTxs = [
      // approveCollateral,
      // approveSyntCollateral,
      createAccountCall,
      wrapTxs,
      modifyCollateralCall,
      commitOrderCall,
    ].flat();

    return this.sdk.utils.processTransactions(rawTxs, {
      ...override,
      prepend: [
        this.sdk.utils._fromCall3ToTransactionData(approveCollateral),
        this.sdk.utils._fromCall3ToTransactionData(approveSyntCollateral),
        ...(override?.prepend ? override.prepend : []),
      ],
    });
  }

  async _buildGrantPermission({ accountId, permission, user }: GrantPermission): Promise<Call3Value> {
    const coreProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const grantPermissionTx: Call3Value = {
      target: coreProxy.address,
      callData: encodeFunctionData({
        abi: coreProxy.abi,
        functionName: 'grantPermission',
        args: [accountId, permission, user],
      }),
      value: 0n,
      requireSuccess: true,
    };

    return grantPermissionTx;
  }

  /*
   * @notice Grant a permission to a user for a specific account
   * @param accountId Account ID
   * @param permission Permission to grant
   * @param user Address of the user to grant permission to
   * @param override Override parameters
   * */

  public async grantPermission(
    { accountId = this.defaultAccountId, permission, user }: GrantPermission,
    override: Omit<OverrideParamsWrite, 'useOracleCalls'> = {},
  ) {
    const grantPermissionTx = await this._buildGrantPermission({ accountId, permission, user });

    const txs = [grantPermissionTx];

    return this.sdk.utils.processTransactions(txs, { ...override, useOracleCalls: false });
  }

  /*
   * @notice Revoke a permission from a user for a specific account
   * @param accountId Account ID
   * @param permission Permission to revoke
   * @param user Address of the user to revoke permission from
   * @param override Override parameters
   * */

  public async revokePermission(
    { accountId = this.defaultAccountId, permission, user }: GrantPermission,
    override: Omit<OverrideParamsWrite, 'useOracleCalls'> = {},
  ) {
    const coreProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const grantPermissionTx: Call3Value = {
      target: coreProxy.address,
      callData: encodeFunctionData({
        abi: coreProxy.abi,
        functionName: 'revokePermission',
        args: [accountId, permission, user],
      }),
      value: 0n,
      requireSuccess: true,
    };

    const txs = [grantPermissionTx];

    return this.sdk.utils.processTransactions(txs, { ...override, useOracleCalls: false });
  }

  /*
   * @notice Get account permissions
   * @param accountId Account ID
   * @param override Override parameters
   * */

  public async getAccountPermissions({ accountId = this.defaultAccountId }: GetPermissions) {
    if (!accountId) throw new Error('Account ID is required to get permission');

    const coreProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    return (await coreProxy.read.getAccountPermissions([accountId])) as AccountPermissions[];
  }

  public async payDebtAndWithdraw(params: PayDebtAndWithdraw, override: OverrideParamsWrite) {
    const zapInstance = await this.sdk.contracts.getZapInstance();
    const modifyPerpsPermission = PERPS_PERMISSIONS.PERPS_MODIFY_COLLATERAL;
    const { resolvedMarketId } = await this.sdk.spot.resolveMarket(params.collateralIdOrName);

    const grantPermissionTx = await this._buildGrantPermission({
      accountId: params.accountId,
      permission: modifyPerpsPermission,
      user: zapInstance.address,
    });

    const amount = await this.formatSize(params.collateralAmount, resolvedMarketId);

    const swapMaxAmountIn = amount;

    const minAmount = await this.formatSize(params.minToReceive, resolvedMarketId);

    const unwindTx = {
      target: zapInstance.address,
      callData: encodeFunctionData({
        abi: zapInstance.abi,
        functionName: 'unwind',
        args: [
          params.accountId,
          resolvedMarketId,
          amount,
          params.collateral,
          params.path,
          minAmount,
          minAmount,
          swapMaxAmountIn,
          params.receiver,
        ],
      }),
      requireSuccess: true,
      value: 0n,
    } as Call3Value;
    const txs = [grantPermissionTx, unwindTx];
    return this.sdk.utils.processTransactions(txs, { ...override });
  }
}
