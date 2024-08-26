import { Contract, ethers, IpcSocketProvider, JsonRpcProvider, WebSocketProvider } from 'ethers';

interface Meta {
  name: string;
  preset: string;
  version: string;
  generator: string;
  timestamp: number;
  miscUrl: string;
  contracts: {
    CoreProxy: string;
    AccountProxy: string;
    USDProxy: string;
    OracleManagerProxy: string;
    LegacyMarketProxy: string;
    V2x: string;
    V2xUsd: string;
    TrustedMulticallForwarder: string;
    SpotMarketProxy: string;
    CollateralToken_SNX: string;
    SynthToken_snxUSDe: string;
  };
}

const dynamicImportMeta = async (chainId: number, preset: string) => {
  const fileName = `@synthetixio/v3-contracts/${chainId}-${preset}/meta.json`;
  const module = await import(fileName);
  return module.default as Meta;
};

const dynamicImportAbi = async (chainId: number, preset: string, contractName: string) => {
  const fileName = `@synthetixio/v3-contracts/${chainId}-${preset}/${contractName}.readable.json`;
  const module = await import(fileName);
  return module.default;
};

export const getCoreProxyInstance = async (
  chainId: number,
  provider: JsonRpcProvider | WebSocketProvider | IpcSocketProvider,
  preset: string = 'main',
): Promise<Contract | undefined> => {
  try {
    const meta = await dynamicImportMeta(chainId, preset);
    const abi = await dynamicImportAbi(chainId, preset, meta.contracts.CoreProxy);
    return new ethers.Contract(meta.contracts.CoreProxy, abi, provider);
  } catch (error) {
    console.log(error);
    throw new Error(`Unsupported chain ${chainId} or preset ${preset} for CoreProxy`);
  }
};
