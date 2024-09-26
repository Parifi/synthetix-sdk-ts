import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';
import { SynthetixSdk } from '../../src';
import { CallParameters, encodeFunctionData, erc20Abi, parseUnits } from 'viem';

describe('Perps', () => {
  let sdk: SynthetixSdk;
  beforeAll(async () => {
    sdk = await getSdkInstanceForTesting();

    // Get accounts for address and sets the default account
    const defaultAddress = process.env.DEFAULT_ADDRESS;
    const accountIds = await sdk.perps.getAccountIds(defaultAddress);
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
    const marketId = 1600;
    const settlementStrategy = await sdk.perps.getSettlementStrategy(settlementStrategyId, marketId);
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

  it('should get margin info', async () => {
    const marginInfo = await sdk.perps.getMarginInfo(undefined);
    console.log('marginInfo :', marginInfo);
  });

  it('should add collateral', async () => {
    // const tokenAddress = await sdk.core.getUsdToken();
    const marketProxy = await sdk.contracts.getPerpsMarketProxyInstance();
    const tokenAddress = '0x8069c44244e72443722cfb22dce5492cba239d39'; // For base sepolia susdc

    const tokenBalance: bigint = (await sdk.utils.callErc7412(tokenAddress, erc20Abi, 'balanceOf', [
      sdk.accountAddress,
    ])) as bigint;

    const spenderAddress = '0x0df5bb521adbf0db1fedc39973a82075df2d8730';
    console.log('tokenBalance', tokenBalance);
    const amount = 10; // 10 usdc
    const amountInWei = parseUnits(amount.toString(), 6);

    if (tokenBalance == BigInt(0) || tokenBalance < amountInWei) {
      console.log('USD Token balance of address is less than amount');
      return;
    }

    const balanceApproved = (await sdk.utils.callErc7412(tokenAddress, erc20Abi, 'allowance', [
      sdk.accountAddress,
      spenderAddress,
    ])) as bigint;

    console.log('balanceApproved', balanceApproved);

    if (balanceApproved < amountInWei) {
      const approvalTx: CallParameters = {
        account: sdk.accountAddress,
        to: tokenAddress,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [spenderAddress, amountInWei],
        }),
      };
      const approvalHash = await sdk.executeTransaction(approvalTx);
      console.log('Approval txHash:', approvalHash);
    }
    const tx = await sdk.perps.modifyCollateral(amount, 0);
    console.log('Add collateral tx: ', tx);

    const marginInfo = await sdk.perps.getMarginInfo();
    console.log('marginInfo :', marginInfo);
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
    const positionsData = await sdk.perps.getOpenPositions(undefined, ['Ethereum', 'Bitcoin', 'Synthetix', 'Solana']);
    console.log('positionsData :', positionsData);
  });

  it('should return order quote', async () => {
    const orderQuote = await sdk.perps.getQuote(1, undefined, undefined, 'Ethereum', undefined, 0, true);
    console.log('orderQuote :', orderQuote);
  });

  // @todo Function `payDebt` not found for ABI
  it.skip('should pay account debt', async () => {
    const debtTx = await sdk.perps.payDebt();
    console.log('debtTx :', debtTx);
  });

  // Account ID should be marked as liquidatable
  it.skip('should liquidate an account', async () => {
    const liquidateTx = await sdk.perps.liquidate(undefined, false, true);
    console.log('liquidateTx :', liquidateTx);
  });

  // Account should have a pending order
  it.skip('should settle an order', async () => {
    const settleTx = await sdk.perps.settleOrder();
    console.log('liquidateTx :', settleTx);
  });

  it('should get pyth price data and prepare oracle call', async () => {
    const marketId = sdk.perps.marketsBySymbol.get('ETH')?.marketId ?? 100;
    const pythData = await sdk.perps.prepareOracleCall([marketId]);
    expect(pythData).not.toBe(undefined);
  });

  it.skip('should create an isolated account order', async () => {
    const collateralAmount = 10; // 10 USDC
    const collateralMarketId = 0; // sUSDC
    const marketName = 'Ethereum';
    const orderSize = 0.01; // 0.01 ETH

    const tx = await sdk.perps.createIsolatedAccountOrder(
      collateralAmount,
      collateralMarketId,
      orderSize,
      undefined,
      marketName,
    );
    console.log(tx);
  });
});
