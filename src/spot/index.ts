import { CallParameters, parseUnits } from 'viem';
import { SynthetixSdk } from '..';
/**
 * Class for interacting with Synthetix V3 core contracts
 * @remarks
 *
 */
export class Spot {
  sdk: SynthetixSdk;
  defaultAccountId?: bigint;
  accountIds: bigint[];


  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
    this.accountIds = [];
  }

  public async wrap(size: string, marketId: Number, submit: boolean) {
    const sizeInWei = parseUnits(size.toString(), 6);
    const spotMarketProxy = await this.sdk.contracts.getSpotMarketProxyInstance();
    const tx: CallParameters = await this.sdk.utils.writeErc7412(spotMarketProxy.address, spotMarketProxy.abi, 'wrap', [
      marketId,
      sizeInWei,
      sizeInWei,
    ]);

    if (submit) {
      const txHash = await this.sdk.executeTransaction(tx);
      console.log('Wrap tx hash', txHash);
      return txHash;
    } else {
      return tx;
    }
  }
}
