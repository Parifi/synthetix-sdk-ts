import { getSdkInstanceForTesting } from '..';

describe('Core', () => {
  it('should return response for a get call on Core proxy contract', async () => {
    const sdk = await getSdkInstanceForTesting();
    const res = await sdk.core.getAccountOwner(2);
    console.log('Account owner :', res);
  });

  it('should return USD token address', async () => {
    // const usdTokenAddress = '0x'
    const sdk = await getSdkInstanceForTesting();
    const res = await sdk.core.getUsdToken();
    console.log('Account owner :', res);
  });

  it('should return account balance of an address', async () => {
    const sdk = await getSdkInstanceForTesting();
    const res = await sdk.core.getAccountIds();
    console.log('Account Ids :', res);
  });
});
