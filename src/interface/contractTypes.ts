import { Address, Hex } from 'viem';

// TypeScript type for the Call3Value struct from Multicall3 contract
export interface Call3Value {
  target: Address;
  allowFailure: boolean;
  callData: Hex;
  value?: bigint;
}

// TypeScript type for the Result struct  from Multicall3 contract
export interface Result {
  success: boolean;
  returnData: Hex;
}
