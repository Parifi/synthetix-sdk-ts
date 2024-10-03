import { Address, CallParameters } from 'viem';
import { Call3Value } from './contractTypes';

export type OverrideParamsWrite = {
  shouldRevertOnTxFailure?: boolean;
  submit?: boolean;
  useMultiCall?: boolean;
  staticCall?: boolean;
  txDelay?: number;
  maxTries?: number;
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

export type WriteReturnType = string | CallParameters;

export type MarketIdOrName = number | string;

export type ReturnWriteCall = string | CallParameters | CallParameters[];
