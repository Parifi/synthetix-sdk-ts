import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';

describe('Perps', () => {
  it('should return market data', async () => {
    const sdk = await getSdkInstanceForTesting();
    const { marketsById, marketsByName } = await sdk.perps.getMarkets();
    console.log('Final markets by marketsById', marketsById);
    console.log('Final markets by marketsByName', marketsByName);
  });

  it('should return settlement strategies data', async () => {
    const sdk = await getSdkInstanceForTesting();
    const marketId = 200;
    const settlementStrategy = await sdk.perps.getSettlementStrategy(marketId);
    console.log('settlementStrategy :', settlementStrategy);
  });

  it('should test erc7412 call', async () => {
    const sdk = await getSdkInstanceForTesting();
    const accountId: bigint = BigInt(process.env.PERPS_ACCOUNT_ID || '0');
    const canBeLiquidated = await sdk.perps.canLiquidate(accountId);
    console.log('canBeLiquidated :', canBeLiquidated);
  });
});
