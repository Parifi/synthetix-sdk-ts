import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';

describe('Perps', () => {
  it('should test erc7412 call', async () => {
    const sdk = await getSdkInstanceForTesting();
    const accountId: bigint = BigInt(process.env.PERPS_ACCOUNT_ID || '0');
    const canBeLiquidated = await sdk.perps.canLiquidate(accountId);
    console.log('canBeLiquidated :', canBeLiquidated);
  });
});
