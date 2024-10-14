import { MarketIdOrName } from '../commonTypes';

export type CommitOrder = {
  size: number;
  settlementStrategyId: number;
  marketIdOrName: MarketIdOrName;
  accountId?: bigint;
  desiredFillPrice?: number;
  maxPriceImpact?: number;
};

export type ModifyCollateral = {
  amount: number;
  marketIdOrName: MarketIdOrName;
  accountId?: bigint;
};

export type CreateIsolateOrder = {
  collateralAmount: number;
  collateralMarketId: number;
  size: number;
  marketIdOrName: MarketIdOrName;
  settlementStrategyId: number;
  accountId?: bigint;
  desiredFillPrice?: number;
  maxPriceImpact?: number;
};

export type GetPerpsQuote = {
  size: number;
  price?: number;
  marketIdOrName: MarketIdOrName;
  accountId?: bigint;
  settlementStrategyId?: number;
  includeRequiredMargin?: boolean;
};

export type PayDebt = {
  accountId?: bigint;
  amount: number;
};
