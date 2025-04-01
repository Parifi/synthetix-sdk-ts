import { Address, Hash, StateMapping, StateOverride } from 'viem';
import { Call3Value } from './contractTypes';

export type TransactionData = {
  to: Address;
  data: string;
  value: string;
};

export type OverrideParamsWrite = {
  shouldRevertOnTxFailure?: boolean;
  useMultiCall?: boolean;
  useOracleCalls?: boolean;
  submit?: boolean;
  account?: Address;
  prepend?: TransactionData[];
  stateOverride?: { address: Address; stateDiff: StateMapping }[];
  // staticCall?: boolean;
  // txDelay?: number;
  // maxTries?: number;
};

export type OverrideParamsRead = {
  account?: Address;
};

export type WriteCallParams = {
  calls: Call3Value[];
};

export type WriteContractParams = {
  contractAddress: Address;
  abi: unknown;
  functionName: string;
  args: unknown[];
  calls?: Call3Value[];
};

export type WriteErc7412 = WriteCallParams | WriteContractParams;

export type WriteReturnType = TransactionData[] | Hash;

export type MarketIdOrName = number | string;
