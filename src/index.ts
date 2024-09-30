import { AccountConfig, RpcConfig, SdkConfigParams } from './interface/classConfigs';
import { getPublicRpcEndpoint, getChain, Utils } from './utils';
import { Core } from './core';
import {
  Address,
  CallParameters,
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  PrivateKeyAccount,
  PublicClient,
  webSocket,
} from 'viem';
import { ZERO_ADDRESS } from './constants/common';
import { Contracts } from './contracts';
import { Pyth } from './pyth';
import { Perps } from './perps';
import { privateKeyToAccount } from 'viem/accounts';
import { Spot } from './spot';
import { DEFAULT_REFERRER, DEFAULT_TRACKING_CODE } from './constants';

/**
 * The main class for interacting with the Synthetix protocol. The class
 * requires a provider RPC endpoint and a wallet address (or a private key which is used from .env.PRIVATE_KEY)
 *    const sdk = new SynthetixSdk({accountConfig, partnerConfig, pythConfig, rpcConfig});
 *    await sdk.init();
 *
 * The only required parameters for the SDK to initialize are the `chainId` and (`address` or `env.PRIVATE_KEY`).
 * All other parameters are optional and are set to default values if uninitialized.
 *    const accountConfig = { address: '0x' }
 *    const rpcConfig = { chainId: 8453, rpcEndpoint: 'https://https://base-sepolia.g.alchemy.com/v2/ALCHEMY_KEY', preset: 'andromeda'}
 *    const sdk = new SynthetixSdk({accountConfig, rpcConfig })
 *    const markets = await sdk.perps.getMarkets()
 */
export class SynthetixSdk {
  accountConfig: AccountConfig;
  rpcConfig: RpcConfig;

  // Account fields
  accountAddress: Address = ZERO_ADDRESS;

  // Public client should always be defined either using the rpcConfig or using the public endpoint
  publicClient: PublicClient;
  privateKeyAccount?: PrivateKeyAccount;

  // Partner config
  trackingCode: string;
  referrer: string;

  core: Core;
  contracts: Contracts;
  utils: Utils;
  pyth: Pyth;
  perps: Perps;
  spot: Spot;

  constructor({ accountConfig, partnerConfig, pythConfig, rpcConfig }: SdkConfigParams) {
    this.accountConfig = accountConfig;
    this.rpcConfig = rpcConfig;
    this.core = new Core(this);
    this.contracts = new Contracts(this);
    this.utils = new Utils(this);
    this.pyth = new Pyth(this, pythConfig);
    this.perps = new Perps(this);
    this.spot = new Spot(this);

    if (partnerConfig != undefined) {
      this.trackingCode = partnerConfig.trackingCode ?? DEFAULT_TRACKING_CODE;
      this.referrer = partnerConfig.referrer ?? DEFAULT_REFERRER;
    } else {
      this.trackingCode = DEFAULT_TRACKING_CODE;
      this.referrer = DEFAULT_REFERRER;
    }

    /**
     * Initialize Public client to RPC chain rpc
     */

    // Get viem chain for client initialization
    const viemChain = getChain(this.rpcConfig.chainId);
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

  async init() {
    /**
     * Initialize user wallet
     */
    try {
      if (this.accountConfig.privateKeyAccount != undefined) {
        // Set the wallet in SDK if passed
        this.privateKeyAccount = this.accountConfig.privateKeyAccount;
        const address0 = await this.privateKeyAccount.address;
        if (this.accountConfig.address == undefined) {
          this.accountConfig.address = address0;
          console.info('Using address from private key account', address0);
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
          console.info('Using provided address without signer: ', this.accountConfig.address);
        }
      }
      this.accountAddress = this.accountConfig.address as Hex;
    } catch (error) {
      console.log('Error:', error);
      throw error;
    }

    // Initialize Pyth
    await this.pyth.initPyth();

    // Initialize Perps & Spot
    await this.perps.initPerps();
    await this.spot.initSpot();
  }

  public getPublicClient(): PublicClient {
    if (this.publicClient != undefined) {
      return this.publicClient;
    } else {
      throw new Error('PublicClient not initialized');
    }
  }

  /**
   * Executes a transaction from the user wallet.
   * Checks if privateKeyAccount is initialized in the SDK. If uninitialized,
   * it checks process.env PRIVATE_KEY if available. If both are unavailable, the SDK
   * will throw an error
   * @param tx Call parameters for the tx
   * @returns txHash Transaction hash after tx execution
   */
  public async executeTransaction(tx: CallParameters): Promise<string> {
    let account;
    if (this.privateKeyAccount != undefined) {
      account = this.privateKeyAccount;
    } else {
      if (process.env.PRIVATE_KEY != undefined) {
        account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
        this.privateKeyAccount = account;
      } else {
        throw new Error('Signer account not initialized');
      }
    }

    const viemChain = getChain(this.rpcConfig.chainId);
    const wClient = createWalletClient({
      chain: viemChain,
      transport: http(this.rpcConfig.rpcEndpoint),
    });

    const request = await wClient.prepareTransactionRequest({
      account: account,
      to: tx.to,
      data: tx.data,
      value: tx.value,
      gas: 1000000n,
    });

    const serializedTransaction = await wClient.signTransaction(request);
    const txHash = await wClient.sendRawTransaction({ serializedTransaction });
    await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    return txHash;
  }
}
