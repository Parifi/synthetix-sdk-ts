import { dynamicImportAbi, dynamicImportMeta } from './helpers';
import { getContract, Hex, PublicClient, WalletClient } from 'viem';

/**
 * The function returns an instance of the Core Proxy smart contract
 * @param chainId - Chain ID
 * @param provider - RPC Provider for chainId
 * @param preset - Synthetix deployment preset
 * @returns Contract - Instance of Core Proxy smart contract
 */
export const getCoreProxyInstance = async (
  chainId: number,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  preset: string = 'main',
) => {
  try {
    const meta = await dynamicImportMeta(chainId, preset);
    const abi = await dynamicImportAbi(chainId, preset, 'CoreProxy');
    const coreProxyInstance = getContract({
      address: meta.contracts.CoreProxy as Hex,
      abi: abi,
      client: {
        public: publicClient,
        wallet: walletClient,
      },
    });
    return coreProxyInstance;
  } catch (error) {
    console.log(error);
    throw new Error(`Unsupported chain ${chainId} or preset ${preset} for CoreProxy`);
  }
};

/**
 * The function returns an instance of the Account Proxy smart contract
 * @param chainId - Chain ID
 * @param provider - RPC Provider for chainId
 * @param preset - Synthetix deployment preset
 * @returns Contract - Instance of Account Proxy smart contract
 */
export const getAccountProxyInstance = async (
  chainId: number,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  preset: string = 'main',
) => {
  try {
    const meta = await dynamicImportMeta(chainId, preset);
    const abi = await dynamicImportAbi(chainId, preset, 'AccountProxy');
    const accountProxyInstance = getContract({
      address: meta.contracts.AccountProxy as Hex,
      abi: abi,
      client: {
        public: publicClient,
        wallet: walletClient,
      },
    });
    return accountProxyInstance;
  } catch (error) {
    console.log(error);
    throw new Error(`Unsupported chain ${chainId} or preset ${preset} for AccountProxy`);
  }
};
