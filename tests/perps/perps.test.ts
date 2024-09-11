import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';

describe('Perps', () => {
  it.only('should return market data', async () => {
    const sdk = await getSdkInstanceForTesting();
    const marketIds = await sdk.perps.getMarkets();
    console.log('marketIds :', marketIds);
  });

  it('should test erc7412 call', async () => {
    const sdk = await getSdkInstanceForTesting();
    const accountId: bigint = BigInt(process.env.PERPS_ACCOUNT_ID || '0');
    const canBeLiquidated = await sdk.perps.canLiquidate(accountId);
    console.log('canBeLiquidated :', canBeLiquidated);
  });
});
