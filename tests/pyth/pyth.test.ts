import { getSdkInstanceForTesting } from '..';
import { SynthetixSdk } from '../../src';

describe('Pyth', () => {
  let sdk: SynthetixSdk;
  const ETH_PRICE_ID = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';
  beforeAll(async () => {
    sdk = await getSdkInstanceForTesting();

    // Get accounts for address and sets the default account
    const defaultAddress = process.env.DEFAULT_ADDRESS;
    const accountIds = await sdk.perps.getAccountIds(defaultAddress);
    console.log('Account ids for default account: ', accountIds);
    await sdk.perps.getMarkets();
  });

  it('should return price update data for ETH price id', async () => {
    const updateData = await sdk.pyth.getPriceFeedsUpdateData([ETH_PRICE_ID]);
    expect(updateData.length).toBeGreaterThan(0);
  });

  it('should get pyth price data', async () => {
    const priceData = await sdk.pyth.getPriceFromIds([ETH_PRICE_ID]);
    expect(priceData).not.toBe(undefined);
  });

  it('should get formatted price using feedId', async () => {
    const tokenPrice = await sdk.pyth.getFormattedPrice(ETH_PRICE_ID);
    expect(tokenPrice).not.toBe(undefined);
    console.log(tokenPrice);
  });

  it('should get benchmark price update data', async () => {
    const priceIds = [ETH_PRICE_ID];
    const publishTime = Math.floor(Date.now() / 1000) - 864000; // Price from 10 days ago
    const res = await sdk.pyth.getVaaPriceUpdateData(priceIds, publishTime);
    expect(res.length > 0);
  });
});
