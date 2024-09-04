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
    const TEST_ADDRESS = '0xDf29B49eDE0289ba00a507E900552C46deed0DAc';
    const accountIds = await sdk.core.getAccountIds(TEST_ADDRESS);
    console.info('Account Ids :', accountIds);
  });

  it('should return available collateral of an address', async () => {
    const sdk = await getSdkInstanceForTesting();
    // const tokenAddress = await sdk.core.getUsdToken();
    const tokenAddress = '0x09d51516F38980035153a554c26Df3C6f51a23C3';
    const accountId = 170141183460469231731687303715884106040n;
    const availableCollateral = await sdk.core.getAvailableCollateral(tokenAddress, accountId);

    console.info('getAvailableCollateral :', availableCollateral);
  });

  it.only('should create an account and return the tx hash', async () => {
    const sdk = await getSdkInstanceForTesting();
    const txHash = await sdk.core.createAccount(undefined, true);
    console.log('Create account txHash:', txHash);
  });

  it('should deposit tokens to account', async () => {
    const sdk = await getSdkInstanceForTesting();
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 100; // 100 USD
    const txHash = await sdk.core.deposit(tokenAddress, amount, 18, undefined, true);
    console.log('Deposit txHash:', txHash);
  });

  it('should withdraw tokens from account', async () => {
    const sdk = await getSdkInstanceForTesting();
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 50; // 100 USD

    const txHash = await sdk.core.deposit(tokenAddress, amount, 18, undefined, true);
    console.log('Withdraw txHash:', txHash);
  });

  it('should delegate account collateral to a pool', async () => {
    const sdk = await getSdkInstanceForTesting();
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 50;
    const poolId = 100;
    const leverage = 2;

    const txHash = await sdk.core.delegateCollateral(tokenAddress, amount, poolId, leverage, undefined, true);
    console.log('Delegate txHash:', txHash);
  });

  it('should mint USD tokens', async () => {
    const sdk = await getSdkInstanceForTesting();
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 50;
    const poolId = 100;

    const txHash = await sdk.core.mintUsd(tokenAddress, amount, poolId, undefined, true);
    console.log('Create account txHash:', txHash);
  });
});
