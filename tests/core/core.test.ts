import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';
import { decodeErrorResult, erc20Abi, getContract, parseUnits } from 'viem';
import { IERC7412Abi } from '../../src/contracts/abis/IERC7412';

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

  it('should withdraw tokens from account', async () => {
    const sdk = await getSdkInstanceForTesting();
    const accountId = sdk.defaultCoreAccountId;
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 5; // 5 USD
    const amountInWei = parseUnits(amount.toString(), 18);
    const coreProxy = await sdk.contracts.getCoreProxyInstance();

    const availableCollateral = await sdk.core.getAvailableCollateral(tokenAddress, accountId);
    const collateralInWei = parseUnits(availableCollateral, 18);

    if (amountInWei >= collateralInWei) {
      console.log('Available collateral not available, unable to withdraw');
      return;
    } else {
      const tx = await sdk.core.withdraw(tokenAddress, amount, 18, accountId, true);
      console.log('Withdraw tx data:', tx);
    }
  });

  it.skip('should delegate account collateral to a pool', async () => {
    const sdk = await getSdkInstanceForTesting();
    const accountId = sdk.defaultCoreAccountId;
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 60; // 5 usd
    const poolId = await sdk.core.getPreferredPool();
    console.log('Preferred pool id :', poolId);
    const leverage = 1; // 1x leverage

    const txHash = await sdk.core.delegateCollateral(tokenAddress, amount, poolId, leverage, accountId, false);
    console.log('Delegate txHash:', txHash);
  });

  it.skip('should mint USD tokens', async () => {
    const sdk = await getSdkInstanceForTesting();
    const coreProxy = await sdk.contracts.getCoreProxyInstance();
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 5; // 5 usd
    const poolId = await sdk.core.getPreferredPool();
    console.log('Preferred pool id :', poolId);

    const txHash = await sdk.core.mintUsd(tokenAddress, amount, poolId, undefined, false);
    console.log('Create account txHash:', txHash);
  });
});
