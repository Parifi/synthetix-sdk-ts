import { Contract, ethers, IpcSocketProvider, JsonRpcProvider, WebSocketProvider } from 'ethers';
import { dynamicImportAbi, dynamicImportMeta } from './helpers';

/**
 * The function returns an instance of the Core Proxy smart contract
 * @param chainId - Chain ID
 * @param provider - RPC Provider for chainId
 * @param preset - Synthetix deployment preset
 * @returns Contract - Instance of Core Proxy smart contract
 */
export const getCoreProxyInstance = async (
  chainId: number,
  provider: JsonRpcProvider | WebSocketProvider | IpcSocketProvider,
  preset: string = 'main',
): Promise<Contract> => {
  try {
    const meta = await dynamicImportMeta(chainId, preset);
    const abi = await dynamicImportAbi(chainId, preset, 'CoreProxy');
    return new ethers.Contract(meta.contracts.CoreProxy, abi, provider);
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
  provider: JsonRpcProvider | WebSocketProvider | IpcSocketProvider,
  preset: string = 'main',
): Promise<Contract> => {
  try {
    const meta = await dynamicImportMeta(chainId, preset);
    const abi = await dynamicImportAbi(chainId, preset, 'AccountProxy');
    return new ethers.Contract(meta.contracts.AccountProxy, abi, provider);
  } catch (error) {
    console.log(error);
    throw new Error(`Unsupported chain ${chainId} or preset ${preset} for AccountProxy`);
  }
};
