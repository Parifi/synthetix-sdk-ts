/* eslint-disable @typescript-eslint/no-explicit-any */
import * as mainMeta from '@synthetixio/v3-contracts/42161-arbthetix/meta.json';
import * as ARBToken from '@synthetixio/v3-contracts/42161-arbthetix/ARBToken.json';
import * as AccountProxy from '@synthetixio/v3-contracts/42161-arbthetix/AccountProxy.json';
import * as AllErrors from '@synthetixio/v3-contracts/42161-arbthetix/AllErrors.json';
import * as CollateralToken_ARB from '@synthetixio/v3-contracts/42161-arbthetix/CollateralToken_ARB.json';
import * as CollateralToken_WETH from '@synthetixio/v3-contracts/42161-arbthetix/CollateralToken_WETH.json';
import * as CoreProxy from '@synthetixio/v3-contracts/42161-arbthetix/CoreProxy.json';
import * as DAIToken from '@synthetixio/v3-contracts/42161-arbthetix/DAIToken.json';
import * as OracleManagerProxy from '@synthetixio/v3-contracts/42161-arbthetix/OracleManagerProxy.json';
import * as PerpsAccountProxy from '@synthetixio/v3-contracts/42161-arbthetix/PerpsAccountProxy.json';
import * as PerpsMarketProxy from '@synthetixio/v3-contracts/42161-arbthetix/PerpsMarketProxy.json';
import * as PythERC7412Wrapper from '@synthetixio/v3-contracts/42161-arbthetix/PythERC7412Wrapper.json';
import * as SpotMarketProxy from '@synthetixio/v3-contracts/42161-arbthetix/SpotMarketProxy.json';
import * as TrustedMulticallForwarder from '@synthetixio/v3-contracts/42161-arbthetix/TrustedMulticallForwarder.json';
import * as USDCToken from '@synthetixio/v3-contracts/42161-arbthetix/USDCToken.json';
import * as USDProxy from '@synthetixio/v3-contracts/42161-arbthetix/USDProxy.json';
import * as WETHToken from '@synthetixio/v3-contracts/42161-arbthetix/WETHToken.json';
import * as SystemToken from '@synthetixio/v3-contracts/42161-arbthetix/systemToken.json';

// Define the structure for Meta and ABI
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

type ABI = Record<string, any>[];

const metaMapping: Record<number, Record<string, Meta>> = {
  42161: {
    arbthetix: (mainMeta as any).default, // Access the default export for JSON data
  },
};

const abiMapping: Record<number, Record<string, Record<string, ABI>>> = {
  42161: {
    arbthetix: {
      ARBToken: (ARBToken as any).default,
      AccountProxy: (AccountProxy as any).default,
      AllErrors: (AllErrors as any).default,
      CollateralToken_ARB: (CollateralToken_ARB as any).default,
      CollateralToken_WETH: (CollateralToken_WETH as any).default,
      CoreProxy: (CoreProxy as any).default,
      DAIToken: (DAIToken as any).default,
      OracleManagerProxy: (OracleManagerProxy as any).default,
      PerpsAccountProxy: (PerpsAccountProxy as any).default,
      PerpsMarketProxy: (PerpsMarketProxy as any).default,
      PythERC7412Wrapper: (PythERC7412Wrapper as any).default,
      SpotMarketProxy: (SpotMarketProxy as any).default,
      TrustedMulticallForwarder: (TrustedMulticallForwarder as any).default,
      USDCToken: (USDCToken as any).default,
      USDProxy: (USDProxy as any).default,
      WETHToken: (WETHToken as any).default,
      SystemToken: (SystemToken as any).default,
      // Add other contract ABIs as needed
    },
  },
};

// Function to dynamically import metadata
export async function dynamicImportMeta(chainId: number, preset: string = 'arbthetix'): Promise<Meta> {
  const meta = metaMapping[chainId]?.[preset];
  if (!meta) {
    throw new Error(`Meta not found for chainId ${chainId} and preset ${preset}`);
  }
  return meta;
}

// Function to import ABI based on chain ID, preset, and contract name
export async function dynamicImportAbi(
  chainId: number,
  preset: string = 'arbthetix',
  contractName: string,
): Promise<ABI> {
  const abi = abiMapping[chainId]?.[preset]?.[contractName];
  if (!abi) {
    throw new Error(`ABI not found for contract ${contractName} on chainId ${chainId} and preset ${preset}`);
  }
  return abi;
}
