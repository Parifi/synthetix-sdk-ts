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
    console.log(accountId);
    const provider = this.sdk.getProvider();
    const coreProxy = await getCoreProxyInstance(this.sdk.rpcConfig.chainId, provider, this.sdk.rpcConfig.preset);
    const resp = await coreProxy.getAccountOwner(accountId);
    console.log(resp);
    return resp;
  }
}
