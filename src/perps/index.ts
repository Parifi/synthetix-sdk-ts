import { SynthetixSdk } from '..';
/**
 * Class for interacting with Synthetix V3 core contracts
 * @remarks
 *
 */
export class Perps {
  sdk: SynthetixSdk;
  defaultAccountId?: bigint;

  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
    this.defaultAccountId = process.env.PERPS_ACCOUNT_ID == undefined ? undefined : BigInt(process.env.PERPS_ACCOUNT_ID);
  }

  public async canLiquidate(accountId: bigint | undefined = undefined): Promise<boolean> {
    if (accountId == undefined) {
      console.log('Using default account ID value :', this.defaultAccountId);
      accountId = this.defaultAccountId;
    }

    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const canBeLiquidated = await this.sdk.utils.callErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'canLiquidate',
      [accountId],
    );
    console.log('canBeLiquidated', canBeLiquidated);
    return canBeLiquidated as boolean;
  }
}
