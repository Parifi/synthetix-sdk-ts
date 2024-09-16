import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';
import { SynthetixSdk } from '../../src';

describe('Perps', () => {
  let sdk: SynthetixSdk;
  beforeAll(async () => {
    sdk = await getSdkInstanceForTesting();

    // Get accounts for address and sets the default account
    const defaultAddress = process.env.DEFAULT_ADDRESS;
    const accountIds = await sdk.perps.getAccountIds(defaultAddress);
    console.log('Account ids for default account: ', accountIds);
  });

  it('should return market data', async () => {
    const { marketsById, marketsByName } = await sdk.perps.getMarkets();
    expect(marketsById.size).toBeGreaterThan(0);
    expect(marketsByName.size).toBeGreaterThan(0);
  });

  it('should return settlement strategies data', async () => {
    const marketId = 200;
    const settlementStrategy = await sdk.perps.getSettlementStrategy(marketId);
    console.log('settlementStrategy :', settlementStrategy);
  });

  it('should create an account and return the tx hash', async () => {
    const txData = await sdk.perps.createAccount(undefined, false);
    console.log('Create account tx:', txData);
  });

  it('should return account ids and balance of an address', async () => {
    const defaultAddress = process.env.DEFAULT_ADDRESS;
    const accountIds = await sdk.perps.getAccountIds(defaultAddress);
    console.info('Account Ids :', accountIds);
  });

  it('should commit an order for settlement', async () => {
    const tx = await sdk.perps.commitOrder(0.001, 0, 100, undefined, undefined, undefined, 1, false);
    console.log(tx);
  });

  it('should test erc7412 call', async () => {
    const canBeLiquidated = await sdk.perps.canLiquidate(undefined);
    console.log('canBeLiquidated :', canBeLiquidated);
  });

  it.only('should get margin info', async () => {
    const canBeLiquidated = await sdk.perps.getMarginInfo(undefined);
    // console.log('canBeLiquidated :', canBeLiquidated);
  });
});
