/* eslint-disable @typescript-eslint/no-explicit-any */

//8453-andromeda
import * as AccountProxyAndromeda from '@synthetixio/v3-contracts/8453-andromeda/AccountProxy.json';
import * as AllErrorsAndromeda from '@synthetixio/v3-contracts/8453-andromeda/AllErrors.json';
import * as CollateralToken_USDCAndromeda from '@synthetixio/v3-contracts/8453-andromeda/CollateralToken_USDC.json';
import * as CoreProxyAndromeda from '@synthetixio/v3-contracts/8453-andromeda/CoreProxy.json';
import * as OracleManagerProxyAndromeda from '@synthetixio/v3-contracts/8453-andromeda/OracleManagerProxy.json';
import * as PerpsAccountProxyAndromeda from '@synthetixio/v3-contracts/8453-andromeda/PerpsAccountProxy.json';
import * as PerpsMarketProxyAndromeda from '@synthetixio/v3-contracts/8453-andromeda/PerpsMarketProxy.json';
import * as PythERC7412WrapperAndromeda from '@synthetixio/v3-contracts/8453-andromeda/PythERC7412Wrapper.json';
import * as SpotMarketProxyAndromeda from '@synthetixio/v3-contracts/8453-andromeda/SpotMarketProxy.json';
import * as SynthToken_sUSDCAndromeda from '@synthetixio/v3-contracts/8453-andromeda/SynthToken_sUSDC.json';
import * as SynthUSDCTokenAndromeda from '@synthetixio/v3-contracts/8453-andromeda/SynthUSDCToken.json';
import * as TrustedMulticallForwarderAndromeda from '@synthetixio/v3-contracts/8453-andromeda/TrustedMulticallForwarder.json';
import * as USDCTokenAndromeda from '@synthetixio/v3-contracts/8453-andromeda/USDCToken.json';
import * as USDProxyAndromeda from '@synthetixio/v3-contracts/8453-andromeda/USDProxy.json';
import * as CannonAndromeda from '@synthetixio/v3-contracts/8453-andromeda/cannon.json';
import * as CollateralTokensAndromeda from '@synthetixio/v3-contracts/8453-andromeda/collateralTokens.json';
import * as ExtrasAndromeda from '@synthetixio/v3-contracts/8453-andromeda/extras.json';
import * as MetaAndromeda from '@synthetixio/v3-contracts/8453-andromeda/meta.json';
import * as MintableTokensAndromeda from '@synthetixio/v3-contracts/8453-andromeda/mintableTokens.json';
import * as RewardsDistributorsAndromeda from '@synthetixio/v3-contracts/8453-andromeda/rewardsDistributors.json';
import * as SynthTokensAndromeda from '@synthetixio/v3-contracts/8453-andromeda/synthTokens.json';
import * as SystemTokenAndromeda from '@synthetixio/v3-contracts/8453-andromeda/systemToken.json';
import * as CollateralToken_sStataUSDCAndromeda from '@synthetixio/v3-contracts/8453-andromeda/CollateralToken_sStataUSDC.json';
import * as CollateralToken_stataBasUSDCAndromeda from '@synthetixio/v3-contracts/8453-andromeda/CollateralToken_stataBasUSDC.json';
import * as CollateralToken_sUSDCAndromeda from '@synthetixio/v3-contracts/8453-andromeda/CollateralToken_sUSDC.json';
import * as RewardsDistributor_1_sUSDC_SNXAndromeda from '@synthetixio/v3-contracts/8453-andromeda/RewardsDistributor_1_sUSDC_SNX.json';
import * as RewardsDistributor_1_sUSDC_USDCAndromeda from '@synthetixio/v3-contracts/8453-andromeda/RewardsDistributor_1_sUSDC_USDC.json';
import * as RewardsDistributorForSpartanCouncilPoolSNXAndromeda from '@synthetixio/v3-contracts/8453-andromeda/RewardsDistributorForSpartanCouncilPoolSNX.json';
import * as RewardsDistributorForSpartanCouncilPoolUSDCAndromeda from '@synthetixio/v3-contracts/8453-andromeda/RewardsDistributorForSpartanCouncilPoolUSDC.json';
import * as SNXTokenAndromeda from '@synthetixio/v3-contracts/8453-andromeda/SNXToken.json';
import * as SynthToken_sStataUSDCAndromeda from '@synthetixio/v3-contracts/8453-andromeda/SynthToken_sStataUSDC.json';

export const metaMappingBase = {
  andromeda: (MetaAndromeda as any).default, // Access the default export for JSON data
};

export const abiMappingBase = {
  andromdea: {
    AccountProxy: (AccountProxyAndromeda as any).default,
    AllErrors: (AllErrorsAndromeda as any).default,
    CoreProxy: (CoreProxyAndromeda as any).default,
    OracleManagerProxy: (OracleManagerProxyAndromeda as any).default,
    PerpsAccountProxy: (PerpsAccountProxyAndromeda as any).default,
    PerpsMarketProxy: (PerpsMarketProxyAndromeda as any).default,
    PythERC7412Wrapper: (PythERC7412WrapperAndromeda as any).default,
    SpotMarketProxy: (SpotMarketProxyAndromeda as any).default,
    SynthToken_sUSDC: (SynthToken_sUSDCAndromeda as any).default,
    SynthUSDCToken: (SynthUSDCTokenAndromeda as any).default,
    TrustedMulticallForwarder: (TrustedMulticallForwarderAndromeda as any).default,
    USDCToken: (USDCTokenAndromeda as any).default,
    USDProxy: (USDProxyAndromeda as any).default,
    cannon: (CannonAndromeda as any).default,
    collateralTokens: (CollateralTokensAndromeda as any).default,
    extras: (ExtrasAndromeda as any).default,
    mintableTokens: (MintableTokensAndromeda as any).default,
    rewardsDistributors: (RewardsDistributorsAndromeda as any).default,
    synthTokens: (SynthTokensAndromeda as any).default,
    systemToken: (SystemTokenAndromeda as any).default,
    CollateralToken_USDC: (CollateralToken_USDCAndromeda as any).default,
    CollateralToken_sStataUSDC: (CollateralToken_sStataUSDCAndromeda as any).default,
    CollateralToken_stataBasUSDC: (CollateralToken_stataBasUSDCAndromeda as any).default,
    CollateralToken_sUSDC: (CollateralToken_sUSDCAndromeda as any).default,
    RewardsDistributor_1_sUSDC_SNX: (RewardsDistributor_1_sUSDC_SNXAndromeda as any).default,
    RewardsDistributor_1_sUSDC_USDC: (RewardsDistributor_1_sUSDC_USDCAndromeda as any).default,
    RewardsDistributorForSpartanCouncilPoolSNX: (RewardsDistributorForSpartanCouncilPoolSNXAndromeda as any).default,
    RewardsDistributorForSpartanCouncilPoolUSDC: (RewardsDistributorForSpartanCouncilPoolUSDCAndromeda as any).default,
    SNXToken: (SNXTokenAndromeda as any).default,
    SynthToken_sStataUSDC: (SynthToken_sStataUSDCAndromeda as any).default,
  },
};
