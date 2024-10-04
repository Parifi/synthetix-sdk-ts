import { Side } from '../../spot/interface';
import { MarketIdOrName } from '../commonTypes';

export type CommitOrderSpot = {
  side: Side;
  size: number;
  slippageTolerance: number;
  minAmountReceived?: number;
  settlementStrategyId?: number;
  marketIdOrName: MarketIdOrName;
};
