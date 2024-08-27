import { WalletClient } from 'viem';

export interface AccountConfig {
  address?: string;
  walletClient?: WalletClient;
  coreAccountId?: number;
  perpsAccountId?: number;
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
  preset?: string;
}

export interface SubgraphConfig {
  subgraphEndpoint?: string;
  username?: string;
  password?: string;
}
