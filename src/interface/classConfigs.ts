import { Wallet } from 'ethers';

export interface AccountConfig {
  address?: string;
  wallet?: Wallet;
  coreAccountId: number;
  perpsAccountId: number;
}
export interface PartnerConfig {
  trackingCode?: string;
  referrer?: string;
}

export interface PythConfig {
  pythEndpoint?: string;
  username?: string;
  password?: string;
  cacheTtl?: number;
}

export interface RpcConfig {
  chainId: number;
  rpcEndpoint?: string;
}

export interface SubgraphConfig {
  subgraphEndpoint?: string;
  username?: string;
  password?: string;
}
