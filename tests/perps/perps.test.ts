import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';
import { SynthetixSdk } from '../../src';
import { Address } from 'viem';

describe('Perps', () => {
  let sdk: SynthetixSdk;
  beforeAll(async () => {
    sdk = await getSdkInstanceForTesting();

    // Get accounts for address and sets the default account
    const defaultAddress = process.env.DEFAULT_ADDRESS;
    const accountIds = await sdk.perps.getAccountIds(defaultAddress as Address);
    console.log('Account ids for default account: ', accountIds);

    await sdk.perps.getMarkets();
  });

  it('should return market data', async () => {
    const { marketsById, marketsByName } = await sdk.perps.getMarkets();
    expect(marketsById.size).toBeGreaterThan(0);
    expect(marketsByName.size).toBeGreaterThan(0);
  });

  it('should return settlement strategies data', async () => {
    const settlementStrategyId = 0;
    const marketId = sdk.perps.marketsByName.get('Ethereum')?.marketId ?? 100;
    const settlementStrategy = await sdk.perps.getSettlementStrategy(settlementStrategyId, marketId);
    console.log('settlementStrategy :', settlementStrategy);
  });

  it('should create an account and return the tx hash', async () => {
    const txData = await sdk.perps.createAccount(undefined, { submit: false });
    console.log('Create account tx:', txData);
  });

  it('should return account ids and balance of an address', async () => {
    const accountIds = await sdk.perps.getAccountIds();
    console.info('Account Ids :', accountIds);
  });

  it('should commit an order for settlement', async () => {
    const marketName = 'Ethereum';
    const size = 0.1; // 0.1 ETH;
    const defaultSettlementStrategy = 0;
    const submit = false;
    const tx = await sdk.perps.commitOrder(
      {
        size,
        settlementStrategyId: defaultSettlementStrategy,
        marketIdOrName: marketName,
        // desiredFillPrice: 1,
      },
      { submit },
    );

    if (submit) {
      console.log('Transaction hash: ', tx);
    }
  });

  it('should get margin info', async () => {
    const marginInfo = await sdk.perps.getMarginInfo();
    console.log('marginInfo :', marginInfo);
  });

  it('should add collateral', async () => {
    const initialMarginInfo = (await sdk.perps.getMarginInfo()).totalCollateralValue;
    const initialSusdBalance = await sdk.getSusdBalance();
    const amount = 10; // 10 usdc
    const submit = false;

    if (initialSusdBalance == 0 || initialSusdBalance < amount) {
      console.log('USD Token balance of address is less than amount');
      return;
    }

    const marketProxy = await sdk.contracts.getPerpsMarketProxyInstance();
    const allowance = await sdk.spot.getAllowance(marketProxy.address, sdk.accountAddress, undefined, 'sUSD');

    if (allowance < amount) {
      const approveTxHash = await sdk.spot.approve(marketProxy.address, amount, undefined, 'sUSD', true);
      console.log('Approval txHash:', approveTxHash);
    }

    const tx = await sdk.perps.modifyCollateral({ amount, marketIdOrName: 'sUSD' }, { submit });
    console.log('Add collateral tx: ', tx);

    const marginInfo = (await sdk.perps.getMarginInfo()).totalCollateralValue;

    if (submit) {
      expect(marginInfo).toBeGreaterThan(initialMarginInfo);
    }
  });

  it('should return if an account can be liquidated', async () => {
    const canBeLiquidated = await sdk.perps.getCanLiquidate(undefined);
    console.log('canBeLiquidated :', canBeLiquidated);

    const canLiquidates = await sdk.perps.getCanLiquidates();
    console.log('canLiquidates :', canLiquidates);
  });

  it('should return open position data', async () => {
    const positionData = await sdk.perps.getOpenPosition(100);
    console.log('positionData :', positionData);
  });

  it('should return open position data for multiple markets', async () => {
    const positionsData = await sdk.perps.getOpenPositions(['Ethereum', 'Bitcoin', 'Solana']);
    console.log('positionsData :', positionsData);
  });

  it('should return order quote', async () => {
    const orderQuote = await sdk.perps.getQuote({
      size: 1,
      marketIdOrName: 'Ethereum',
      settlementStrategyId: 0,
      includeRequiredMargin: true,
    });
    console.log('orderQuote :', orderQuote);
  });

  // @todo Function `payDebt` not found for ABI
  it.skip('should pay account debt', async () => {
    const debtTx = await sdk.perps.payDebt();
    console.log('debtTx :', debtTx);
  });

  // Account ID should be marked as liquidatable
  it.skip('should liquidate an account', async () => {
    const liquidateTx = await sdk.perps.liquidate(undefined, { staticCall: true });
    console.log('liquidateTx :', liquidateTx);
  });

  // Account should have a pending order
  it.skip('should settle an order', async () => {
    const settleTx = await sdk.perps.settleOrder();
    console.log('liquidateTx :', settleTx);
  });

  it('should return max market value', async () => {
    const ethMarket = sdk.perps.marketsByName.get('Ethereum');
    const ethMarketId = ethMarket?.marketId ?? 100;

    const maxMarketValue = await sdk.perps.getMaxMarketValues([ethMarketId]);
    console.log(maxMarketValue);
    console.log('ethMarket', ethMarket);
  });

  it('should get pyth price data and prepare oracle call', async () => {
    const marketId = sdk.perps.marketsBySymbol.get('ETH')?.marketId ?? 100;
    const pythData = await sdk.perps.prepareOracleCall([marketId]);
    expect(pythData).not.toBe(undefined);
  });

  it.only('should create an isolated account order', async () => {
    const initialSusdBalance = await sdk.getSusdBalance();
    const collateralAmount = 70; // 70 usdc.Min 62.5 USD collateral is required
    const submit = false;

    if (initialSusdBalance == 0 || initialSusdBalance < collateralAmount) {
      console.log('USD Token balance of address is less than collateralAmount');
      return;
    }

    const marketProxy = await sdk.contracts.getPerpsMarketProxyInstance();
    const allowance = await sdk.spot.getAllowance(marketProxy.address, sdk.accountAddress, undefined, 'sUSD');

    if (allowance < collateralAmount) {
      const approveTxHash = await sdk.spot.approve(marketProxy.address, collateralAmount, undefined, 'sUSD', true);
      console.log('Approval txHash:', approveTxHash);
    }

    const collateralMarketName = 'sUSD';
    const collateralMarketId = sdk.spot.marketsByName.get(collateralMarketName)?.marketId ?? 0;
    const marketName = 'Ethereum';
    const orderSize = 0.01; // 0.01 ETH

    const response = await sdk.perps.createIsolatedAccountOrder(
      {
        collateralAmount,
        size: orderSize,
        collateralMarketId,
        marketIdOrName: marketName,
        settlementStrategyId: 0,
      },
      { submit },
    );

    if (submit) {
      console.log(`Transaction hash and account details: ${response}`);
    }
  });
});
