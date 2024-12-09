import { Address, Hex } from 'viem';
import { OverrideParamsRead, OverrideParamsWrite, WriteReturnType } from '../commonTypes';

export interface CoreRepository {
  getAccountOwner(accountId: bigint, override?: OverrideParamsRead): Promise<Hex>;
  getUsdToken(override?: OverrideParamsRead): Promise<Hex>;
  getAccountIds(data: { address?: string; accountId?: bigint }, override?: OverrideParamsRead): Promise<bigint[]>;

  getAvailableCollateral(
    data: { tokenAddress: Address; accountId?: bigint },
    override?: OverrideParamsRead,
  ): Promise<string>;
  getPreferredPool(): Promise<bigint>;
  createAccount(accountId?: bigint, override?: OverrideParamsWrite): Promise<WriteReturnType>;
  deposit(
    data: { tokenAddress: Address; amount: number; decimals: number; accountId?: bigint },
    override?: OverrideParamsWrite,
  ): Promise<WriteReturnType>;
  withdraw(
    data: { tokenAddress: Address; amount: number; decimals: number; accountId?: bigint },
    override?: OverrideParamsWrite,
  ): Promise<WriteReturnType>;

  delegateCollateral(
    data: {
      tokenAddress: string;
      amount: number;
      accountId?: bigint;
      poolId: bigint;
      leverage: number;
    },

    override?: OverrideParamsWrite,
  ): Promise<WriteReturnType>;
  mintUsd(
    data: {
      tokenAddress: Address;
      amount: number;

      poolId: bigint;
      accountId?: bigint;
    },
    override: OverrideParamsWrite,
  ): Promise<WriteReturnType>;
}
