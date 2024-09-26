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
  settlementStrategy?: SettlementStrategy;
  commitmentTime?: number;
  minimumSettlementAmount?: number;
  settledAt?: number;
  referrer?: string;
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

export interface SpotMarketData {
  marketId: number;
  contractAddress: string;
  marketName?: string;
  symbol?: string;
  feedId?: string;
  settlementStrategy?: SettlementStrategy;
}
