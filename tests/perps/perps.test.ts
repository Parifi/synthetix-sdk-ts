import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';
import { MarketSummary, MarketSummaryResponse } from '../../src/perps/interface';
import { Address, formatEther } from 'viem';
import { SynthetixSdk } from '../../src';

describe('Perps', () => {
  let sdk: SynthetixSdk;
  beforeAll(async () => {
    sdk = await getSdkInstanceForTesting();

    // Get accounts for address and sets the default account
    const defaultAddress = process.env.DEFAULT_ADDRESS;
    const accountIds = await sdk.perps.getAccountIds(defaultAddress as Address);
    console.log('Account ids for default account: ', accountIds);

    // await sdk.perps.getMarkets();
  });

  it('should return market data', async () => {
    const response = await sdk.perps.getMarkets();
    console.log('=== response', response);
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
    const allowance = await sdk.spot.getAllowance(marketProxy.address, sdk.accountAddress, 'sUSD');

    if (allowance < amount) {
      const approveTxHash = await sdk.spot.approve({
        targetAddress: marketProxy.address,
        amount: amount,
        marketIdOrName: 'sUSD',
      });
      console.log('Approval txHash:', approveTxHash);
    }

    const tx = await sdk.perps.modifyCollateral({ amount, collateralMarketIdOrName: 'sUSD' }, { submit });
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
    const marketId = 100;
    // const accountId = defaul
    const positionData = await sdk.perps.getOpenPosition(marketId);
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

  it('should pay account debt', async () => {
    const debtTx = await sdk.perps.payDebt();
    console.log('debtTx :', debtTx);
  });

  // Account ID should be marked as liquidatable
  it.skip('should liquidate an account', async () => {
    const liquidateTx = await sdk.perps.liquidate(undefined);
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

  it('should health factor for an account', async () => {
    const accountIdWithOpenPositions = 170141183460469231731687303715884105763n;
    const healthFactor = await sdk.perps.getHealthFactor(accountIdWithOpenPositions);
    console.log('Health factor: ', healthFactor);
    expect(healthFactor).toBeGreaterThan(100);
  });

  it('should create an isolated account order', async () => {
    const initialSusdBalance = await sdk.getSusdBalance();
    const collateralAmount = 70; // 70 usdc.Min 62.5 USD collateral is required
    const submit = false;

    if (initialSusdBalance == 0 || initialSusdBalance < collateralAmount) {
      console.log('USD Token balance of address is less than collateralAmount');
      return;
    }

    const marketProxy = await sdk.contracts.getPerpsMarketProxyInstance();
    const allowance = await sdk.spot.getAllowance(marketProxy.address, sdk.accountAddress, 'sUSD');

    if (allowance < collateralAmount) {
      const approveTxHash = await sdk.spot.approve(
        {
          targetAddress: marketProxy.address,
          amount: collateralAmount,
          marketIdOrName: 'sUSD',
        },
        { submit: true },
      );
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

  it('should return liquidation price for an account', async () => {
    const accountsIds = await sdk.perps.getAccountIds();
    console.log('=== accountsIds', accountsIds);
    const accountId = accountsIds[0];
    const openPosition = await sdk.perps.getOpenPosition('Ethereum', accountId);
    if (openPosition.positionSize == 0) {
      console.log('No open position found for default account id');
      return;
    }
    const marketId = sdk.perps.marketsBySymbol.get('Ethereum')?.marketId ?? 100;
    const { healthFactor, liquidationPrice } = await sdk.perps.getApproxLiquidationPrice(marketId, accountId);
    console.log('liquidationPrice', liquidationPrice);
    console.log('healthFactor', healthFactor);

    expect(liquidationPrice).not.toBe(0);
    expect(healthFactor).toBeGreaterThan(0);
  });

  it('should build an isolated account order', async () => {
    // const initialSusdBalance = await sdk.getSusdBalance();
    const collateralAmount = 20; // 70 usdc.Min 62.5 USD collateral is required
    // const start = Date.now();
    await sdk.init();
    // const end = Date.now();
    // console.log('Time taken to init sdk:', end - start);
    // console.log('=== time taken in seconds', (end - start) / 1000);
    // console.log('=== time taken in minutes', (end - start) / 1000 / 60);
    // const submit = false;

    // if (initialSusdBalance == 0 || initialSusdBalance < collateralAmount) {
    //   console.log('USD Token balance of address is less than collateralAmount');
    //   return;
    // }

    const collateralMarketName = 'sUSDe';
    console.log('=== sdk.spot.marketsByName', sdk.spot.marketsByName);
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
        desiredFillPrice: 3550,
      },
      { useMultiCall: true, useOracleCalls: true, shouldRevertOnTxFailure: false },
    );
    console.log('=== response', response);

    // if (submit) {
    // console.log(`Transaction hash and account details: ${response}`);
    // }
  });

  it('should have fast load time when resolve market name is disabled', async () => {
    const collateralAmount = 20;
    const orderSize = 0.01; // 0.01 ETH

    let timeOptimized = 0,
      timeNormal = 0;

    const sdkConfig: SdkConfigParams = {
      accountConfig: sdk.accountConfig,
      rpcConfig: sdk.rpcConfig,
      pythConfig: {
        pythEndpoint: process.env.PYTH_ENDPOINT,
        username: process.env.PYTH_USERNAME,
        password: process.env.PYTH_PASSWORD,
        cacheTtl: Number(process.env.PYTH_CACHE_TTL),
      },
      defaultConfig: {},
    };

    {
      // SDK build order when resolve market name is set to false
      const defaultConfig: DefaultConfig = { resolveMarketName: false };
      const start = Date.now();

      const sdkWithoutResolvedMarkets = new SynthetixSdk({ ...sdkConfig, defaultConfig });
      await sdkWithoutResolvedMarkets.init();

      const collateralMarketId = 7;
      const marketId = 100;

      const response = await sdkWithoutResolvedMarkets.perps.createIsolatedAccountOrder(
        {
          collateralAmount,
          size: orderSize,
          collateralMarketId,
          marketIdOrName: marketId,
          settlementStrategyId: 0,
          maxPriceImpact: 1,
        },
        { useMultiCall: true, useOracleCalls: true, shouldRevertOnTxFailure: false },
      );
      console.log('=== response', response);

      const end = Date.now();
      timeOptimized = (end - start) / 1000;
      console.log('Time required to process in seconds when resolveMarketNames is false::::::', timeOptimized);
    }

    {
      // SDK build order when resolve market name is set to true
      const defaultConfig: DefaultConfig = { resolveMarketName: true };
      const start = Date.now();

      const sdkWithResolvedMarkets = new SynthetixSdk({ ...sdkConfig, defaultConfig });
      await sdkWithResolvedMarkets.init();

      const collateralMarketName = 'sUSDe';
      const marketName = 'Ethereum';

      const { resolvedMarketId: collateralMarketId, resolvedMarketName } =
        await sdkWithResolvedMarkets.spot.resolveMarket(collateralMarketName);

      const response = await sdkWithResolvedMarkets.perps.createIsolatedAccountOrder(
        {
          collateralAmount,
          size: orderSize,
          collateralMarketId,
          marketIdOrName: marketName,
          settlementStrategyId: 0,
          maxPriceImpact: 1,
        },
        { useMultiCall: true, useOracleCalls: true, shouldRevertOnTxFailure: false },
      );
      console.log('=== response', response);

      const end = Date.now();
      timeNormal = (end - start) / 1000;

      console.log('Time required to process in seconds when resolveMarketNames is true::::::', timeNormal);
    }
    expect(timeOptimized).toBeLessThan(timeNormal);
  });

  it.only('should return market data by name and id when resolveMarketName is set to false', async () => {
    const sdkConfig: SdkConfigParams = {
      accountConfig: sdk.accountConfig,
      rpcConfig: sdk.rpcConfig,
      pythConfig: {
        pythEndpoint: process.env.PYTH_ENDPOINT,
      },
      defaultConfig: { resolveMarketName: false },
    };

    const sdkWithoutResolvedMarkets = new SynthetixSdk(sdkConfig);
    await sdkWithoutResolvedMarkets.init();

    const ethMarket = await sdkWithoutResolvedMarkets.perps.getMarket('Ethereum');
    console.log('ETH Market details using market name: ', ethMarket);

    const btcMarket = await sdkWithoutResolvedMarkets.perps.getMarket(200);
    console.log('BTC Market details using market id: ', btcMarket);
  });

  it('should return supported collaterals', async () => {
    const supportedCollaterals = await sdk.perps.getSupportedCollaterals();
    console.log('Supported collaterals :', supportedCollaterals);
  });

  it('should return pyth price ids from constants', async () => {
    const ETH_PRICE_ID = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';

    const priceIds = sdk.pyth.getPriceIdsFromConstants();
    const ethPriceId = priceIds.get('ETH');
    expect(ethPriceId).toBe(ETH_PRICE_ID);
  });
  
  describe('comparation test', () => {
    const getMarketsummariesOldLogic = async (marketIds: number[]): Promise<MarketSummary[]> => {
      const perpsMarketProxy = await sdk.contracts.getPerpsMarketProxyInstance();

      const interestRate = await sdk.utils.callErc7412({
        contractAddress: perpsMarketProxy.address,
        abi: perpsMarketProxy.abi,
        functionName: 'interestRate',
        args: [],
      });

      const marketSummariesInput = marketIds.map((marketId) => [marketId]);
      const marketSummariesResponse: MarketSummaryResponse[] = (await sdk.utils.multicallErc7412({
        contractAddress: perpsMarketProxy.address,
        abi: perpsMarketProxy.abi,
        functionName: 'getMarketSummary',
        args: marketSummariesInput,
      })) as MarketSummaryResponse[];

      const marketSummaries: MarketSummary[] = [];

      for (const [index, market] of marketSummariesResponse.entries()) {
        const marketId = marketIds[index];

        marketSummaries.push({
          marketId: marketId,
          marketName: (await sdk.perps.getMarket(marketId)).marketName,
          feedId: (await sdk.perps.getMarket(marketId)).feedId,
          indexPrice: Number(formatEther(market.indexPrice)),
          skew: Number(formatEther(market.skew)),
          size: Number(formatEther(market.size)),
          maxOpenInterest: Number(formatEther(market.maxOpenInterest)),
          interestRate: Number(formatEther(interestRate as bigint)),
          currentFundingRate: Number(formatEther(market.currentFundingRate)),
          currentFundingVelocity: Number(formatEther(market.currentFundingVelocity)),
        });
      }
      return marketSummaries;
    };
    const normalizeMartSumaryResponse = (
      marketSummaries: MarketSummary[],
    ): { marketId: number; name: string; feedId: string }[] => {
      return marketSummaries
        .filter((market) => market.marketId && market.marketName && market.feedId)
        .map((market) => {
          return {
            marketId: market.marketId ?? 0,
            name: market.marketName ?? '',
            feedId: market.feedId ?? '',
          };
        });
    };
    test.only("compare old iteration logic with new one's", async () => {
      const marketIds = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

      const startDatemarketSummariesOldLogic = new Date();
      const marketSummariesOldLogic = await getMarketsummariesOldLogic(marketIds);
      const endDatemarketSummariesOldLogic = new Date();
      console.log(
        'Time taken by old logic:',
        endDatemarketSummariesOldLogic.getTime() - startDatemarketSummariesOldLogic.getTime(),
      );

      const startDatemarketSummaries = new Date();
      const marketSummaries = await sdk.perps.getMarketSummaries(marketIds);
      const endDatemarketSummaries = new Date();
      console.log('Time taken by new logic:', endDatemarketSummaries.getTime() - startDatemarketSummaries.getTime());

      expect(JSON.stringify(normalizeMartSumaryResponse(marketSummaries))).toEqual(
        JSON.stringify(normalizeMartSumaryResponse(marketSummariesOldLogic)),
      );
      expect(startDatemarketSummariesOldLogic.getTime() - endDatemarketSummariesOldLogic.getTime()).toBeLessThan(
        startDatemarketSummaries.getTime() - endDatemarketSummaries.getTime(),
      );
    });
  });
});
