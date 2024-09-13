import { AccountConfig, PartnerConfig, PythConfig, RpcConfig, SubgraphConfig } from './interface/classConfigs';
import { getPublicRpcEndpoint, getChain, Utils } from './utils';
import { Core } from './core';
import {
  Account,
  Address,
  CallParameters,
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  PublicClient,
  Transaction,
  WalletClient,
  webSocket,
} from 'viem';
import { ipc } from 'viem/node';
import { ZERO_ADDRESS } from './constants/common';
import { Contracts } from './contracts';
import { Pyth } from './pyth';
import { Perps } from './perps';
import { privateKeyToAccount } from 'viem/accounts';
import { Spot } from './spot';
import { DEFAULT_REFERRER, DEFAULT_TRACKING_CODE } from './constants';

export class SynthetixSdk {
  accountConfig: AccountConfig;
  partnerConfig: PartnerConfig;
  pythConfig: PythConfig;
  rpcConfig: RpcConfig;
  subgraphConfig: SubgraphConfig;

  // Account fields
  accountAddress: Address = ZERO_ADDRESS;
  accountIds?: bigint[];
  defaultCoreAccountId?: bigint;
  defaultPerpsAccountId?: bigint;

  // Public client should always be defined either using the rpcConfig or using the public endpoint
  publicClient: PublicClient;
  walletClient?: WalletClient;
  account?: Account;

  // Partner config
  trackingCode: string;
  referrer: string;

  core: Core;
  contracts: Contracts;
  utils: Utils;
  pyth: Pyth;
  perps: Perps;
  spot: Spot;

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
    this.utils = new Utils(this);
    this.pyth = new Pyth(this);
    this.perps = new Perps(this);
    this.spot = new Spot(this);

    this.trackingCode = partnerConfig.trackingCode ?? DEFAULT_TRACKING_CODE;
    this.referrer = partnerConfig.referrer ?? DEFAULT_REFERRER;

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

  async init() {
    /**
     * Initialize Wallet client for users wallet
     */
    try {
      if (this.accountConfig.walletClient != undefined) {
        // Set the wallet in SDK if passed
        this.walletClient = this.accountConfig.walletClient;
        this.account = this.walletClient.account;

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
      this.accountAddress = this.accountConfig.address as Hex;
      this.defaultCoreAccountId =
        process.env.CORE_ACCOUNT_ID == undefined ? undefined : BigInt(process.env.CORE_ACCOUNT_ID);
      this.defaultPerpsAccountId =
        process.env.PERPS_ACCOUNT_ID == undefined ? undefined : BigInt(process.env.PERPS_ACCOUNT_ID);
    } catch (error) {
      console.log('Error:', error);
      throw error;
    }

    // Initialize partner config

    // Initialize Pyth
    await this.pyth.initPyth();

    // Initialize Rpc config

    // Initialize Subgraph config
  }

  public getPublicClient(): PublicClient {
    if (this.publicClient != undefined) {
      return this.publicClient;
    } else {
      throw new Error('PublicClient not initialized');
    }
  }

  public getWalletClient(): WalletClient {
    if (this.walletClient != undefined) {
      return this.walletClient;
    } else {
      throw new Error('Wallet not initialized');
    }
  }

  public async executeTransaction(tx: CallParameters) {
    if (process.env.PRIVATE_KEY != undefined) {
      const viemChain = getChain(this.rpcConfig.chainId);
      const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

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
    } else {
      throw new Error('Invalid account signer');
    }
  }
}
