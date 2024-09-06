import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';

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
    const TEST_ADDRESS = '0xf4bb53eFcFd49Fe036FdCc8F46D981203ae3BAB8';
    const accountIds = await sdk.core.getAccountIds(TEST_ADDRESS);
    console.info('Account Ids :', accountIds);
  });

  it('should return available collateral of an account', async () => {
    const sdk = await getSdkInstanceForTesting();
    const tokenAddress = await sdk.core.getUsdToken();
    const accountId = 170141183460469231731687303715884106496n;
    const availableCollateral = await sdk.core.getAvailableCollateral(tokenAddress, accountId);

    console.info('getAvailableCollateral :', availableCollateral);
  });

  it('should create an account and return the tx hash', async () => {
    const sdk = await getSdkInstanceForTesting();
    const txHash = await sdk.core.createAccount(undefined, true);
    console.log('Create account txHash:', txHash);
  });

  it.skip('should deposit tokens to account', async () => {
    const accountId = 170141183460469231731687303715884106040n
    const sdk = await getSdkInstanceForTesting();
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 100; // 100 USD
    const txHash = await sdk.core.deposit(tokenAddress, amount, 18);
    console.log('Deposit txHash:', txHash);
  });

  it.skip('should withdraw tokens from account', async () => {
    const sdk = await getSdkInstanceForTesting();
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 50; // 100 USD

    const txHash = await sdk.core.deposit(tokenAddress, amount, 18);
    console.log('Withdraw txHash:', txHash);
  });

  it.skip('should delegate account collateral to a pool', async () => {
    const sdk = await getSdkInstanceForTesting();
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 50;
    const poolId = 100;
    const leverage = 2;

    const txHash = await sdk.core.delegateCollateral(tokenAddress, amount, poolId, leverage);
    console.log('Delegate txHash:', txHash);
  });

  it.skip('should mint USD tokens', async () => {
    const sdk = await getSdkInstanceForTesting();
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 50;
    const poolId = 100;

    const txHash = await sdk.core.mintUsd(tokenAddress, amount, poolId);
    console.log('Create account txHash:', txHash);
  });
});
