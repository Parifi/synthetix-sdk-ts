export enum Side {
  BUY,
  SELL,
}
export interface SpotOrder {
  id?: number;
  owner?: string;
  orderType?: number;
  amountEscrowed?: number;
  settlementStrategyId?: number;
  settlementStrategy?: SpotSettlementStrategy;
  commitmentTime?: number;
  minimumSettlementAmount?: number;
  settledAt?: number;
  referrer?: string;
}

export interface SpotSettlementStrategy {
  marketId?: number;
  strategyType?: number;
  settlementDelay?: number;
  settlementWindowDuration?: number;
  priceVerificationContract?: string;
  feedId?: string;
  url?: string;
  settlementReward?: number;
  priceDeviationTolerance?: number;
  minimumUsdExchangeAmount?: number;
  maxRoundingLoss?: number;
  disabled?: boolean;
}

export interface SpotMarketData {
  marketId: number;
  contractAddress: string;
  marketName?: string;
  symbol?: string;
  feedId?: string;
  settlementStrategy?: SpotSettlementStrategy;
}
