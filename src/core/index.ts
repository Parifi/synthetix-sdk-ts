import { Address, CallParameters, formatEther, Hex, parseUnits } from 'viem';
import { SynthetixSdk } from '..';
import { ZERO_ADDRESS } from '../constants/common';
import { CoreRepository } from '../interface/Core';
import { OverrideParamsWrite } from '../interface/commonTypes';

/**
 * Class for interacting with Synthetix V3 core contracts
 * @remarks
 *
 */
export class Core implements CoreRepository {
  sdk: SynthetixSdk;
  defaultAccountId?: bigint;
  accountIds: bigint[];

  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
    this.accountIds = [];
  }

  /**
   * Returns the Owner wallet address for an account ID
   * @param accountId - Account ID
   * @returns string - Address of the account owning the accountId
   */
  public async getAccountOwner(accountId: number): Promise<Hex> {
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();
    const response = await this.sdk.utils.callErc7412(coreProxy.address, coreProxy.abi, 'getAccountOwner', [accountId]);

    console.log(`Core account Owner for id ${accountId} is ${response}`);
    return response as Hex;
  }

  /**
   * Get the address of the USD stablecoin token
   *
   * @returns Address of the USD stablecoin token
   */
  public async getUsdToken(): Promise<Hex> {
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();
    const response = await this.sdk.utils.callErc7412(coreProxy.address, coreProxy.abi, 'getUsdToken', []);

    console.log('USD Token address: ', response);
    return response as Hex;
  }

  /**
   *  Get the core account IDs owned by an address.
   *  Fetches the account IDs for the given address by checking the balance of
   *  the AccountProxy contract, which is an NFT owned by the address.
   *  If no address is provided, uses the connected wallet address.
   * @param address The address to get accounts for. Uses connected address if not provided.
   * @param defaultAccountId The default account ID to set after fetching.
   * @returns A list of account IDs owned by the address
   */

  public async getAccountIds({
    address: accountAddress = this.sdk.accountAddress || ZERO_ADDRESS,
    accountId: defaultAccountId = undefined,
  }: {
    address?: string;
    accountId?: bigint;
  } = {}): Promise<bigint[]> {
    // const accountAddress: string = address !== undefined ? address : this.sdk.accountAddress || ZERO_ADDRESS;
    if (accountAddress == ZERO_ADDRESS) {
      throw new Error('Invalid address');
    }

    const accountProxy = await this.sdk.contracts.getAccountProxyInstance();
    const balance = await accountProxy.read.balanceOf([accountAddress]);
    console.log('balance', balance);

    const argsList = [];

    for (let index = 0; index < Number(balance); index++) {
      argsList.push([accountAddress, index]);
    }
    const accountIds = await this.sdk.utils.multicallErc7412(
      accountProxy.address,
      accountProxy.abi,
      'tokenOfOwnerByIndex',
      argsList,
    ) as unknown[] as bigint[];

    // Set Core account ids
    this.accountIds = accountIds;

    console.log('accountIds', accountIds);
    if (defaultAccountId) {
      this.defaultAccountId = defaultAccountId;
    } else if (this.accountIds.length > 0) {
      this.defaultAccountId = this.accountIds[0];
      console.log('Using default account id as ', this.defaultAccountId);
    }
    return accountIds;
  }

  /**
   * Get the available collateral for an account for a specified collateral type
   * of ``token_address``
   * Fetches the amount of undelegated collateral available for withdrawal
   * for a given token and account.
   * @param tokenAddress The address of the collateral token
   * @param accountId The ID of the account to check. Uses default if not provided.
   * @returns The available collateral as an ether value.
   */
  public async getAvailableCollateral({
    tokenAddress,
    accountId = this.defaultAccountId,
  }: {
    tokenAddress: Address;
    accountId?: bigint;
  }): Promise<string> {
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();

    const availableCollateral = await this.sdk.utils.callErc7412(
      coreProxy.address,
      coreProxy.abi,
      'getAccountAvailableCollateral',
      [accountId, tokenAddress],
    );

    return formatEther(availableCollateral as bigint);
  }

  /**
   * Retrieves the unique system preferred pool
   * @returns poolId The id of the pool that is currently set as preferred in the system.
   */
  public async getPreferredPool(): Promise<bigint> {
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();

    const preferredPool = await this.sdk.utils.callErc7412(coreProxy.address, coreProxy.abi, 'getPreferredPool', []);

    console.log(preferredPool);
    return preferredPool as bigint;
  }

  public async createAccount(
    accountId?: bigint,
    override: OverrideParamsWrite = { submit: false, shouldRevertOnTxFailure: false },
  ) {
    const txArgs = [];
    if (accountId != undefined) {
      txArgs.push(accountId);
    }

    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();
    const tx: CallParameters = await this.sdk.utils.writeErc7412(
      {
        contractAddress: coreProxy.address,
        abi: coreProxy.abi,
        functionName: 'createAccount',
        args: txArgs,
      },
      override,
    );

    if (!override.submit) return tx;

    const txHash = await this.sdk.executeTransaction(tx);
    console.log('Transaction hash: ', txHash);
    await this.getAccountIds();
    return txHash;
  }

  public async deposit(
    {
      tokenAddress,
      amount,
      decimals = 18,
      accountId = this.defaultAccountId,
    }: {
      tokenAddress: string;
      amount: number;
      decimals: number;
      accountId?: bigint;
    },
    override: OverrideParamsWrite = { submit: false, shouldRevertOnTxFailure: false },
  ) {
    const amountInWei = parseUnits(amount.toString(), decimals);
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();

    const tx: CallParameters = await this.sdk.utils.writeErc7412(
      {
        contractAddress: coreProxy.address,
        abi: coreProxy.abi,
        functionName: 'deposit',
        args: [accountId, tokenAddress, amountInWei],
      },
      override,
    );

    if (override.submit) {
      const txHash = await this.sdk.executeTransaction(tx);
      console.log('Deposit tx hash', txHash);
      return txHash;
    } else {
      return tx;
    }
  }

  public async withdraw(
    {
      tokenAddress,
      amount,
      decimals = 18,
      accountId = this.defaultAccountId,
    }: {
      tokenAddress: string;
      amount: number;
      decimals: number;
      accountId?: bigint;
    },
    override: OverrideParamsWrite = { submit: false, shouldRevertOnTxFailure: false },
  ) {
    if (accountId == undefined) {
      accountId = this.defaultAccountId;
    }

    const amountInWei = parseUnits(amount.toString(), decimals);
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();

    const tx: CallParameters = await this.sdk.utils.writeErc7412(
      {
        contractAddress: coreProxy.address,
        abi: coreProxy.abi,
        functionName: 'withdraw',
        args: [accountId, tokenAddress, amountInWei],
      },
      override,
    );

    if (override.submit) {
      console.log(`Withdrawing ${amount} ${tokenAddress} from account ${accountId}`);
      const txHash = await this.sdk.executeTransaction(tx);
      console.log('Withdraw tx hash', txHash);
      return txHash;
    } else {
      return tx;
    }
  }

  public async delegateCollateral(
    {
      tokenAddress,
      amount,
      poolId,
      leverage,
      accountId = this.defaultAccountId,
    }: {
      tokenAddress: string;
      amount: number;
      poolId: bigint;
      leverage: number;
      accountId?: bigint;
    },
    override: OverrideParamsWrite = { submit: false, shouldRevertOnTxFailure: false },
  ) {
    const amountInWei = parseUnits(amount.toString(), 18);
    const leverageInWei = parseUnits(leverage.toString(), 18);
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();

    const tx: CallParameters = await this.sdk.utils.writeErc7412(
      {
        contractAddress: coreProxy.address,
        abi: coreProxy.abi,
        functionName: 'delegateCollateral',
        args: [accountId, poolId, tokenAddress, amountInWei, leverageInWei],
      },
      override,
    );

    if (!override.submit) return tx;

    console.log(`Delegating ${amount} ${tokenAddress} to pool id ${poolId} for account ${accountId}`);
    const txHash = await this.sdk.executeTransaction(tx);
    console.log('Delegate tx hash', txHash);

    return txHash;
  }

  public async mintUsd(
    {
      tokenAddress,
      amount,
      poolId,
      accountId = this.defaultAccountId,
    }: {
      tokenAddress: Address;
      amount: number;
      poolId: bigint;
      accountId?: bigint;
    },
    override: OverrideParamsWrite = { submit: false, shouldRevertOnTxFailure: false },
  ) {
    const amountInWei = parseUnits(amount.toString(), 18);
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();

    const tx: CallParameters = await this.sdk.utils.writeErc7412(
      {
        contractAddress: coreProxy.address,
        abi: coreProxy.abi,
        functionName: 'mintUsd',
        args: [accountId, poolId, tokenAddress, amountInWei],
      },
      override,
    );

    if (!override.submit) return tx;
    console.log(
      `Minting ${amount} sUSD with ${tokenAddress} collateral against pool id ${poolId} for account ${accountId}`,
    );
    const txHash = await this.sdk.executeTransaction(tx);
    console.log('Mint tx hash', txHash);
    return txHash;
  }
}
