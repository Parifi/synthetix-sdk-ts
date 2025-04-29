import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { SynthetixSdk } from '..';
import { USERS_REWARDS } from '../constants/rewardTree';
import { OverrideParamsWrite } from '../interface/commonTypes';
import { encodeFunctionData } from 'viem';

export class RewardDistribution {
  sdk: SynthetixSdk;

  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
    this.tree = StandardMerkleTree.build();
  }

  async getTree(tokenSymbol: string) {
    tokenSymbol = tokenSymbol.toLowerCase();
    const treeData = USERS_REWARDS[tokenSymbol];
    if (!treeData) {
      throw new Error(`No rewards found for token ${tokenSymbol}`);
    }

    const tree = StandardMerkleTree.of(
      treeData.map((u) => [u.address, u.amount]),
      ['address', 'uint256'],
    );

    return tree;
  }

  async claimRewards({ user, tokenSymbol }: { user: string; tokenSymbol: string }, override: OverrideParamsWrite = {}) {
    tokenSymbol = tokenSymbol.toLowerCase();

    const rewardDistributor = this.sdk.contracts.getRewardDistributorInstance(tokenSymbol);
    const isClaimed = await rewardDistributor.read.claimed([user]);
    if (isClaimed) {
      this.sdk.logger.info(`Already claimed rewards for ${user}`);
      throw new Error(`Already claimed rewards for ${user} and token ${tokenSymbol}`);
    }

    const tree = await this.getTree(tokenSymbol);
    const indexOf = tree.dump().values.findIndex((data) => data.value.at(0) === user);
    const userData = tree
      .dump()
      .values.find((data) => data.value.at(0) === user)
      ?.value?.reduce(
        (acc, curr, index) => {
          const keys: ['address', 'amount'] = ['address', 'amount'];
          const key: 'address' | 'amount' = keys[index];

          if (!key) return acc;

          // @ts-expect-error correct type
          acc[key] = curr.at(index);

          return acc;
        },
        {} as { address: string; amount: string },
      );

    if (!userData || !userData?.address) throw new Error(`User ${user} not found in the tree`);

    const proof = tree.getProof(indexOf);

    return this.sdk.utils.processTransactions(
      [
        {
          target: rewardDistributor.address,
          callData: encodeFunctionData({
            abi: rewardDistributor.abi,
            functionName: 'claimReward',
            args: [userData.amount, proof],
          }),
          value: 0n,
          requireSuccess: true,
        },
      ],
      override,
    );
  }
}
