import { Hex } from 'viem';
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
  public async getAccountOwner(accountId: number): Promise<Hex> {
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();
    const resp = await coreProxy.read.getAccountOwner([accountId]);
    console.log(`Core account Owner for id ${accountId} is ${resp}`);
    return resp as Hex;
  }

  /**
   * Get the address of the USD stablecoin token
   *
   * @returns Address of the USD stablecoin token
   */
  public async getUsdToken(): Promise<Hex> {
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();
    const response = await coreProxy.read.getUsdToken([]);
    console.log('USD Token address: ', response);
    return response as Hex;
  }

  /**
   *  Get the core account IDs owned by an address.
   *  Fetches the account IDs for the given address by checking the balance of
   *  the AccountProxy contract, which is an NFT owned by the address.
   *  If no address is provided, uses the connected wallet address.
   * @param address: The address to get accounts for. Uses connected address if not provided.
   * @param defaultAccountId: The default account ID to set after fetching.
   * @returns A list of account IDs owned by the address
   */

  public async getAccountIds(
    address: string | undefined = undefined,
    defaultAccountId: number | undefined = undefined,
  ) {
    if (address == undefined) {
      address = this.sdk.accountConfig.address;
    }

    const accountProxy = await this.sdk.contracts.getAccountProxyInstance();
    const balance = await accountProxy.read.balanceOf([address]);
    console.log('balance', balance);

    const accountProxyContract = {
      address: accountProxy.address,
      abi: accountProxy.abi,
    } as const;

    const publicClient = this.sdk.publicClient;

    if (publicClient != undefined) {
      console.log(publicClient);
      const accountIds = await publicClient.multicall({
        contracts: [
          {
            ...accountProxyContract,
            functionName: 'tokenOfOwnerByIndex',
            args: [0n],
          },
        ],
      });

      console.log('accountIds', accountIds);
    }

    console.log(defaultAccountId);
  }
}
