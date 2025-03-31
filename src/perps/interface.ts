import { Address } from 'viem';

export type PayDebtAndWithdraw = {
  accountId?: bigint;
  collateralIdOrName: number | string;
  collateralAmount: number;
  receiver: Address;
  minToReceive: number;
  path?: string;
  collateral: Address;
};

export interface MarketSummary {
  marketId?: number;
  marketName?: string;
  feedId?: string;
  skew?: number;
  size?: number;
  maxOpenInterest?: number;
  interestRate?: number;
  indexPrice?: number;
  currentFundingRate?: number;
  currentFundingVelocity?: number;
}

export interface MarketMetadata {
  marketName: string;
  symbol: string;
  feedId?: string;
}

export interface MarketData {
  marketId?: number;
  marketName?: string;
  symbol?: string;
  feedId?: string;
  skew?: number;
  size?: number;
  maxOpenInterest?: number;
  interestRate?: number;
  currentFundingRate?: number;
  currentFundingVelocity?: number;
  indexPrice?: number;
  skewScale?: number;
  maxFundingVelocity?: number;
  makerFee?: number;
  takerFee?: number;
  maxMarketValue?: number;
}

export interface SpotMarketData {
  marketId: number;
  contractAddress: string;
  marketName?: string;
  symbol?: string;
  feedId?: string;
  settlementStrategy?: SettlementStrategy;
}

export interface SettlementStrategy {
  marketId?: number;
  strategyType?: number;
  settlementDelay?: number;
  settlementWindowDuration?: number;
  priceVerificationContract?: string;
  feedId?: string;
  settlementReward?: number;
  disabled?: boolean;
  commitmentPriceDelay?: number;
}

export interface FundingParameters {
  marketId?: number;
  skewScale?: number;
  maxFundingVelocity?: number;
}

export interface OrderFees {
  marketId?: number;
  makerFeeRatio?: number;
  takerFeeRatio?: number;
}

export interface MaxMarketValue {
  marketId?: number;
  maxMarketValue?: number;
}

export interface OrderData {
  marketId: number;
  commitmentTime: number;
  accountId: bigint;
  sizeDelta: number;
  settlementStrategyId: number;
  acceptablePrice: number;
  trackingCode: string;
  referrer: string;
  settlementStrategy?: SettlementStrategy;
}

export interface CollateralData {
  totalCollateralValue: number;
  collateralBalances: Record<string, number>;
  debt: number;
  availableMargin: number;
  withdrawableMargin: number;
  initialMarginRequirement: number;
  maintenanceMarginRequirement: number;
  maxLiquidationReward: number;
}

export interface OpenPositionData {
  accountId: bigint;
  marketId: number;
  marketName: string;
  totalPnl: number;
  accruedFunding: number;
  positionSize: number;
  owedInterest: number;
}

export interface OrderQuote {
  orderSize: number;
  indexPrice: number;
  orderFees: number;
  settlementRewardCost: number;
  fillPrice: number;
  requiredMargin?: number;
}

// Interface to store temporary result (unformatted values) from smart contract calls
// i.e intermediate interface to map the values from smart contract types to sdk types
export interface SettlementStrategyResponse {
  strategyType?: number;
  settlementDelay?: bigint;
  settlementWindowDuration?: bigint;
  priceVerificationContract?: string;
  feedId?: string;
  settlementReward?: bigint;
  disabled?: boolean;
  commitmentPriceDelay?: bigint;
}

export interface MarketSummaryResponse {
  skew: bigint;
  size: bigint;
  maxOpenInterest: bigint;
  currentFundingRate: bigint;
  currentFundingVelocity: bigint;
  indexPrice: bigint;
}
