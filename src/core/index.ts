import { CallParameters, formatEther, Hex, parseUnits, SendTransactionParameters } from 'viem';
import { SynthetixSdk } from '..';
import { ZERO_ADDRESS } from '../constants/common';

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
   * @param address: The address to get accounts for. Uses connected address if not provided.
   * @param defaultAccountId: The default account ID to set after fetching.
   * @returns A list of account IDs owned by the address
   */

  public async getAccountIds(
    address: string | undefined = undefined,
    defaultAccountId: bigint | undefined = undefined,
  ): Promise<bigint[]> {
    const accountAddress: string = address !== undefined ? address : this.sdk.accountAddress || ZERO_ADDRESS;
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
    );

    console.log('accountIds', accountIds);
    this.sdk.accountIds = accountIds as bigint[];
    if (defaultAccountId) {
      this.sdk.defaultAccountId = defaultAccountId;
    } else if (this.sdk.accountIds.length > 0) {
      this.sdk.defaultAccountId = this.sdk.accountIds[0];
    }
    console.log('Using default account id as ', this.sdk.defaultAccountId);
    return accountIds as bigint[];
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
  public async getAvailableCollateral(
    tokenAddress: string,
    accountId: bigint | undefined = undefined,
  ): Promise<string> {
    if (accountId == undefined) {
      console.log('Using default account ID value :', this.sdk.defaultAccountId);
      accountId = this.sdk.defaultAccountId;
    }

    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();

    const availableCollateral = await this.sdk.utils.callErc7412(
      coreProxy.address,
      coreProxy.abi,
      'getAccountAvailableCollateral',
      [accountId, tokenAddress],
    );

    console.log(availableCollateral);
    return formatEther(availableCollateral as bigint);
  }

  public async createAccount(accountId: bigint | undefined = undefined, submit: boolean = false) {
    const txArgs = [];
    if (accountId != undefined) {
      txArgs.push(accountId);
    }

    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();

    const tx: CallParameters = await this.sdk.utils.writeErc7412(
      coreProxy.address,
      coreProxy.abi,
      'createAccount',
      txArgs,
    );

    if (submit) {
      const walletClient = await this.sdk.getWalletClient();
      const txHash = await walletClient?.sendTransaction(tx as SendTransactionParameters);
      console.log('Creating account for ', this.sdk.accountAddress);
      console.log('Create Account tx hash', txHash);

      await this.sdk.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      await this.getAccountIds();
      return txHash;
    } else {
      return tx;
    }
  }

  public async deposit(
    tokenAddress: string,
    amount: number,
    decimals: number = 18,
    accountId: bigint | undefined = undefined,
    submit: boolean = false,
  ) {
    if (accountId == undefined) {
      accountId = this.sdk.defaultAccountId;
    }

    const amountInWei = parseUnits(amount.toString(), decimals);
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();

    const tx: CallParameters = await this.sdk.utils.writeErc7412(coreProxy.address, coreProxy.abi, 'deposit', [
      accountId,
      tokenAddress,
      amountInWei,
    ]);

    if (submit) {
      const walletClient = await this.sdk.getWalletClient();
      const txHash = await walletClient?.sendTransaction(tx as SendTransactionParameters);
      console.log(`Depositing ${amount} for account ${accountId}`);
      console.log('Deposit tx hash', txHash);
      await this.sdk.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      return txHash;
    } else {
      return tx;
    }
  }

  public async withdraw(
    tokenAddress: string,
    amount: number,
    decimals: number = 18,
    accountId: bigint | undefined,
    submit: boolean = false,
  ) {
    if (accountId == undefined) {
      accountId = this.sdk.defaultAccountId;
    }

    const amountInWei = parseUnits(amount.toString(), decimals);
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();

    const tx: CallParameters = await this.sdk.utils.writeErc7412(coreProxy.address, coreProxy.abi, 'withdraw', [
      accountId,
      tokenAddress,
      amountInWei,
    ]);

    if (submit) {
      const walletClient = await this.sdk.getWalletClient();
      const txHash = await walletClient?.sendTransaction(tx as SendTransactionParameters);
      console.log(`Withdrawing ${amount} ${tokenAddress} from account ${accountId}`);
      console.log('Withdraw tx hash', txHash);
      await this.sdk.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      return txHash;
    } else {
      return tx;
    }
  }

  public async delegateCollateral(
    tokenAddress: string,
    amount: number,
    poolId: number,
    leverage: number,
    accountId: bigint | undefined = undefined,
    submit: boolean = false,
  ) {
    if (accountId == undefined) {
      accountId = this.sdk.defaultAccountId;
    }

    const amountInWei = parseUnits(amount.toString(), 18);
    const leverageInWei = parseUnits(leverage.toString(), 18);
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();

    const tx: CallParameters = await this.sdk.utils.writeErc7412(
      coreProxy.address,
      coreProxy.abi,
      'delegateCollateral',
      [accountId, poolId, tokenAddress, amountInWei, leverageInWei],
    );

    if (submit) {
      const walletClient = await this.sdk.getWalletClient();
      const txHash = await walletClient?.sendTransaction(tx as SendTransactionParameters);
      console.log(`Delegating ${amount} ${tokenAddress} to pool id ${poolId} for account ${accountId}`);
      console.log('Delegate tx hash', txHash);
      await this.sdk.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      return txHash;
    } else {
      return tx;
    }
  }

  public async mintUsd(
    tokenAddress: string,
    amount: number,
    poolId: number,
    accountId: bigint | undefined,
    submit: boolean = false,
  ) {
    if (accountId == undefined) {
      accountId = this.sdk.defaultAccountId;
    }

    const amountInWei = parseUnits(amount.toString(), 18);
    const coreProxy = await this.sdk.contracts.getCoreProxyInstance();

    const tx: CallParameters = await this.sdk.utils.writeErc7412(coreProxy.address, coreProxy.abi, 'mintUsd', [
      accountId,
      poolId,
      tokenAddress,
      amountInWei,
    ]);

    if (submit) {
      const walletClient = await this.sdk.getWalletClient();
      const txHash = await walletClient?.sendTransaction(tx as SendTransactionParameters);
      console.log(
        `Minting ${amount} sUSD with ${tokenAddress} collateral against pool id ${poolId} for account ${accountId}`,
      );
      console.log('Mint tx hash', txHash);
      await this.sdk.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      return txHash;
    } else {
      return tx;
    }
  }
}
