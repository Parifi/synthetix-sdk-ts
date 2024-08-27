import { SynthetixSdk } from '..';
import { getCoreProxyInstance } from '../contracts';

/**
 * Class for interacting with Synthetix V3 core contracts
 * @remarks
 *
 */
export class Core {
  sdk: SynthetixSdk;
  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
  }

  /**
   * Returns the Owner wallet address for an account ID
   * @param accountId - Account ID
   * @returns string - Address of the account owning the accountId
   */
  public async getAccountOwner(accountId: number): Promise<string> {
    const publicClient = this.sdk.getPublicClient();
    const walletClient = this.sdk.getWalletClient();
    const coreProxy = await getCoreProxyInstance(
      this.sdk.rpcConfig.chainId,
      publicClient,
      walletClient,
      this.sdk.rpcConfig.preset,
    );
    const resp = await coreProxy.read.getAccountOwner([accountId]);
    console.log(`Core account Owner for id ${accountId} is ${resp}`);
    return resp as string;
  }
}
