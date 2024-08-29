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

  /**
   * The function returns an instance of the PerpsMarketProxy smart contract
   * @returns Contract - Instance of PerpsMarketProxy smart contract
   */
  public async getPerpsMarketProxyInstance() {
    try {
      const meta = await dynamicImportMeta(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset);
      const abi = await dynamicImportAbi(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset, 'PerpsMarketProxy');
      const perpsMarketProxyInstance = getContract({
        address: meta.contracts.PerpsMarketProxy as Hex,
        abi: abi,
        client: this.getClientsForContractInstance(),
      });
      return perpsMarketProxyInstance;
    } catch (error) {
      console.log(error);
      throw new Error(
        `Unsupported chain ${this.sdk.rpcConfig.chainId} or preset ${this.sdk.rpcConfig.preset} for PerpsMarketProxy`,
      );
    }
  }

  /**
   * The function returns an instance of the PerpsAccount Proxy smart contract
   * @returns Contract - Instance of PerpsAccount Proxy smart contract
   */
  public async getPerpsAccountProxyInstance() {
    try {
      const meta = await dynamicImportMeta(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset);
      const abi = await dynamicImportAbi(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset, 'PerpsAccountProxy');
      const perpsAccountProxyInstance = getContract({
        address: meta.contracts.PerpsAccountProxy as Hex,
        abi: abi,
        client: this.getClientsForContractInstance(),
      });
      return perpsAccountProxyInstance;
    } catch (error) {
      console.log(error);
      throw new Error(
        `Unsupported chain ${this.sdk.rpcConfig.chainId} or preset ${this.sdk.rpcConfig.preset} for PerpsAccountProxy`,
      );
    }
  }

  /**
   * The function returns an instance of the PythERC7412Wrapper smart contract
   * @returns Contract - Instance of PythERC7412Wrapper smart contract
   */
  public async getPythErc7412WrapperInstance() {
    try {
      const meta = await dynamicImportMeta(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset);
      const abi = await dynamicImportAbi(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset, 'PythERC7412Wrapper');
      const pythERC7412WrapperInstance = getContract({
        address: meta.contracts.PythERC7412Wrapper as Hex,
        abi: abi,
        client: this.getClientsForContractInstance(),
      });
      return pythERC7412WrapperInstance;
    } catch (error) {
      console.log(error);
      throw new Error(
        `Unsupported chain ${this.sdk.rpcConfig.chainId} or preset ${this.sdk.rpcConfig.preset} for PythERC7412Wrapper`,
      );
    }
  }
}
