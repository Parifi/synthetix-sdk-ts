import 'dotenv/config';
import { SynthetixSdk } from '../src/index';
import { AccountConfig, DefaultConfig, PartnerConfig, PythConfig, RpcConfig } from '../src/interface/classConfigs';
import { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getPublicRpcEndpoint } from '../src/utils';

import { DEFAULT_REFERRER, DEFAULT_TRACKING_CODE } from '../src/constants';

export const getSdkInstanceForTesting = async (): Promise<SynthetixSdk> => {
  console.log('Default address: ', process.env.DEFAULT_ADDRESS);

  // initialize RPC config
  const chainId = Number(process.env.CHAIN_ID || '421614');
  const rpcConfig: RpcConfig = {
    chainId: chainId,
    rpcEndpoint: process.env.RPC_ENDPOINT || getPublicRpcEndpoint(chainId),
    preset: process.env.PRESET || 'main',
  };

  // initialize WalletClient if private key is set
  let signerAccount;
  if (process.env.PRIVATE_KEY) {
    signerAccount = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
  }

  // init Account config
  const accountConfig: AccountConfig = {
    address: process.env.DEFAULT_ADDRESS,
    privateKeyAccount: signerAccount,
  };

  const partnerConfig: PartnerConfig = {
    trackingCode: process.env.TRACKING_CODE || DEFAULT_TRACKING_CODE,
    referrer: process.env.REFERRER || DEFAULT_REFERRER,
  };

  const pythConfig: PythConfig = {
    pythEndpoint: process.env.PYTH_ENDPOINT,
    username: process.env.PYTH_USERNAME,
    password: process.env.PYTH_PASSWORD,
    cacheTtl: Number(process.env.PYTH_CACHE_TTL),
  };

  const defaultConfig: DefaultConfig = {
    resolveMarketName: false,
  };

  const sdk = new SynthetixSdk({ accountConfig, partnerConfig, pythConfig, rpcConfig, defaultConfig });
  await sdk.init();

  return sdk;
};
