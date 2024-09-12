import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';
import { Address, CallParameters, encodeFunctionData, erc20Abi, formatUnits, getContract, Hex, parseUnits } from 'viem';
import { IERC7412Abi } from '../../src/contracts/abis/IERC7412';

describe('Core', () => {
  it('should return response for a get call on Core proxy contract', async () => {
    const sdk = await getSdkInstanceForTesting();
    const res = await sdk.core.getAccountOwner(2);
    console.info('Account owner :', res);
  });

  it('should wrap sUSDC tokens', async () => {
    const sdk = await getSdkInstanceForTesting();
    const spotMarketProxy = await sdk.contracts.getSpotMarketProxyInstance();
    // const tokenAddress = await sdk.core.getUsdToken();
    const tokenAddress = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

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

    const txHash = await sdk.spot.wrap(size, 1, false);
    console.log('Wrap txHash:', txHash);
  });
});
