import { PrivateKeyAccount } from 'viem';

export interface AccountConfig {
  address?: string;
  privateKeyAccount?: PrivateKeyAccount;
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

export interface DefaultConfig {
  resolveMarketName?: boolean;
  maxPriceImpact?: number;
  logLevel?: number;
}

export interface SdkConfigParams {
  accountConfig: AccountConfig;
  partnerConfig?: PartnerConfig;
  pythConfig?: PythConfig;
  rpcConfig: RpcConfig;
  defaultConfig?: DefaultConfig;
}
