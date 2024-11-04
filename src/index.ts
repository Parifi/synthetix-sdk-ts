import { AccountConfig, RpcConfig, SdkConfigParams } from './interface/classConfigs';
import { getPublicRpcEndpoint, getChain, Utils, convertWeiToEther, convertEtherToWei } from './utils';
import { Core } from './core';
import {
  Address,
  CallParameters,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  getContract,
  Hash,
  Hex,
  http,
  maxUint256,
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
export { generateRandomAccountId } from './utils';

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
  protected initialized: boolean = false;

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
    if (this.initialized) return;
    /**
     * Initialize user wallet
     */
    try {
      if (this.accountConfig.privateKeyAccount != undefined) {
        // Set the wallet in SDK if passed
        this.privateKeyAccount = this.accountConfig.privateKeyAccount;
        const address0 = this.privateKeyAccount.address;
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

    // Initialize Perps & Spot & Core
    await this.perps.initPerps();
    await this.spot.initSpot();
    await this.core.initCore();

    this.initialized = true;
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
  public async executeTransaction(tx: CallParameters): Promise<Hash> {
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
      gas: 10000000n,
    });

    const serializedTransaction = await wClient.signTransaction(request);
    const txHash = await wClient.sendRawTransaction({ serializedTransaction });
    await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    return txHash;
  }

  /**
   * Gets current sUSD balance in wallet. Supports only V3 sUSD.
   * @param address Address to check balances for
   */
  public async getSusdBalance(address?: string): Promise<number> {
    if (address == undefined) {
      address = this.accountAddress;
    }

    const susdToken = await this.contracts.getUSDProxyInstance();
    const balance = (await susdToken.read.balanceOf([address])) as bigint;
    return convertWeiToEther(balance);
  }

  /**
   * Gets current ETH balance for the address
   * @param address Address to check balances for
   */
  public async getEthBalance(address?: string) {
    if (address == undefined) {
      address = this.accountAddress;
    }

    const ethBalance = await this.publicClient.getBalance({
      address: address as Hex,
    });
    return convertWeiToEther(ethBalance);
  }

  /**
   *   Approve an address to spend a specified ERC20 token. This is a general
   * implementation that can be used for any ERC20 token. Specify the amount
   * as an ether value, otherwise it will default to the maximum amount
   * For example:
   * const tx = await sdk.approve(tokenAddress,marketProxyAddress,1000)
   * @param tokenAddress address of the token to approve
   * @param targetAddress address to approve to spend the token
   * @param amount amount of the token to approve
   * @param submit submit the transaction if true and return txHash, else return encoded txData
   * @returns If ``submit``, returns a transaction hash. Otherwise, returns the transaction data.
   */
  public async approve(tokenAddress: string, targetAddress: string, amount?: number, submit: boolean = false) {
    const amountInWei = amount == undefined ? maxUint256 : convertEtherToWei(amount);

    const tx: CallParameters = {
      account: this.accountAddress,
      to: tokenAddress as Hex,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [targetAddress as Hex, amountInWei],
      }),
    };

    if (submit) {
      const txHash = await this.executeTransaction(tx);
      console.log('Transaction hash: ', txHash);
      return txHash;
    } else {
      return tx;
    }
  }

  /**
   * Get the allowance for a target address to spend a specified ERC20 token for an owner.
   * This is a general implementation that can be used for any ERC20 token.
   * @param tokenAddress address of the token to check allowance for
   * @param spenderAddress  address to spender of the token
   * @param ownerAddress  address of the token owner. If not specified,
   * the default address is used.
   * @returns The formatted allowance for the target address to spend the token of the owner
   */
  public async getAllowance(tokenAddress: string, spenderAddress: string, ownerAddress?: string): Promise<number> {
    if (ownerAddress == undefined) {
      ownerAddress = this.accountAddress;
    }

    const erc20Token = getContract({
      address: tokenAddress as Hex,
      abi: erc20Abi,
      client: this.publicClient,
    });

    const allowance = (await erc20Token.read.allowance([ownerAddress as Hex, spenderAddress as Hex])) as bigint;
    return convertWeiToEther(allowance);
  }
}
