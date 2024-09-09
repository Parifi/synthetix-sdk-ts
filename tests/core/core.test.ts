import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';
import { erc20Abi, getContract, parseUnits } from 'viem';

describe('Core', () => {
  it('should return response for a get call on Core proxy contract', async () => {
    const sdk = await getSdkInstanceForTesting();
    const res = await sdk.core.getAccountOwner(2);
    console.info('Account owner :', res);
  });

  it('should return USD token address', async () => {
    // const usdTokenAddress = '0x'
    const sdk = await getSdkInstanceForTesting();
    const res = await sdk.core.getUsdToken();
    console.info('usdTokenAddress :', res);
  });

  it('should return account ids and balance of an address', async () => {
    const sdk = await getSdkInstanceForTesting();
    const defaultAddress = process.env.DEFAULT_ADDRESS;
    const accountIds = await sdk.core.getAccountIds(defaultAddress);
    console.info('Account Ids :', accountIds);
  });

  it('should return available collateral of an account', async () => {
    const sdk = await getSdkInstanceForTesting();
    const tokenAddress = await sdk.core.getUsdToken();
    const accountId = sdk.defaultCoreAccountId;
    const availableCollateral = await sdk.core.getAvailableCollateral(tokenAddress, accountId);

    console.info('getAvailableCollateral :', availableCollateral);
  });

  it('should create an account and return the tx hash', async () => {
    const sdk = await getSdkInstanceForTesting();
    const txHash = await sdk.core.createAccount(undefined, false);
    console.log('Create account txHash:', txHash);
  });

  it('should deposit tokens to account', async () => {
    const sdk = await getSdkInstanceForTesting();
    const accountId = sdk.defaultCoreAccountId;
    const tokenAddress = await sdk.core.getUsdToken();
    const tokenBalance: bigint = (await sdk.utils.callErc7412(tokenAddress, erc20Abi, 'balanceOf', [
      sdk.accountAddress,
    ])) as bigint;
    const coreProxy = await sdk.contracts.getCoreProxyInstance();
    const amount = 100; // 100 USD
    const amountInWei = parseUnits(amount.toString(), 18);

    if (tokenBalance == BigInt(0)) {
      console.log('USD Token balance of address is 0, unable to mint');
      return;
    }

    if (tokenBalance < amountInWei) {
      console.log('USD Token balance of address is less than amount');
      return;
    }

    const balanceApproved = (await sdk.utils.callErc7412(tokenAddress, erc20Abi, 'allowance', [
      sdk.accountAddress,
      coreProxy.address,
    ])) as bigint;

    if (balanceApproved < amountInWei) {
      const approvalTx = await sdk.utils.writeErc7412(tokenAddress, erc20Abi, 'approve', [
        coreProxy.address,
        amountInWei,
      ]);
      const approvalHash = await sdk.executeTransaction(approvalTx);
      console.log('Approval txHash:', approvalHash);
    }
    const tx = await sdk.core.deposit(tokenAddress, amount, 18, accountId, false);
    console.log('Deposit tx data:', tx);
  });

  it.skip('should withdraw tokens from account', async () => {
    const sdk = await getSdkInstanceForTesting();
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 50; // 100 USD

    const txHash = await sdk.core.deposit(tokenAddress, amount, 18, undefined, false);
    console.log('Withdraw txHash:', txHash);
  });

  it.skip('should delegate account collateral to a pool', async () => {
    const sdk = await getSdkInstanceForTesting();
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 50;
    const poolId = 100;
    const leverage = 2;

    const txHash = await sdk.core.delegateCollateral(tokenAddress, amount, poolId, leverage, undefined, false);
    console.log('Delegate txHash:', txHash);
  });

  it.skip('should mint USD tokens', async () => {
    const sdk = await getSdkInstanceForTesting();
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 50;
    const poolId = 100;

    const txHash = await sdk.core.mintUsd(tokenAddress, amount, poolId, undefined, false);
    console.log('Create account txHash:', txHash);
  });
});
