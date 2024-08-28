import { SynthetixSdk } from '..';
import { dynamicImportAbi, dynamicImportMeta } from './helpers';
import { getContract, Hex } from 'viem';

export class Contracts {
  sdk: SynthetixSdk;

  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
  }

  /**
   * Returns a clients object to initialize the contract instances
   * @returns clientObject - An object with a public and optionally wallet client to initialize a contract instance
   */
  private getClientsForContractInstance() {
    if (this.sdk.publicClient == undefined) {
      throw new Error('Invalid RPC config: Public client not initialized');
    }
    if (this.sdk.walletClient == undefined) {
      return {
        public: this.sdk.publicClient,
      };
    } else {
      return {
        public: this.sdk.publicClient,
        wallet: this.sdk.walletClient,
      };
    }
  }
  /**
   * The function returns an instance of the Core Proxy smart contract
   * @returns Contract - Instance of Core Proxy smart contract
   */
  public async getCoreProxyInstance() {
    try {
      const meta = await dynamicImportMeta(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset);
      const abi = await dynamicImportAbi(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset, 'CoreProxy');
      const coreProxyInstance = getContract({
        address: meta.contracts.CoreProxy as Hex,
        abi: abi,
        client: this.getClientsForContractInstance(),
      });
      return coreProxyInstance;
    } catch (error) {
      console.log(error);
      throw new Error(
        `Unsupported chain ${this.sdk.rpcConfig.chainId} or preset ${this.sdk.rpcConfig.preset} for CoreProxy`,
      );
    }
  }

  /**
   * The function returns an instance of the Account Proxy smart contract
   * @returns Contract - Instance of Account Proxy smart contract
   */
  public async getAccountProxyInstance() {
    try {
      const meta = await dynamicImportMeta(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset);
      const abi = await dynamicImportAbi(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset, 'AccountProxy');
      const accountProxyInstance = getContract({
        address: meta.contracts.AccountProxy as Hex,
        abi: abi,
        client: this.getClientsForContractInstance(),
      });
      return accountProxyInstance;
    } catch (error) {
      console.log(error);
      throw new Error(
        `Unsupported chain ${this.sdk.rpcConfig.chainId} or preset ${this.sdk.rpcConfig.preset} for AccountProxy`,
      );
    }
  }
}
