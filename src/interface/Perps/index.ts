import { Address } from 'viem';
import { MarketIdOrName } from '../commonTypes';
import { PERPS_PERMISSIONS } from '../../constants/perpsPermissions';

export interface GrantPermission {
  user: Address;
  permission: PERPS_PERMISSIONS;
  accountId?: bigint;
}
export type GetPermissions = Omit<GrantPermission, 'permission' | 'user'>;

export type AccountPermissions = {
  /**
   * @dev The address for which all the permissions are granted.
   */
  user: string;
  /**
   * @dev The array of permissions given to the associated address.
   */
  permissions: string[];
};

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
  collateralMarketIdOrName: MarketIdOrName;
  accountId?: bigint;
};

export type CreateAccountDepositAndCreateOrder = {
  amount: number;
  collateralMarketIdOrName: MarketIdOrName;
  accountId?: bigint;
  order: {
    marketIdOrName: MarketIdOrName;
    size: number;
    settlementStrategyId?: number;
    acceptablePrice?: number;
    trackingCode?: string;
    referrer?: string;
  };
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

export type CreateAccountAndDeposit = {
  amount: number;
  collateralMarketIdOrName: MarketIdOrName;
  accountId?: bigint;
};

export type CreateAccountAndDepositMany = {
  amounts: number[];
  collateralMarketIdOrNames: MarketIdOrName[];
  accountId?: bigint;
};
