/* eslint-disable @typescript-eslint/no-explicit-any */
import * as ARBTokenMain from '@synthetixio/v3-contracts/421614-main/ARBToken.json';
import * as AccountProxyMain from '@synthetixio/v3-contracts/421614-main/AccountProxy.json';
import * as AllErrorsMain from '@synthetixio/v3-contracts/421614-main/AllErrors.json';
import * as CollateralToken_fARBMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_fARB.json';
import * as CollateralToken_USDCMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_USDC.json';
import * as CollateralToken_fsUSDeMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_fsUSDe.json';
import * as CollateralToken_fUSDeMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_fUSDe.json';
import * as CollateralToken_sETHMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_sETH.json';
import * as CollateralToken_WETHMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_WETH.json';
import * as CoreProxyMain from '@synthetixio/v3-contracts/421614-main/CoreProxy.json';
import * as OracleManagerProxyMain from '@synthetixio/v3-contracts/421614-main/OracleManagerProxy.json';
import * as PerpsAccountProxyMain from '@synthetixio/v3-contracts/421614-main/PerpsAccountProxy.json';
import * as PerpsMarketProxyMain from '@synthetixio/v3-contracts/421614-main/PerpsMarketProxy.json';
import * as PythERC7412WrapperMain from '@synthetixio/v3-contracts/421614-main/PythERC7412Wrapper.json';
import * as RewardsDistributor_1_sETHMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_sETH.json';
import * as RewardsDistributor_1_sBTCMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_sBTC.json';
import * as SynthToken_sETHMain from '@synthetixio/v3-contracts/421614-main/SynthToken_sETH.json';
import * as SynthToken_sUSDCMain from '@synthetixio/v3-contracts/421614-main/SynthToken_sUSDC.json';
import * as SynthToken_sBTCMain from '@synthetixio/v3-contracts/421614-main/SynthToken_sBTC.json';
import * as SynthUSDCTokenMain from '@synthetixio/v3-contracts/421614-main/SynthUSDCToken.json';
import * as TrustedMulticallForwarderMain from '@synthetixio/v3-contracts/421614-main/TrustedMulticallForwarder.json';
import * as USDCTokenMain from '@synthetixio/v3-contracts/421614-main/USDCToken.json';
import * as USDProxyMain from '@synthetixio/v3-contracts/421614-main/USDProxy.json';
import * as WETHTokenMain from '@synthetixio/v3-contracts/421614-main/WETHToken.json';
import * as CannonMain from '@synthetixio/v3-contracts/421614-main/cannon.json';
import * as CollateralTokensMain from '@synthetixio/v3-contracts/421614-main/collateralTokens.json';
import * as ExtrasMain from '@synthetixio/v3-contracts/421614-main/extras.json';
import * as mainMeta from '@synthetixio/v3-contracts/421614-main/meta.json';
import * as MintableTokensMain from '@synthetixio/v3-contracts/421614-main/mintableTokens.json';
import * as SynthTokensMain from '@synthetixio/v3-contracts/421614-main/synthTokens.json';
import * as SystemTokenMain from '@synthetixio/v3-contracts/421614-main/systemToken.json';
import * as RewardsDistributorsMain from '@synthetixio/v3-contracts/421614-main/rewardsDistributors.json';
import * as SpotMarketProxyMain from '@synthetixio/v3-contracts/421614-main/SpotMarketProxy.json';
import * as CollateralToken_fBTCMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_fBTC.json';
import * as CollateralToken_fDAIMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_fDAI.json';
import * as CollateralToken_fSOLMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_fSOL.json';
import * as CollateralToken_fBTC__1Main from '@synthetixio/v3-contracts/421614-main/CollateralToken_fBTC__1.json';
import * as CollateralToken_sBTCMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_sBTC.json';
import * as CollateralToken_sSOLMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_sSOL.json';
import * as CollateralToken_sUSDeMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_sUSDe.json';
import * as CollateralToken_weETHMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_weETH.json';
import * as CollateralToken_wstETHMain from '@synthetixio/v3-contracts/421614-main/CollateralToken_wstETH.json';
import * as DAITokenMain from '@synthetixio/v3-contracts/421614-main/DAIToken.json';
import * as FakeCollateralfARBMain from '@synthetixio/v3-contracts/421614-main/FakeCollateralfARB.json';
import * as FakeCollateralfDAIMain from '@synthetixio/v3-contracts/421614-main/FakeCollateralfDAI.json';
import * as MintableToken_fARBMain from '@synthetixio/v3-contracts/421614-main/MintableToken_fARB.json';
import * as MintableToken_fBTCMain from '@synthetixio/v3-contracts/421614-main/MintableToken_fBTC.json';
import * as MintableToken_fDAIMain from '@synthetixio/v3-contracts/421614-main/MintableToken_fDAI.json';
import * as MintableToken_fSOLMain from '@synthetixio/v3-contracts/421614-main/MintableToken_fSOL.json';
import * as MintableToken_fsUSDCeMain from '@synthetixio/v3-contracts/421614-main/MintableToken_fsUSDe.json';
import * as MintableToken_fUSDeMain from '@synthetixio/v3-contracts/421614-main/MintableToken_fUSDe.json';
import * as MintableToken_weETHMain from '@synthetixio/v3-contracts/421614-main/MintableToken_weETH.json';
import * as MintableToken_wastETHMain from '@synthetixio/v3-contracts/421614-main/MintableToken_wstETH.json';
import * as RewardsDistributor_1_fARB_fARBMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_fARB_fARB.json';
import * as RewardsDistributor_1_fARB_sBTCMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_fARB_sBTC.json';
import * as RewardsDistributor_1_fARB_sETHMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_fARB_sETH.json';
import * as RewardsDistributor_1_fARBMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_fARB.json';
import * as RewardsDistributor_1_fDAI_sBTCMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_fDAI_sBTC.json';
import * as RewardsDistributor_1_fDAI_sETHMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_fDAI_sETH.json';
import * as RewardsDistributor_1_fsUSDe_fARBMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_fsUSDe_fARB.json';
import * as RewardsDistributor_1_fsUSDe_sBTCMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_fsUSDe_sBTC.json';
import * as RewardsDistributor_1_fsUSDe_sETHMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_fsUSDe_sETH.json';
import * as RewardsDistributor_1_sSOLMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_sSOL.json';
import * as RewardsDistributor_1_sUSDeMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_sUSDe.json';
import * as RewardsDistributor_1_USDC_fARBMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_USDC_fARB.json';
import * as RewardsDistributor_1_USDC_sBTCMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_USDC_sBTC.json';
import * as RewardsDistributor_1_USDC_sETHMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_USDC_sETH.json';
import * as RewardsDistributor_1_WETH_fARBMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_WETH_fARB.json';
import * as RewardsDistributor_1_WETH_sBTCMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_WETH_sBTC.json';
import * as RewardsDistributor_1_WETH_sETHMain from '@synthetixio/v3-contracts/421614-main/RewardsDistributor_1_WETH_sETH.json';
import * as SynthDAITokenMain from '@synthetixio/v3-contracts/421614-main/SynthDAIToken.json';
import * as SynthToken_sSOLMain from '@synthetixio/v3-contracts/421614-main/SynthToken_sSOL.json';
import * as SynthToken_sUSDeMain from '@synthetixio/v3-contracts/421614-main/SynthToken_sUSDe.json';
import { ZAP_ABI } from '../../abis/zap';

export const metaMappingArbSepolia = {
  main: (mainMeta as any).default, // Access the default export for JSON data
};

export const abiMappingArbSepolia = {
  main: {
    ARBToken: (ARBTokenMain as any).default,
    AccountProxy: (AccountProxyMain as any).default,
    AllErrors: (AllErrorsMain as any).default,
    CollateralToken_USDC: (CollateralToken_USDCMain as any).default,
    CollateralToken_WETH: (CollateralToken_WETHMain as any).default,
    CollateralToken_sETH: (CollateralToken_sETHMain as any).default,
    CoreProxy: (CoreProxyMain as any).default,
    OracleManagerProxy: (OracleManagerProxyMain as any).default,
    PerpsAccountProxy: (PerpsAccountProxyMain as any).default,
    PerpsMarketProxy: (PerpsMarketProxyMain as any).default,
    PythERC7412Wrapper: (PythERC7412WrapperMain as any).default,
    RewardsDistributor_1_sETH: (RewardsDistributor_1_sETHMain as any).default,
    RewardsDistributor_1_stBTC: (RewardsDistributor_1_sBTCMain as any).default,
    SpotMarketProxy: (SpotMarketProxyMain as any).default,
    SynthToken_sETH: (SynthToken_sETHMain as any).default,
    SynthToken_sUSDC: (SynthToken_sUSDCMain as any).default,
    SynthToken_sBTC: (SynthToken_sBTCMain as any).default,
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
    CollateralToken_fARB: (CollateralToken_fARBMain as any).default,
    CollateralToken_fsUSDe: (CollateralToken_fsUSDeMain as any).default,
    CollateralToken_fUSDe: (CollateralToken_fUSDeMain as any).default,
    CollateralToken_fBTC: (CollateralToken_fBTCMain as any).default,
    CollateralToken_fDAI: (CollateralToken_fDAIMain as any).default,
    CollateralToken_fSOL: (CollateralToken_fSOLMain as any).default,
    CollateralToken_fBTC__1: (CollateralToken_fBTC__1Main as any).default,
    CollateralToken_sBTC: (CollateralToken_sBTCMain as any).default,
    CollateralToken_sSOL: (CollateralToken_sSOLMain as any).default,
    CollateralToken_sUSDe: (CollateralToken_sUSDeMain as any).default,
    CollateralToken_weETH: (CollateralToken_weETHMain as any).default,
    CollateralToken_wstETH: (CollateralToken_wstETHMain as any).default,
    DAIToken: (DAITokenMain as any).default,
    FakeCollateralfARB: (FakeCollateralfARBMain as any).default,
    FakeCollateralfDAI: (FakeCollateralfDAIMain as any).default,
    MintableToken_fARB: (MintableToken_fARBMain as any).default,
    MintableToken_fBTC: (MintableToken_fBTCMain as any).default,
    MintableToken_fDAI: (MintableToken_fDAIMain as any).default,
    MintableToken_fSOL: (MintableToken_fSOLMain as any).default,
    MintableToken_fsUSDe: (MintableToken_fsUSDCeMain as any).default,
    MintableToken_fUSDe: (MintableToken_fUSDeMain as any).default,
    MintableToken_weETH: (MintableToken_weETHMain as any).default,
    MintableToken_wstETH: (MintableToken_wastETHMain as any).default,
    RewardsDistributor_1_fARB_fARB: (RewardsDistributor_1_fARB_fARBMain as any).default,
    RewardsDistributor_1_fARB_sBTC: (RewardsDistributor_1_fARB_sBTCMain as any).default,
    RewardsDistributor_1_fARB_sETH: (RewardsDistributor_1_fARB_sETHMain as any).default,
    RewardsDistributor_1_fARB: (RewardsDistributor_1_fARBMain as any).default,
    RewardsDistributor_1_fDAI_sBTC: (RewardsDistributor_1_fDAI_sBTCMain as any).default,
    RewardsDistributor_1_fDAI_sETH: (RewardsDistributor_1_fDAI_sETHMain as any).default,
    RewardsDistributor_1_fsUSDe_fARB: (RewardsDistributor_1_fsUSDe_fARBMain as any).default,
    RewardsDistributor_1_fsUSDe_sBTC: (RewardsDistributor_1_fsUSDe_sBTCMain as any).default,
    RewardsDistributor_1_fsUSDe_sETH: (RewardsDistributor_1_fsUSDe_sETHMain as any).default,
    RewardsDistributor_1_sSOL: (RewardsDistributor_1_sSOLMain as any).default,
    RewardsDistributor_1_sUSDe: (RewardsDistributor_1_sUSDeMain as any).default,
    RewardsDistributor_1_USDC_fARB: (RewardsDistributor_1_USDC_fARBMain as any).default,
    RewardsDistributor_1_USDC_sBTC: (RewardsDistributor_1_USDC_sBTCMain as any).default,
    RewardsDistributor_1_USDC_sETH: (RewardsDistributor_1_USDC_sETHMain as any).default,
    RewardsDistributor_1_WETH_fARB: (RewardsDistributor_1_WETH_fARBMain as any).default,
    RewardsDistributor_1_WETH_sBTC: (RewardsDistributor_1_WETH_sBTCMain as any).default,
    RewardsDistributor_1_WETH_sETH: (RewardsDistributor_1_WETH_sETHMain as any).default,
    SynthDAIToken: (SynthDAITokenMain as any).default,
    SynthToken_sSOL: (SynthToken_sSOLMain as any).default,
    SynthToken_sUSDe: (SynthToken_sUSDeMain as any).default,
    SynthZap: ZAP_ABI,
  },
};
