import { Address, zeroAddress } from 'viem';
import { SUPPORTED_CHAINS } from '../../constants/chains';

export const ZAP_BY_CHAIN: Record<number, Address> = {
  [SUPPORTED_CHAINS.BASE]: '0xc79916A9Fe2c4A1468EEfCFFc88C0acc99B9Fc91',
  [SUPPORTED_CHAINS.BASE_SEPOLIA]: zeroAddress,
  [SUPPORTED_CHAINS.ARBITRUM]: '0x9ec181B2E69fB36C50031F0c87Bc0749b766A9f4',
  [SUPPORTED_CHAINS.ARBITUM_SEPOLIA]: '0xb569ed692206a1d73996088ae646333b1d59d9c5',
};

export const SYNTHETIX_ZAP: Record<number, Address> = {
  [SUPPORTED_CHAINS.BASE_SEPOLIA]: '0xA6Fab50eB36F3eB2118eE2f4C12C968F8608bbc9',
  [SUPPORTED_CHAINS.BASE]: '0x3e9950A329f55e4Ee521d81e6293C8D2586EC3f5',
};
