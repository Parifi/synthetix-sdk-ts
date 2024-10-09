import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';
import { erc20Abi, formatUnits, getContract, Hex } from 'viem';
import { SynthetixSdk } from '../../src';
import { Side } from '../../src/spot/interface';

describe('Spot', () => {
  let sdk: SynthetixSdk;
  beforeAll(async () => {
    sdk = await getSdkInstanceForTesting();

    const { marketsById, marketsByName } = await sdk.spot.getMarkets();
    expect(marketsById.size).toBeGreaterThan(0);
    expect(marketsByName.size).toBeGreaterThan(0);
  });

  it('should return response for a get call on Core proxy contract', async () => {
    const res = await sdk.core.getAccountOwner(2);
    console.info('Account owner :', res);
  });

  it('should return markets', async () => {
    const { marketsById, marketsByName } = await sdk.spot.getMarkets();
    expect(marketsById.size).toBeGreaterThan(0);
    expect(marketsByName.size).toBeGreaterThan(0);

    console.log('marketsById', marketsById);
    console.log('marketsByName', marketsByName);
  });

  it.skip('should return settlement strategy', async () => {
    //Check for a valid settlement strategy and pass
    const settlementStrategyId = 0;
    const marketId = sdk.spot.marketsByName.get('sUSDC')!.marketId;
    const res = await sdk.spot.getSettlementStrategy({ settlementStrategyId, marketIdOrName: marketId });
    console.log('res', res);
    expect(typeof res).toBe('object');
  });

  it.skip('should return order details', async () => {
    // Pass a valid order id
    const orderId = 0;
    const res = await sdk.spot.getOrder({ asyncOrderId: orderId, marketIdOrName: 1 });
    console.log('res', res);
    expect(typeof res).toBe('object');
  });

  it.skip('should execute an atomic order', async () => {
    const res = await sdk.spot.atomicOrder(
      { side: Side.BUY, size: 10, slippageTolerance: 0.01, marketIdOrName: 'sUSDC' },
      { submit: false },
    );

    expect(typeof res).toBe('object');
  });

  it.only('should wrap sUSDC tokens', async () => {
    const spotMarketProxy = await sdk.contracts.getSpotMarketProxyInstance();
    const submit = false;
    let tokenAddress = '0x';

    // TODO: create a object {[chainId]: tokenAddress} for all chains
    // in order to do address = object[chainId]; if(!address) return
    if (sdk.rpcConfig.chainId == 84532) {
      tokenAddress = '0xc43708f8987df3f3681801e5e640667d86ce3c30'; // Temp value for fakeUSDC on base
    }
    // TODO: Add logic for other chains
    if (tokenAddress == '0x') return;

    const size = 1;
    const initialBalance = await sdk.spot.getBalance(undefined, 'sUSDC');

    const fakeUSDC = getContract({
      address: tokenAddress as Hex,
      abi: erc20Abi,
      client: sdk.publicClient,
    });

    const tokenBalance = Number(formatUnits(await fakeUSDC.read.balanceOf([sdk.accountAddress]), 6));
    console.log('Wallet balance: ', tokenBalance);

    if (tokenBalance == 0 || tokenBalance < size) {
      console.log('USD Token balance of address is less than amount');
      return;
    }

    const allowance = await sdk.getAllowance(tokenAddress, spotMarketProxy.address, sdk.accountAddress);
    if (allowance < size) {
      const approveTxHash = await sdk.approve(tokenAddress, spotMarketProxy.address, size, true);
      console.log('Approval txHash:', approveTxHash);
    }

    const tx = await sdk.spot.wrap({ size, marketIdOrName: 'sUSDC' });
    if (submit) {
      console.log('Wrap tx data:', tx);
      const updatedBalance = await sdk.spot.getBalance(undefined, 'sUSDC');
      expect(updatedBalance).toBeGreaterThan(initialBalance);
    }
  });

  it.skip('should settle an order', async () => {
    const orderId = 2; // Add a valid order id
    const res = await sdk.spot.settleOrder({ asyncOrderId: orderId, marketIdOrName: 'sUSDC' });
    console.log('res', res);
  });
});
