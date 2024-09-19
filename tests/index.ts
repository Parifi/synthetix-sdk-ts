import 'dotenv/config';
import { SynthetixSdk } from '../src/index';
import { AccountConfig, PartnerConfig, PythConfig, RpcConfig } from '../src/interface/classConfigs';
import { createWalletClient, Hex, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getPublicRpcEndpoint, getChain } from '../src/utils';

import { DEFAULT_REFERRER, DEFAULT_TRACKING_CODE } from '../src/constants';

export const getSdkInstanceForTesting = async (): Promise<SynthetixSdk> => {
  console.log('Default address: ', process.env.DEFAULT_ADDRESS);

  // initialize RPC config
  const chainId = Number(process.env.CHAIN_ID || '8453');
  const rpcConfig: RpcConfig = {
    chainId: chainId,
    rpcEndpoint: process.env.RPC_ENDPOINT || getPublicRpcEndpoint(chainId),
    preset: process.env.PRESET || 'andromeda',
  };

  // initialize WalletClient if private key is set
  let walletClient;
  if (process.env.PRIVATE_KEY) {
    const viemAccount = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

    walletClient = createWalletClient({
      account: viemAccount,
      chain: getChain(rpcConfig.chainId),
      transport: http(rpcConfig.rpcEndpoint || getPublicRpcEndpoint(chainId)),
    });
  }

  // init Account config
  const accountConfig: AccountConfig = {
    address: process.env.DEFAULT_ADDRESS,
    walletClient: walletClient,
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

  const sdk = new SynthetixSdk({ accountConfig, partnerConfig, pythConfig, rpcConfig });
  await sdk.init();

  return sdk;
};
