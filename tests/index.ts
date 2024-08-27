import { SynthetixSdk } from '../src/index';
import { AccountConfig, RpcConfig } from '../src/interface/classConfigs';

export const getSdkInstanceForTesting = async (): Promise<SynthetixSdk> => {
  const accountConfig: AccountConfig = {
    address: '0xDf29B49eDE0289ba00a507E900552C46deed0DAc',
  };

  const rpcConfig: RpcConfig = {
    chainId: 8453,
    rpcEndpoint: 'https://base.llamarpc.com',
    preset: 'andromeda',
  };

  const sdk = new SynthetixSdk(accountConfig, {}, {}, rpcConfig, {});
  await sdk.init();

  return sdk;
};
