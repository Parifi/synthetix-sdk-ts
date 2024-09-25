import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';
import { Address, CallParameters, encodeFunctionData, erc20Abi, formatUnits, parseUnits } from 'viem';
import { SynthetixSdk } from '../../src';
import { Side } from '../../src/spot/interface';
import { convertWeiToEther } from '../../src/utils';

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
    const marketId = sdk.spot.marketsByName.get('sUSDC')?.marketId;
    const res = await sdk.spot.getSettlementStrategy(settlementStrategyId, marketId);
    console.log('res', res);
  });

  it.skip('should return order details', async () => {
    // Pass a valid order id
    const orderId = 0;
    const res = await sdk.spot.getOrder(orderId, 1);
    console.log('res', res);
  });

  it.skip('should execute an atomic order', async () => {
    const res = await sdk.spot.atomicOrder(Side.BUY, 10, 0.01, undefined, undefined, 'sUSDC', false);
    console.log('res', res);
  });

  it.only('should wrap sUSDC tokens', async () => {
    const spotMarketProxy = await sdk.contracts.getSpotMarketProxyInstance();
    const submit = false;
    let tokenAddress;

    if (sdk.rpcConfig.chainId == 84532) {
      tokenAddress = '0xc43708f8987df3f3681801e5e640667d86ce3c30'; // Temp value for fakeUSDC on base
    } else if (sdk.rpcConfig.chainId == 421614) {
      tokenAddress = '0x';
      return;
    } else {
      console.log('TODO: Add logic for token address on other chains.... skipping test case');
      return;
    }

    const size = 1;
    const initialBalance = await sdk.spot.getBalance(undefined, undefined, 'sUSDC');

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

    const tx = await sdk.spot.wrap(size, undefined, 'sUSDC', false);
    if (submit) {
      console.log('Wrap tx data:', tx);
      const updatedBalance = await sdk.spot.getBalance(undefined, undefined, 'sUSDC');
      expect(updatedBalance).toBeGreaterThan(initialBalance);
    }
  });

  it.skip('should settle an order', async () => {
    const orderId = 2; // Add a valid order id
    const res = await sdk.spot.settleOrder(orderId, undefined, 'sUSDC');
    console.log('res', res);
  });
});
