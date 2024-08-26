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

}
