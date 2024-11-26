import {
  AccountPermissions,
  CommitOrder,
  CreateIsolateOrder,
  GetPermissions,
  GetPerpsQuote,
  GrantPermission,
  ModifyCollateral,
  PayDebt,
} from '.';
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
} from '../../perps/interface';
import { MarketIdOrName, OverrideParamsWrite, WriteReturnType } from '../commonTypes';
import { Call3Value } from '../contractTypes';

type MarketsBy<T> = Map<T, MarketData>;
type MarketById = MarketsBy<number>;
type MarketByName = MarketsBy<string>;

type MarketMeta = Map<number, MarketMetadata>;

export interface PerpsRepository {
  // === Properties
  marketMetadata: MarketMeta;
  marketsById: MarketById;
  marketsByName: MarketByName;

  // Mapping of Market Symbol to MarketData.
  // @note Ideally prefer using market symbol over market name
  marketsBySymbol: MarketByName;
  isErc7412Enabled: boolean;
  // Set multicollateral to false by default
  isMulticollateralEnabled: boolean;
  disabledMarkets: number[];

  // === Methods
  initPerps(): Promise<void>;
  resolveMarket(marketIdOrName: MarketIdOrName): Promise<{ resolvedMarketId: number; resolvedMarketName: string }>;
  getAccountIds(address?: string, defaultAccountId?: bigint): Promise<bigint[]>;
  getMarketSummaries(marketIds: number[]): Promise<MarketSummary[]>;
  getMarketSummary(marketIdOrName: MarketIdOrName): Promise<MarketSummary>;
  getSettlementStrategy(settlementId: number, marketIdOrName: MarketIdOrName): Promise<SettlementStrategy>;
  getSettlementStrategies(marketIds: number[]): Promise<SettlementStrategy[]>;
  getFundingParameters(marketIds: number[]): Promise<FundingParameters[]>;
  getOrderFees(marketIds: number[]): Promise<OrderFees[]>;
  getMaxMarketValues(marketIds: number[]): Promise<MaxMarketValue[]>;
  getOrder(accountId?: bigint, fetchSettlementStrategy?: boolean): Promise<OrderData>;
  getMarginInfo(accountId?: bigint): Promise<CollateralData>;
  getCollateralBalances(accountId?: bigint): Promise<number>;
  getCanLiquidate(accountId?: bigint): Promise<boolean>;
  getCanLiquidates(accountIds: bigint[]): Promise<{ accountId: bigint; canLiquidate: boolean }[]>;
  getOpenPosition(marketIdOrName: MarketIdOrName, accountId?: bigint): Promise<OpenPositionData>;
  getOpenPositions(marketIdsOrNames: MarketIdOrName[], accountIds?: bigint): Promise<OpenPositionData[]>;
  getQuote(data: GetPerpsQuote): Promise<OrderQuote>;
  getDebt(accountId?: bigint): Promise<number>;

  // === Write methods
  prepareOracleCall(marketIds: number[]): Promise<Call3Value[]>;
  createAccount(accountId?: bigint, override?: OverrideParamsWrite): Promise<WriteReturnType>;
  commitOrder(data: CommitOrder, override?: OverrideParamsWrite): Promise<WriteReturnType>;
  modifyCollateral(data: ModifyCollateral, override?: OverrideParamsWrite): Promise<WriteReturnType>;
  payDebt(data: PayDebt, override?: OverrideParamsWrite): Promise<WriteReturnType>;
  liquidate(accountId?: bigint, override?: OverrideParamsWrite): Promise<WriteReturnType | number>;
  settleOrder(accountId?: bigint, override?: OverrideParamsWrite): Promise<WriteReturnType>;
  createIsolatedAccountOrder(data: CreateIsolateOrder, override?: OverrideParamsWrite): Promise<WriteReturnType>;
  grantPermission(data: GrantPermission, override?: OverrideParamsWrite): Promise<WriteReturnType>;
  getAccountPermissions(data: GetPermissions): Promise<AccountPermissions[]>;
}
