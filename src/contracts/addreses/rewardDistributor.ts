import { Address } from 'viem';
import { SUPPORTED_CHAINS } from '../../constants/chains';

// chain - tokenSymbol - address
export const REWARD_DISTRIBUTOR_ADDRESSES: Record<number, Record<string, Address>> = {
  [SUPPORTED_CHAINS.BASE]: { prf: '0x0000000000000000000000000000000000000000' },
};
