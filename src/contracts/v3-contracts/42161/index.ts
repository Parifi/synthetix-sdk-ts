/* eslint-disable @typescript-eslint/no-explicit-any */

// 42161 - arbthetix import
import * as arbthetixMeta from '@synthetixio/v3-contracts/42161-arbthetix/meta.json';
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

// 42161-main immport
import * as ARBTokenMain from '@synthetixio/v3-contracts/42161-main/ARBToken.json';
import * as AccountProxyMain from '@synthetixio/v3-contracts/42161-main/AccountProxy.json';
import * as AllErrorsMain from '@synthetixio/v3-contracts/42161-main/AllErrors.json';
import * as CollateralToken_ARBMain from '@synthetixio/v3-contracts/42161-main/CollateralToken_ARB.json';
import * as CollateralToken_USDCMain from '@synthetixio/v3-contracts/42161-main/CollateralToken_USDC.json';
import * as CollateralToken_USDeMain from '@synthetixio/v3-contracts/42161-main/CollateralToken_USDe.json';
import * as CollateralToken_WETHMain from '@synthetixio/v3-contracts/42161-main/CollateralToken_WETH.json';
import * as CollateralToken_sETHMain from '@synthetixio/v3-contracts/42161-main/CollateralToken_sETH.json';
import * as CollateralToken_stBTCMain from '@synthetixio/v3-contracts/42161-main/CollateralToken_stBTC.json';
import * as CollateralToken_tBTCMain from '@synthetixio/v3-contracts/42161-main/CollateralToken_tBTC.json';
import * as CoreProxyMain from '@synthetixio/v3-contracts/42161-main/CoreProxy.json';
import * as OracleManagerProxyMain from '@synthetixio/v3-contracts/42161-main/OracleManagerProxy.json';
import * as PerpsAccountProxyMain from '@synthetixio/v3-contracts/42161-main/PerpsAccountProxy.json';
import * as PerpsMarketProxyMain from '@synthetixio/v3-contracts/42161-main/PerpsMarketProxy.json';
import * as PythERC7412WrapperMain from '@synthetixio/v3-contracts/42161-main/PythERC7412Wrapper.json';
import * as RewardsDistributor_1_ARB_ARBMain from '@synthetixio/v3-contracts/42161-main/RewardsDistributor_1_ARB_ARB.json';
import * as RewardsDistributor_1_USDC_ARBMain from '@synthetixio/v3-contracts/42161-main/RewardsDistributor_1_USDC_ARB.json';
import * as RewardsDistributor_1_USDe_ARBMain from '@synthetixio/v3-contracts/42161-main/RewardsDistributor_1_USDe_ARB.json';
import * as RewardsDistributor_1_WETH_ARBMain from '@synthetixio/v3-contracts/42161-main/RewardsDistributor_1_WETH_ARB.json';
import * as RewardsDistributor_1_sETHMain from '@synthetixio/v3-contracts/42161-main/RewardsDistributor_1_sETH.json';
import * as RewardsDistributor_1_stBTCMain from '@synthetixio/v3-contracts/42161-main/RewardsDistributor_1_stBTC.json';
import * as SpotMarketProxyMain from '@synthetixio/v3-contracts/42161-main/SpotMarketProxy.json';
import * as SynthToken_sETHMain from '@synthetixio/v3-contracts/42161-main/SynthToken_sETH.json';
import * as SynthToken_sUSDCMain from '@synthetixio/v3-contracts/42161-main/SynthToken_sUSDC.json';
import * as SynthToken_stBTCMain from '@synthetixio/v3-contracts/42161-main/SynthToken_stBTC.json';
import * as SynthUSDCTokenMain from '@synthetixio/v3-contracts/42161-main/SynthUSDCToken.json';
import * as TrustedMulticallForwarderMain from '@synthetixio/v3-contracts/42161-main/TrustedMulticallForwarder.json';
import * as USDCTokenMain from '@synthetixio/v3-contracts/42161-main/USDCToken.json';
import * as USDProxyMain from '@synthetixio/v3-contracts/42161-main/USDProxy.json';
import * as WETHTokenMain from '@synthetixio/v3-contracts/42161-main/WETHToken.json';
import * as CannonMain from '@synthetixio/v3-contracts/42161-main/cannon.json';
import * as CollateralTokensMain from '@synthetixio/v3-contracts/42161-main/collateralTokens.json';
import * as ExtrasMain from '@synthetixio/v3-contracts/42161-main/extras.json';
import * as mainMeta from '@synthetixio/v3-contracts/42161-main/meta.json';
import * as MintableTokensMain from '@synthetixio/v3-contracts/42161-main/mintableTokens.json';
import * as RewardsDistributorsMain from '@synthetixio/v3-contracts/42161-main/rewardsDistributors.json';
import * as SynthTokensMain from '@synthetixio/v3-contracts/42161-main/synthTokens.json';
import * as SystemTokenMain from '@synthetixio/v3-contracts/42161-main/systemToken.json';
import { ZAP_ABI } from '../../abis/zap';

export const metaMappingArb = {
  arbthetix: (arbthetixMeta as any).default, // Access the default export for JSON data
  main: (mainMeta as any).default, // Access the default export for JSON data
};

export const abiMappingArb = {
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
    systemToken: (SystemToken as any).default,
  },
  main: {
    ARBToken: (ARBTokenMain as any).default,
    AccountProxy: (AccountProxyMain as any).default,
    AllErrors: (AllErrorsMain as any).default,
    CollateralToken_ARB: (CollateralToken_ARBMain as any).default,
    CollateralToken_USDC: (CollateralToken_USDCMain as any).default,
    CollateralToken_USDe: (CollateralToken_USDeMain as any).default,
    CollateralToken_WETH: (CollateralToken_WETHMain as any).default,
    CollateralToken_sETH: (CollateralToken_sETHMain as any).default,
    CollateralToken_stBTC: (CollateralToken_stBTCMain as any).default,
    CollateralToken_tBTC: (CollateralToken_tBTCMain as any).default,
    CoreProxy: (CoreProxyMain as any).default,
    OracleManagerProxy: (OracleManagerProxyMain as any).default,
    PerpsAccountProxy: (PerpsAccountProxyMain as any).default,
    PerpsMarketProxy: (PerpsMarketProxyMain as any).default,
    PythERC7412Wrapper: (PythERC7412WrapperMain as any).default,
    RewardsDistributor_1_ARB_ARB: (RewardsDistributor_1_ARB_ARBMain as any).default,
    RewardsDistributor_1_USDC_ARB: (RewardsDistributor_1_USDC_ARBMain as any).default,
    RewardsDistributor_1_USDe_ARB: (RewardsDistributor_1_USDe_ARBMain as any).default,
    RewardsDistributor_1_WETH_ARB: (RewardsDistributor_1_WETH_ARBMain as any).default,
    RewardsDistributor_1_sETH: (RewardsDistributor_1_sETHMain as any).default,
    RewardsDistributor_1_stBTC: (RewardsDistributor_1_stBTCMain as any).default,
    SpotMarketProxy: (SpotMarketProxyMain as any).default,
    SynthToken_sETH: (SynthToken_sETHMain as any).default,
    SynthToken_sUSDC: (SynthToken_sUSDCMain as any).default,
    SynthToken_stBTC: (SynthToken_stBTCMain as any).default,
    SynthUSDCToken: (SynthUSDCTokenMain as any).default,
    TrustedMulticallForwarder: (TrustedMulticallForwarderMain as any).default,
    USDCToken: (USDCTokenMain as any).default,
    USDProxy: (USDProxyMain as any).default,
    WETHToken: (WETHTokenMain as any).default,
    systemToken: (SystemTokenMain as any).default,
    cannon: (CannonMain as any).default,
    collateralTokens: (CollateralTokensMain as any).default,
    extras: (ExtrasMain as any).default,
    mintableTokens: (MintableTokensMain as any).default,
    rewardsDistributors: (RewardsDistributorsMain as any).default,
    synthTokens: (SynthTokensMain as any).default,
    SynthZap: ZAP_ABI,
  },
};
