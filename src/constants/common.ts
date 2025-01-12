import { Hex, zeroAddress } from 'viem';
import { MarketIdOrName } from '../interface/commonTypes';

export const ZERO_ADDRESS: Hex = zeroAddress;

export const SIG_ORACLE_DATA_REQUIRED = '0xcf2cabdf';
export const SIG_FEE_REQUIRED = '0x0e7186fb';
export const SIG_ERRORS = '0x0b42fd17';

// for markets metadata it is requesting too much oracle updates
export const MAX_ERC7412_RETRIES = 80; // Limit the max failures to prevent infinite loops

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

// Logger constants
export type LOGGER_MESSAGE_TYPE = 'json' | 'pretty' | 'hidden';

// 0: silly, 1: trace, 2: debug, 3: info, 4: warn, 5: error, 6: fatal
export const DEFAULT_LOGGER_LEVEL = 4; // https://tslog.js.org/#/?id=highlights to see more levels
export const CUSTOM_DECIMALS: Record<number, Record<MarketIdOrName, number>> = {
  [421614]: {
    2: 6,
    USDC: 6,
  },
  [42161]: {
    2: 6,
    USDC: 6,
  },
  [84532]: {
    1: 6,
    USDC: 6,
  },
  [8453]: {
    1: 6,
    USDC: 6,
  },
};
