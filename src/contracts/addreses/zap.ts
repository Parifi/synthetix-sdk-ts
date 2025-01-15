import { Address, zeroAddress } from 'viem';
import { SUPPORTED_CHAINS } from '../../constants/chains';

export const ZAP_BY_CHAIN: Record<number, Address> = {
  [SUPPORTED_CHAINS.BASE]: '0xf2357286905c3b36454fa9f6f969d2807ee78952',
  [SUPPORTED_CHAINS.BASE_SEPOLIA]: zeroAddress,
  [SUPPORTED_CHAINS.ARBITRUM]: '0x9ec181B2E69fB36C50031F0c87Bc0749b766A9f4',
  [SUPPORTED_CHAINS.ARBITUM_SEPOLIA]: '0xb569ed692206a1d73996088ae646333b1d59d9c5',
};
