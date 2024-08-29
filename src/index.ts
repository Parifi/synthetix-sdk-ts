import { AccountConfig, PartnerConfig, PythConfig, RpcConfig, SubgraphConfig } from './interface/classConfigs';
import { getPublicRpcEndpoint, getViemChain } from './utils';
import { Core } from './core';
import { createPublicClient, http, PublicClient, WalletClient, webSocket } from 'viem';
import { ipc } from 'viem/node';
import { ZERO_ADDRESS } from './constants/common';
import { Contracts } from './contracts';
import { base } from 'viem/chains';

export class SynthetixSdk {
  accountConfig: AccountConfig;
  partnerConfig: PartnerConfig;
  pythConfig: PythConfig;
  rpcConfig: RpcConfig;
  subgraphConfig: SubgraphConfig;

  // Public client should always be defined either using the rpcConfig or using the public
  publicClient?: PublicClient;
  walletClient?: WalletClient;

  core: Core;
  contracts: Contracts;

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
    this.contracts = new Contracts(this);

    /**
     * Initialize Public client to RPC chain rpc
     */
    if (this.rpcConfig) {
      // Get viem chain for client initialization
      const viemChain = getViemChain(this.rpcConfig.chainId);
      const rpcEndpoint = this.rpcConfig.rpcEndpoint;

      if (rpcEndpoint?.startsWith('http')) {
        this.publicClient = createPublicClient({
          chain: viemChain,
          transport: http(rpcEndpoint),
          batch: {
            multicall: true,
          },
        });
      } else if (rpcEndpoint?.startsWith('wss')) {
        this.publicClient = createPublicClient({
          chain: viemChain,
          transport: webSocket(rpcEndpoint),
          batch: {
            multicall: true,
          },
        });
      } else if (rpcEndpoint?.endsWith('ipc')) {
        this.publicClient = createPublicClient({
          chain: viemChain,
          transport: ipc(rpcEndpoint),
          batch: {
            multicall: true,
          },
        });
      } else {
        // Use the default public RPC provider if rpcEndpoint is missing
        console.info('Using public RPC endpoint for chainId ', this.rpcConfig.chainId);
        const publicEndpoint = getPublicRpcEndpoint(this.rpcConfig.chainId);
        this.publicClient = createPublicClient({
          chain: viemChain,
          transport: http(publicEndpoint),
        });
      }
    }
  }

  async init() {
    /**
     * Initialize Wallet client for users wallet
     */
    try {
      if (this.accountConfig.walletClient != undefined) {
        // Set the wallet in SDK if passed
        this.walletClient = this.accountConfig.walletClient;

        const addresses = await this.walletClient.getAddresses();
        let address0 = ZERO_ADDRESS;
        if (addresses.length > 0) {
          address0 = addresses[0];
        }

        if (this.accountConfig.address == undefined) {
          this.accountConfig.address = address0;
          console.info('Using address from walletClient signer', address0);
        } else {
          // Check the address matches the wallet signer address
          if (this.accountConfig.address != address0) {
            throw new Error('Wallet signer does not match the provided address');
          }
          console.info('Using address from wallet signer', address0);
        }
      } else {
        if (this.accountConfig.address == undefined) {
          console.info('Wallet or Account address not provided');
        } else {
          console.info('Using provided address without wallet signer: ', this.accountConfig.address);
        }
      }
    } catch (error) {
      console.log('Error:', error);
      throw error;
    }

    // Initialize partner config

    // Initialize Pyth config

    // Initialize Rpc config

    // Initialize Subgraph config
  }

  public getPublicClient(): PublicClient {
    if (this.publicClient != undefined) {
      return this.publicClient;
    } else {
      throw new Error('PublicCLient not initialized');
    }
  }

  public getWalletClient(): WalletClient | undefined {
    return this.walletClient;
  }
}
