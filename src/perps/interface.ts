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
  feedId: string;
}

export interface MarketData {
  marketId?: number;
  marketName?: string;
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

export interface SettlementStrategy {
  marketId?: number;
  marketName?: string;
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
  marketId?: number,
  skewScale?: number;
  maxFundingVelocity?: number;
}
