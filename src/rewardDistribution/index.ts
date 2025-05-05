import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { SynthetixSdk } from '..';
import { USERS_REWARDS } from '../constants/rewardTree';
import { OverrideParamsWrite } from '../interface/commonTypes';
import { encodeFunctionData } from 'viem';

export class RewardDistribution {
  sdk: SynthetixSdk;

  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
  }

  async getTree(tokenSymbol: string, round: number) {
    tokenSymbol = tokenSymbol.toLowerCase();
    const treeData = USERS_REWARDS?.[tokenSymbol]?.[round];

    if (!treeData) {
      throw new Error(`No rewards found for token ${tokenSymbol}`);
    }

    const tree = StandardMerkleTree.of(
      treeData.map((u) => [u.address, u.amount]),
      ['address', 'uint256'],
    );

    return tree;
  }

  async claimRewards(
    { user, rounds, tokenSymbol }: { user: string; rounds: number[]; tokenSymbol: string },
    override: OverrideParamsWrite = {},
  ) {
    const txs = [];
    for (const round of rounds) {
      try {
        const tx = await this.claimReward({ user, round, tokenSymbol }, override);
        txs.push(tx);
      } catch (error) {
        this.sdk.logger.error(`Failed to claim reward for ${user} in round ${round}: ${error}`);
      }
    }

    return txs;
  }

  async claimReward(
    { user, round, tokenSymbol }: { user: string; tokenSymbol: string; round: number },
    override: OverrideParamsWrite = {},
  ) {
    tokenSymbol = tokenSymbol.toLowerCase();

    const rewardDistributor = this.sdk.contracts.getRewardDistributorInstance(tokenSymbol);

    const isClaimed = await rewardDistributor.read.claimed([round, user]);

    if (isClaimed) {
      this.sdk.logger.info(`Already claimed rewards for ${user}`);
      throw new Error(`Already claimed rewards for ${user} and token ${tokenSymbol}`);
    }

    const tree = await this.getTree(tokenSymbol, round);
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
            args: [round, userData.amount, proof],
          }),
          value: 0n,
          requireSuccess: true,
        },
      ],
      override,
    );
  }
}
