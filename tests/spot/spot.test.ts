import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';
import { Address, CallParameters, encodeFunctionData, erc20Abi, formatUnits, getContract, Hex, parseUnits } from 'viem';
import { IERC7412Abi } from '../../src/contracts/abis/IERC7412';
import { SynthetixSdk } from '../../src';

describe('Spot', () => {
  let sdk: SynthetixSdk;
  beforeAll(async () => {
    sdk = await getSdkInstanceForTesting();

    // Get accounts for address and sets the default account
    const defaultAddress = process.env.DEFAULT_ADDRESS;
    const accountIds = await sdk.perps.getAccountIds(defaultAddress);
    console.log('Account ids for default account: ', accountIds);
  });

  it('should return response for a get call on Core proxy contract', async () => {
    const res = await sdk.core.getAccountOwner(2);
    console.info('Account owner :', res);
  });

  it('should wrap sUSDC tokens', async () => {
    const spotMarketProxy = await sdk.contracts.getSpotMarketProxyInstance();
    // const tokenAddress = await sdk.core.getUsdToken();
    const tokenAddress = '0xc43708f8987df3f3681801e5e640667d86ce3c30'; // Temp value for fakeUSDC on base
    const size = '10';
    const sizeInWei = parseUnits(size, 6);

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

    const tx = await sdk.spot.wrap(size, 1, true);
    console.log('Wrap tx data:', tx);
  });
});
