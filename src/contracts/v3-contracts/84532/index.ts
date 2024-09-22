/* eslint-disable @typescript-eslint/no-explicit-any */

//84532-andromeda
import * as AccountProxyAndromeda from '@synthetixio/v3-contracts/84532-andromeda/AccountProxy.json';
import * as AllErrorsAndromeda from '@synthetixio/v3-contracts/84532-andromeda/AllErrors.json';
import * as CoreProxyAndromeda from '@synthetixio/v3-contracts/84532-andromeda/CoreProxy.json';
import * as OracleManagerProxyAndromeda from '@synthetixio/v3-contracts/84532-andromeda/OracleManagerProxy.json';
import * as PerpsAccountProxyAndromeda from '@synthetixio/v3-contracts/84532-andromeda/PerpsAccountProxy.json';
import * as PerpsMarketProxyAndromeda from '@synthetixio/v3-contracts/84532-andromeda/PerpsMarketProxy.json';
import * as PythERC7412WrapperAndromeda from '@synthetixio/v3-contracts/84532-andromeda/PythERC7412Wrapper.json';
import * as SpotMarketProxyAndromeda from '@synthetixio/v3-contracts/84532-andromeda/SpotMarketProxy.json';
import * as SynthToken_sUSDCAndromeda from '@synthetixio/v3-contracts/84532-andromeda/SynthToken_sUSDC.json';
import * as SynthUSDCTokenAndromeda from '@synthetixio/v3-contracts/84532-andromeda/SynthUSDCToken.json';
import * as TrustedMulticallForwarderAndromeda from '@synthetixio/v3-contracts/84532-andromeda/TrustedMulticallForwarder.json';
import * as USDProxyAndromeda from '@synthetixio/v3-contracts/84532-andromeda/USDProxy.json';
import * as CannonAndromeda from '@synthetixio/v3-contracts/84532-andromeda/cannon.json';
import * as CollateralTokensAndromeda from '@synthetixio/v3-contracts/84532-andromeda/collateralTokens.json';
import * as ExtrasAndromeda from '@synthetixio/v3-contracts/84532-andromeda/extras.json';
import * as MetaAndromeda from '@synthetixio/v3-contracts/84532-andromeda/meta.json';
import * as MintableTokensAndromeda from '@synthetixio/v3-contracts/84532-andromeda/mintableTokens.json';
import * as RewardsDistributorsAndromeda from '@synthetixio/v3-contracts/84532-andromeda/rewardsDistributors.json';
import * as SynthTokensAndromeda from '@synthetixio/v3-contracts/84532-andromeda/synthTokens.json';
import * as SystemTokenAndromeda from '@synthetixio/v3-contracts/84532-andromeda/systemToken.json';
import * as CollateralToken_sStataUSDCAndromeda from '@synthetixio/v3-contracts/84532-andromeda/CollateralToken_sStataUSDC.json';
import * as CollateralToken_sUSDCAndromeda from '@synthetixio/v3-contracts/84532-andromeda/CollateralToken_sUSDC.json';
import * as RewardsDistributorForSpartanCouncilPoolSNXAndromeda from '@synthetixio/v3-contracts/84532-andromeda/RewardsDistributorForSpartanCouncilPoolSNX.json';
import * as RewardsDistributorForSpartanCouncilPoolUSDCAndromeda from '@synthetixio/v3-contracts/84532-andromeda/RewardsDistributorForSpartanCouncilPoolUSDC.json';
import * as SynthToken_sStataUSDCAndromeda from '@synthetixio/v3-contracts/84532-andromeda/SynthToken_sStataUSDC.json';
import * as CollateralToken_fUSDCAndromeda from '@synthetixio/v3-contracts/84532-andromeda/CollateralToken_fUSDC.json';
import * as CollateralToken_stataUSDCAndromeda from '@synthetixio/v3-contracts/84532-andromeda/CollateralToken_stataUSDC.json';
import * as FakeCollateralfUSDCAndromeda from '@synthetixio/v3-contracts/84532-andromeda/FakeCollateralfUSDC.json';
import * as FakeCollateralfwSNXAndromeda from '@synthetixio/v3-contracts/84532-andromeda/FakeCollateralfwSNX.json';
import * as MintableToken_fUSDCAndromeda from '@synthetixio/v3-contracts/84532-andromeda/MintableToken_fUSDC.json';
import * as MintableToken_fwSNXAndromeda from '@synthetixio/v3-contracts/84532-andromeda/MintableToken_fwSNX.json';

export const metaMappingBaseSepolia = {
  andromeda: (MetaAndromeda as any).default, // Access the default export for JSON data
};

export const abiMappingBaseSepolia = {
  andromeda: {
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
    USDProxy: (USDProxyAndromeda as any).default,
    cannon: (CannonAndromeda as any).default,
    collateralTokens: (CollateralTokensAndromeda as any).default,
    extras: (ExtrasAndromeda as any).default,
    mintableTokens: (MintableTokensAndromeda as any).default,
    rewardsDistributors: (RewardsDistributorsAndromeda as any).default,
    synthTokens: (SynthTokensAndromeda as any).default,
    systemToken: (SystemTokenAndromeda as any).default,
    CollateralToken_sStataUSDC: (CollateralToken_sStataUSDCAndromeda as any).default,
    CollateralToken_sUSDC: (CollateralToken_sUSDCAndromeda as any).default,
    RewardsDistributorForSpartanCouncilPoolSNX: (RewardsDistributorForSpartanCouncilPoolSNXAndromeda as any).default,
    RewardsDistributorForSpartanCouncilPoolUSDC: (RewardsDistributorForSpartanCouncilPoolUSDCAndromeda as any).default,
    SynthToken_sStataUSDC: (SynthToken_sStataUSDCAndromeda as any).default,
    CollateralToken_fUSDC: (CollateralToken_fUSDCAndromeda as any).default,
    CollateralToken_stataUSDC: (CollateralToken_stataUSDCAndromeda as any).default,
    FakeCollateralfUSDC: (FakeCollateralfUSDCAndromeda as any).default,
    FakeCollateralfwSNX: (FakeCollateralfwSNXAndromeda as any).default,
    MintableToken_fUSDC: (MintableToken_fUSDCAndromeda as any).default,
    MintableToken_fwSNX: (MintableToken_fwSNXAndromeda as any).default,
  },
};
