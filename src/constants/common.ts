import { Hex, zeroAddress } from 'viem';

export const ZERO_ADDRESS: Hex = zeroAddress;
export const SIG_ORACLE_DATA_REQUIRED = '0xcf2cabdf';
export const SIG_FEE_REQUIRED = '0xea958df6';
export const MAX_ERC7412_RETRIES = 10; // Limit the max failures to prevent infinite loops

// List of market ids disabled by chainId
export const DISABLED_MARKETS: { [key: number]: number[] } = {
  84532: [3, 6300],
  8453: [6300],
};
