/* eslint-disable @typescript-eslint/no-explicit-any */
import { abiMappingArb, metaMappingArb } from './v3-contracts/42161';
import { abiMappingArbSepolia, metaMappingArbSepolia } from './v3-contracts/421614';
import { ABI, abiMappingBase, metaMappingBase } from './v3-contracts/8453';
import { abiMappingBaseSepolia, metaMappingBaseSepolia } from './v3-contracts/84532';

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

const metaMapping: Record<number, Record<string, Meta>> = {
  42161: metaMappingArb,
  8453: metaMappingBase,
  84532: metaMappingBaseSepolia,
  421614: metaMappingArbSepolia,
};

const abiMapping: Record<number, Record<string, Record<string, any>>> = {
  42161: abiMappingArb,
  8453: abiMappingBase,
  84532: abiMappingBaseSepolia,
  421614: abiMappingArbSepolia,
};

// Function to dynamically import metadata
export async function dynamicImportMeta(chainId: number, preset: string = 'main'): Promise<Meta> {
  const meta = metaMapping[chainId]?.[preset];
  if (!meta) {
    throw new Error(`Meta not found for chainId ${chainId} and preset ${preset}`);
  }
  return meta;
}

// Function to import ABI based on chain ID, preset, and contract name
export async function dynamicImportAbi(chainId: number, preset: string = 'main', contractName: string): Promise<ABI> {
  const abi = abiMapping[chainId]?.[preset]?.[contractName];
  if (!abi) {
    throw new Error(`ABI not found for contract ${contractName} on chainId ${chainId} and preset ${preset}`);
  }
  return abi;
}
