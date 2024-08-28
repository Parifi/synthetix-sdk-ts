import { SynthetixSdk } from '..';

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
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();
    const resp = await coreProxy.read.getAccountOwner([accountId]);
    console.log(`Core account Owner for id ${accountId} is ${resp}`);
    return resp as string;
  }
}
