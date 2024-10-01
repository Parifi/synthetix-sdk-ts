import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';
import { Address, CallParameters, encodeFunctionData, erc20Abi, formatUnits, getContract, Hex, parseUnits } from 'viem';
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

  it('should wrap sUSDC tokens', async () => {
    const spotMarketProxy = await sdk.contracts.getSpotMarketProxyInstance();
    // const tokenAddress = await sdk.core.getUsdToken();
    const tokenAddress = '0xc43708f8987df3f3681801e5e640667d86ce3c30'; // Temp value for fakeUSDC on base
    const size = 1;
    const sizeInWei = parseUnits(size.toString(), 6);

    const tokenBalance: bigint = (await sdk.utils.callErc7412(tokenAddress, erc20Abi, 'balanceOf', [
      sdk.accountAddress,
    ])) as bigint;
    console.log('Wallet balance: ', formatUnits(tokenBalance, 6));

    if (tokenBalance == BigInt(0) || tokenBalance < sizeInWei) {
      console.log('USD Token balance of address is less than amount');
      return;
    }

    const balanceApproved = (await sdk.utils.callErc7412(tokenAddress, erc20Abi, 'allowance', [
      sdk.accountAddress,
      spotMarketProxy.address,
    ])) as bigint;
    console.log('balanceApproved: ', formatUnits(balanceApproved, 6));

    if (balanceApproved < sizeInWei) {
      const approvalTx: CallParameters = {
        account: sdk.accountAddress,
        to: tokenAddress as Address,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [spotMarketProxy.address, sizeInWei],
        }),
      };
      const approvalHash = await sdk.executeTransaction(approvalTx);
      console.log('Approval txHash:', approvalHash);
    }

    const tx = await sdk.spot.wrap(size, undefined, 'sUSDC', false);
    console.log('Wrap tx data:', tx);
  });

  it.skip('should settle an order', async () => {
    const orderId = 2; // Add a valid order id
    const res = await sdk.spot.settleOrder(orderId, undefined, 'sUSDC');
    console.log('res', res);
  });
});
