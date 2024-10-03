import 'dotenv/config';
import { getSdkInstanceForTesting } from '..';
import { Address, CallParameters, encodeFunctionData, erc20Abi, parseUnits } from 'viem';
import { SynthetixSdk } from '../../src';

describe('Core', () => {
  let sdk: SynthetixSdk;
  beforeAll(async () => {
    sdk = await getSdkInstanceForTesting();

    // Get accounts for address and sets the default account
    const defaultAddress = process.env.DEFAULT_ADDRESS;
    const accountIds = await sdk.core.getAccountIds({ address: defaultAddress as Address });
    console.log('Account ids for default account: ', accountIds);
  });

  it('should return response for a get call on Core proxy contract', async () => {
    const res = await sdk.core.getAccountOwner(2);
    console.info('Account owner :', res);
  });

  it('should return USD token address', async () => {
    const res = await sdk.core.getUsdToken();
    console.info('usdTokenAddress :', res);
  });

  it('should return account ids and balance of an address', async () => {
    const defaultAddress = process.env.DEFAULT_ADDRESS;
    const accountIds = await sdk.core.getAccountIds({ address: defaultAddress });
    console.info('Account Ids :', accountIds);
  });

  it('should return available collateral of an account', async () => {
    const tokenAddress = await sdk.core.getUsdToken();
    const availableCollateral = await sdk.core.getAvailableCollateral({ tokenAddress });

    console.info('getAvailableCollateral :', availableCollateral);
  });

  it('should create an account and return the tx hash', async () => {
    const txHash = await sdk.core.createAccount(undefined);
    console.log('Create account txHash:', txHash);
  });

  it('should deposit tokens to account', async () => {
    const tokenAddress = await sdk.core.getUsdToken();
    const tokenBalance: bigint = (await sdk.utils.callErc7412(tokenAddress, erc20Abi, 'balanceOf', [
      sdk.accountAddress,
    ])) as bigint;
    const coreProxy = await sdk.contracts.getCoreProxyInstance();
    const amount = 100; // 100 USD
    const amountInWei = parseUnits(amount.toString(), 18);

    if (tokenBalance == BigInt(0)) {
      console.log('USD Token balance of address is 0, unable to mint');
      return;
    }

    if (tokenBalance < amountInWei) {
      console.log('USD Token balance of address is less than amount');
      return;
    }

    const balanceApproved = (await sdk.utils.callErc7412(tokenAddress, erc20Abi, 'allowance', [
      sdk.accountAddress,
      coreProxy.address,
    ])) as bigint;

    if (balanceApproved < amountInWei) {
      const approvalTx: CallParameters = {
        account: sdk.accountAddress,
        to: tokenAddress,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [coreProxy.address, amountInWei],
        }),
      };
      const approvalHash = await sdk.executeTransaction(approvalTx);
      console.log('Approval txHash:', approvalHash);
    }

    const txData = await sdk.core.deposit({ tokenAddress, amount, decimals: 18 });
    console.log('Deposit tx data:', txData);
  });

  it('should withdraw tokens from account', async () => {
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 5; // 5 USD
    const amountInWei = parseUnits(amount.toString(), 18);
    // const coreProxy = await sdk.contracts.getCoreProxyInstance();

    const availableCollateral = await sdk.core.getAvailableCollateral({ tokenAddress });
    const collateralInWei = parseUnits(availableCollateral, 18);

    if (amountInWei >= collateralInWei) {
      console.log('Available collateral not available, unable to withdraw');
      return;
    } else {
      const tx = await sdk.core.withdraw({ tokenAddress, amount, decimals: 18 });
      console.log('Withdraw tx data:', tx);
    }
  });

  it.skip('should delegate account collateral to a pool', async () => {
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 60; // 5 usd
    const poolId = await sdk.core.getPreferredPool();
    console.log('Preferred pool id :', poolId);
    const leverage = 1; // 1x leverage

    const txData = await sdk.core.delegateCollateral({ tokenAddress, amount, poolId, leverage });
    console.log('Delegate tx:', txData);
  });

  it.skip('should mint USD tokens', async () => {
    const tokenAddress = await sdk.core.getUsdToken();
    const amount = 5; // 5 usd
    const poolId = await sdk.core.getPreferredPool();
    console.log('Preferred pool id :', poolId);

    const txData = await sdk.core.mintUsd({ tokenAddress, amount, poolId });

    console.log('Mint tokens txData:', txData);
  });
});
