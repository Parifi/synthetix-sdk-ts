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
    TrustedMulticallForwarder: string;
    SpotMarketProxy: string;
    PerpsMarketProxy: string;
    PerpsAccountProxy: string;
    PythERC7412Wrapper: string;
    CollateralToken_USDC: string;
    CollateralToken_sUSDC: string;
    CollateralToken_stataBasUSDC: string;
    CollateralToken_sStataUSDC: string;
    SynthToken_sUSDC: string;
    SynthToken_sStataUSDC: string;
    RewardsDistributor_1_sUSDC_USDC: string;
    RewardsDistributor_1_sUSDC_SNX: string;
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
