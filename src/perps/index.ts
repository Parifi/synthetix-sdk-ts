import { encodeFunctionData, TransactionRequest } from 'viem';
import { SynthetixSdk } from '..';
/**
 * Class for interacting with Synthetix V3 core contracts
 * @remarks
 *
 */
export class Perps {
  sdk: SynthetixSdk;
  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
  }

  public async canLiquidate(accountId: bigint) {
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    const publicClient = this.sdk.getPublicClient();

    const encodedData = encodeFunctionData({
      abi: perpsMarketProxy.abi,
      functionName: 'canLiquidate',
      args: [accountId],
    });

    const tx: TransactionRequest = {
      from: this.sdk.accountAddress,
      to: perpsMarketProxy.address,
      data: encodedData,
    };

    const res = await publicClient.call(tx);
    console.log(res);

    const resp = await this.sdk.utils.callErc7412(tx);
    console.log(resp);
  }
}
