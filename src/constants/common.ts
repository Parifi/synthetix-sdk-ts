import { Hex, zeroAddress } from 'viem';

export const ZERO_ADDRESS: Hex = zeroAddress;
export const SIG_ORACLE_DATA_REQUIRED = '0xcf2cabdf';
export const SIG_FEE_REQUIRED = '0xea958df6';

// List of market ids disabled by chainId
export const DISABLED_MARKETS: { [key: number]: number[] } = {
  84532: [3],
};
