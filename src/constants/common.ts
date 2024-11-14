import { Hex, zeroAddress } from 'viem';

export const ZERO_ADDRESS: Hex = zeroAddress;

export const SIG_ORACLE_DATA_REQUIRED = '0xcf2cabdf';
export const SIG_FEE_REQUIRED = '0x0e7186fb';
export const SIG_ERRORS = '0x0b42fd17';

export const MAX_ERC7412_RETRIES = 50; // Limit the max failures to prevent infinite loops

// List of market ids disabled by chainId
export const DISABLED_MARKETS: { [key: number]: number[] } = {
  84532: [3, 6300],
  8453: [6300],
};

export const publicRpcEndpoints: { [key: number]: string } = {
  8453: 'https://base.llamarpc.com',
  84532: 'https://sepolia.base.org',
  42161: 'https://arbitrum.llamarpc.com',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
};
