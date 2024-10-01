export type CommitOrder = {
  size: number;
  settlementStrategyId: number;
  marketId?: number;

  marketName?: string;
  accountId?: bigint;
  desiredFillPrice?: number;
  maxPriceImpact?: number;
};

export type ModifyCollateral = {
  amount: number;
  marketId?: number;
  marketName?: string;
  accountId?: bigint;
};
