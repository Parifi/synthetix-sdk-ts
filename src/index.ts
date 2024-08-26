import { AccountConfig, PartnerConfig, PythConfig, RpcConfig, SubgraphConfig } from './interface/classConfigs';
import { IpcSocketProvider, JsonRpcProvider, Wallet, WebSocketProvider } from 'ethers';
import { getPublicRpcEndpoint } from './utils';
import { Core } from './core';

export class SynthetixSdk {
  accountConfig: AccountConfig;
  partnerConfig: PartnerConfig;
  pythConfig: PythConfig;
  rpcConfig: RpcConfig;
  subgraphConfig: SubgraphConfig;

  // Account
  provider?: JsonRpcProvider | WebSocketProvider | IpcSocketProvider;
  wallet?: Wallet;

  core: Core;

  constructor(
    accountConfig: AccountConfig,
    partnerConfig: PartnerConfig,
    pythConfig: PythConfig,
    rpcConfig: RpcConfig,
    subgraphConfig: SubgraphConfig,
  ) {
    this.accountConfig = accountConfig;
    this.partnerConfig = partnerConfig;
    this.pythConfig = pythConfig;
    this.rpcConfig = rpcConfig;
    this.subgraphConfig = subgraphConfig;

    this.core = new Core(this);
  }

  async init() {
    // Initialize account config
    if (this.rpcConfig) {
      const rpcEndpoint = this.rpcConfig.rpcEndpoint;
      if (rpcEndpoint?.startsWith('http')) {
        this.provider = new JsonRpcProvider(this.rpcConfig.rpcEndpoint);
      } else if (rpcEndpoint?.startsWith('wss')) {
        this.provider = new WebSocketProvider(rpcEndpoint);
      } else if (rpcEndpoint?.endsWith('ipc')) {
        this.provider = new IpcSocketProvider(rpcEndpoint);
      } else {
        // Use the default public RPC provider if rpcEndpoint is missing
        console.info('Using public RPC endpoint for chainId ', this.rpcConfig.chainId);
        this.provider = new JsonRpcProvider(getPublicRpcEndpoint(this.rpcConfig.chainId));
      }
    }

    if (this.accountConfig.wallet) {
      // Set the wallet in SDK if passed
      this.wallet = this.accountConfig.wallet;

      if (this.accountConfig.address == undefined) {
        this.accountConfig.address = this.wallet.address;
        console.info('Using address from wallet signer', this.wallet.address);
      } else {
        // Check the address matches the wallet signer address
        if (this.accountConfig.address != this.wallet.address) {
          throw new Error('Wallet signer does not match the provided address');
        }
        console.info('Using address from wallet signer', this.wallet.address);
      }
    } else {
      if (this.accountConfig.address == undefined) {
        console.info('Wallet or Account address not provided');
      } else {
        console.info('Using provided address without wallet signer: ', this.accountConfig.address);
      }
    }

    // Initialize partner config

    // Initialize Pyth config

    // Initialize Rpc config

    // Initialize Subgraph config
  }

  public getProvider(): JsonRpcProvider | WebSocketProvider | IpcSocketProvider {
    if (this.provider != undefined) {
      return this.provider;
    } else {
      throw new Error('Provider not initialized');
    }
  }
}
