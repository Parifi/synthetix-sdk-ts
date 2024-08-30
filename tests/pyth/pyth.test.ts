import { getSdkInstanceForTesting } from '..';

describe('Pyth', () => {
  it('should return price update data for ETH price id', async () => {
    const sdk = await getSdkInstanceForTesting();
    const ETH_PRICE_ID = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';
    const priceUpdateData = await sdk.pyth.getVaaPriceUpdateData([ETH_PRICE_ID]);
    console.log('Price Update data :', priceUpdateData);
  });
});
