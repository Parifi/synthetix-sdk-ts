export const IERC7412Abi = [
  {
    type: 'function',
    name: 'fulfillOracleQuery',
    inputs: [{ name: 'signedOffchainData', type: 'bytes', internalType: 'bytes' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'oracleId',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'error',
    name: 'FeeRequired',
    inputs: [{ name: 'feeAmount', type: 'uint256', internalType: 'uint256' }],
  },
  {
    type: 'error',
    name: 'OracleDataRequired',
    inputs: [
      { name: 'oracleContract', type: 'address', internalType: 'address' },
      { name: 'oracleQuery', type: 'bytes', internalType: 'bytes' },
    ],
  },
  {
    type: 'error',
    name: 'Errors',
    inputs: [
      {
        type: 'bytes[]',
        name: 'revertReasons',
      },
    ],
  },
];
