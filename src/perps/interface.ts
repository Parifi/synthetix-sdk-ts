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

export interface MarketData {
  marketId: string;
  marketName: string;
  feedId: string;
  skew: number;
  size: number;
  maxOpenInterest: number;
  interestRate: number;
  currentFundingRate: number;
  currentFundingVelocity: number;
  indexPrice: number;
  skewScale: number;
  maxFundingVelocity: number;
  makerFee: number;
  takerFee: number;
  maxMarketValue: number;
}
