import { Address } from 'viem';
import { Side } from '../../spot/interface';
import { MarketIdOrName } from '../commonTypes';

export type Sell = {
  amount: number;
  collateralIdOrName: MarketIdOrName;
  referrer?: Address;
};

export type CommitOrderSpot = {
  side: Side;
  size: number;
  slippageTolerance: number;
  minAmountReceived?: number;
  settlementStrategyId?: number;
  marketIdOrName: MarketIdOrName;
};

export type Approve = {
  targetAddress: string;
  amount?: number;
  marketIdOrName: MarketIdOrName;
};

export type GetOrder = {
  asyncOrderId: number;
  marketIdOrName: MarketIdOrName;
  fetchSettlementStrategy?: boolean;
};

export type GetSettlementStrategy = {
  settlementStrategyId: number;
  marketIdOrName: MarketIdOrName;
};

export type GetSettlementStrategies = {
  settlementStrategyId: number;
  marketIds: number[];
};

export interface SettlementStrategyResponse {
  strategyType?: number;
  settlementDelay?: bigint;
  settlementWindowDuration?: bigint;
  priceVerificationContract?: string;
  feedId?: string;
  url?: string;
  settlementReward?: bigint;
  priceDeviationTolerance?: bigint;
  minimumUsdExchangeAmount?: bigint;
  maxRoundingLoss?: bigint;
  disabled?: boolean;
}

export type AtomicOrder = {
  side: Side;
  size: number;
  slippageTolerance: number;
  marketIdOrName: MarketIdOrName;
  minAmountReceived?: number;
};

export type Wrap = {
  size: number;
  marketIdOrName: MarketIdOrName;
};

export type SettleOrder = {
  asyncOrderId: number;
  marketIdOrName: MarketIdOrName;
};
