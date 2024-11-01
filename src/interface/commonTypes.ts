import { Address } from 'viem';
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
  // staticCall?: boolean;
  // txDelay?: number;
  // maxTries?: number;
};

export type OverrideParamsRead = unknown;
// {
// shouldRevertOnTxFailure?: boolean;
// submit?: boolean;
// };

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

export type WriteReturnType = TransactionData | TransactionData[];

export type MarketIdOrName = number | string;
