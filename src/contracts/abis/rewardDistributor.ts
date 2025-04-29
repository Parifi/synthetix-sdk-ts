export const REWARD_DISTRIBUTOR_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_rewardToken', type: 'address', internalType: 'contract IERC20' },
      { name: '_root', type: 'bytes32', internalType: 'bytes32' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimReward',
    inputs: [
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
      { name: 'proof', type: 'bytes32[]', internalType: 'bytes32[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimed',
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'verify',
    inputs: [
      { name: 'proof', type: 'bytes32[]', internalType: 'bytes32[]' },
      { name: 'leaf', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'RewardClaimed',
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
];
