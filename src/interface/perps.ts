export type CreateIsolateOrder = {
  collateralAmount: number;
  collateralMarketId: number;
  size: number;
  marketId?: number;
  marketName?: string;
  settlementStrategyId: number;
  accountId?: bigint;
  desiredFillPrice?: number;
  maxPriceImpact?: number;
};
