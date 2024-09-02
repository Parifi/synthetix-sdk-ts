import { ContractFunctionParameters } from 'viem';
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

    const tx: ContractFunctionParameters = {
      address: perpsMarketProxy.address,
      abi: perpsMarketProxy.abi,
      functionName: 'canLiquidate',
      args: [accountId],
    };

    const resp = await this.sdk.utils.multicallErc7412([tx]);
    console.log(resp);
  }
}
