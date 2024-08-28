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

export async function dynamicImportMeta(chainId: number, preset: string = 'main'): Promise<Meta> {
  const fileName = `@synthetixio/v3-contracts/${chainId}-${preset}/meta.json`;
  const module = await import(fileName);
  return module.default as Meta;
}

export async function dynamicImportAbi(chainId: number, preset: string = 'main', contractName: string) {
  const fileName = `@synthetixio/v3-contracts/${chainId}-${preset}/${contractName}.json`;
  const module = await import(fileName);
  return module.default;
}
