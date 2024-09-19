import { CallParameters, parseUnits } from 'viem';
import { SynthetixSdk } from '..';

/**
 * Class for interacting with Synthetix V3 spot market contracts.
 * Provider methods for wrapping and unwrapping assets, approvals, atomic orders, and async orders.
 * Use ``get`` methods to fetch information about balances, allowances, and markets
 * const { marketsById, marketsByName } = await sdk.perps.getMarkets();
 *
 * Other methods prepare transactions, and submit them to your RPC.
 * An instance of this module is available as ``sdk.spot``. If you are using a network without
 * spot contracts deployed, the contracts will be unavailable and the methods will raise an error.
 * The following contracts are required:
 * - SpotMarketProxy
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
