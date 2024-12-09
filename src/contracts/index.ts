import { SynthetixSdk } from '..';
import { ZAP_BY_CHAIN } from './addreses/zap';
import { dynamicImportAbi, dynamicImportMeta } from './helpers';
import { erc20Abi, getContract, Hex } from 'viem';

export class Contracts {
  sdk: SynthetixSdk;

  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
  }

  /**
   * The function returns an instance of the Core Proxy smart contract
   * @returns Contract - Instance of Core Proxy smart contract
   */
  public async getMulticallInstance() {
    try {
      const meta = await dynamicImportMeta(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset);
      const abi = await dynamicImportAbi(
        this.sdk.rpcConfig.chainId,
        this.sdk.rpcConfig.preset,
        'TrustedMulticallForwarder',
      );
      const multicallInstance = getContract({
        address: meta.contracts.TrustedMulticallForwarder as Hex,
        abi: abi,
        client: this.sdk.publicClient,
      });
      return multicallInstance;
    } catch (error) {
      this.sdk.logger.error(`Error: while getMulticallInstance ${error}`);
      throw new Error(
        `Unsupported chain ${this.sdk.rpcConfig.chainId} or preset ${this.sdk.rpcConfig.preset} for MulticallInstance`,
      );
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
        client: this.sdk.publicClient,
      });
      return coreProxyInstance;
    } catch (error) {
      this.sdk.logger.error(`Error: while getCoreProxyInstance ${error}`);
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
        client: this.sdk.publicClient,
      });
      return accountProxyInstance;
    } catch (error) {
      this.sdk.logger.error(`Error: while getAccountProxyInstance ${error}`);
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
        client: this.sdk.publicClient,
      });
      return perpsMarketProxyInstance;
    } catch (error) {
      this.sdk.logger.error(`Error: while getPerpsMarketProxyInstance ${error}`);
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
        client: this.sdk.publicClient,
      });
      return perpsAccountProxyInstance;
    } catch (error) {
      this.sdk.logger.error(`Error: while getPerpsAccountProxyInstance ${error}`);
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
        client: this.sdk.publicClient,
      });
      return pythERC7412WrapperInstance;
    } catch (error) {
      this.sdk.logger.error(`Error: while getPythErc7412WrapperInstance ${error}`);
      throw new Error(
        `Unsupported chain ${this.sdk.rpcConfig.chainId} or preset ${this.sdk.rpcConfig.preset} for PythERC7412Wrapper`,
      );
    }
  }

  /**
   * The function returns an instance of the SpotMarket Proxy smart contract
   * @returns Contract - Instance of SpotMarket Proxy smart contract
   */
  public async getSpotMarketProxyInstance() {
    try {
      const meta = await dynamicImportMeta(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset);
      const abi = await dynamicImportAbi(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset, 'SpotMarketProxy');
      const spotMarketProxyInstance = getContract({
        address: meta.contracts.SpotMarketProxy as Hex,
        abi: abi,
        client: this.sdk.publicClient,
      });
      return spotMarketProxyInstance;
    } catch (error) {
      this.sdk.logger.error(`Error: while getSpotMarketProxyInstance ${error}`);
      throw new Error(
        `Unsupported chain ${this.sdk.rpcConfig.chainId} or preset ${this.sdk.rpcConfig.preset} for SpotMarketProxy`,
      );
    }
  }

  /**
   * The function returns an instance of the USD Proxy smart contract
   * @returns Contract - Instance of USD Proxy smart contract
   */
  public async getUSDProxyInstance() {
    try {
      const meta = await dynamicImportMeta(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset);
      const abi = await dynamicImportAbi(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset, 'USDProxy');
      const usdProxyInstance = getContract({
        address: meta.contracts.USDProxy as Hex,
        abi: abi,
        client: this.sdk.publicClient,
      });
      return usdProxyInstance;
    } catch (error) {
      this.sdk.logger.error(`Error: while getUSDProxyInstance ${error}`);
      throw new Error(
        `Unsupported chain ${this.sdk.rpcConfig.chainId} or preset ${this.sdk.rpcConfig.preset} for USDProxy`,
      );
    }
  }

  public async getZapInstance() {
    try {
      const address = ZAP_BY_CHAIN[this.sdk.rpcConfig.chainId];
      const abi = await dynamicImportAbi(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset, 'SynthZap');
      const zapInstance = getContract({
        address,
        abi: abi,
        client: this.sdk.publicClient,
      });
      return zapInstance;
    } catch (error) {
      this.sdk.logger.error(`Error: while getZapInstance ${error}`);
      throw new Error(`Unsupported chain ${this.sdk.rpcConfig.chainId} or preset ${this.sdk.rpcConfig.preset} for Zap`);
    }
  }

  public async getCollateralInstance(symbol: string) {
    try {
      const meta = await dynamicImportMeta(this.sdk.rpcConfig.chainId, this.sdk.rpcConfig.preset);

      const contracts = Object.keys(meta.contracts);
      const contract = contracts.find((contract) => contract.toLowerCase().includes(symbol.toLowerCase()));
      console.log('=== contracts', contracts, symbol, contract);

      // @ts-expect-error correct type
      const address = meta.contracts[contract as string] as Hex;

      if (!address) {
        throw new Error(`CollateralToken_${symbol} not found in meta`);
      }

      const collateralInstance = getContract({
        address,
        abi: erc20Abi,
        client: this.sdk.publicClient,
      });
      return collateralInstance;
    } catch (error) {
      this.sdk.logger.error(`Error: while getAccountProxyInstance ${error}`);
      throw new Error(
        `Unsupported chain ${this.sdk.rpcConfig.chainId} or preset ${this.sdk.rpcConfig.preset} for CollateralToken_${symbol}`,
      );
    }
  }
}
