import { keccak256, encodeAbiParameters, toHex, Address, StateMapping } from 'viem';
import { tokensSlots } from '../constants/slots';

export type Erc20BalanceOverrideParameters = {
  token: string;
  owner: string;
  slot: bigint;
  balance?: bigint;
};

export function erc20BalanceOverride({
  token,
  owner,
  slot,
  balance = BigInt('0x100000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'),
}: Erc20BalanceOverrideParameters): { address: Address; stateDiff: StateMapping }[] {
  const smartAccountErc20BalanceSlot = keccak256(
    encodeAbiParameters(
      [
        {
          type: 'address',
        },
        {
          type: 'uint256',
        },
      ],
      [owner as Address, slot],
    ),
  );

  return [
    {
      address: token as Address,
      stateDiff: [
        {
          slot: smartAccountErc20BalanceSlot,
          value: toHex(balance),
        },
      ],
    },
  ];
}

export type Erc20AllowanceOverrideParameters = {
  token: string;
  owner: string;
  spender: string;
  slot: bigint;
  amount?: bigint;
};

export function erc20AllowanceOverride({
  token,
  owner,
  spender,
  slot,
  amount = BigInt('0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'),
}: Erc20AllowanceOverrideParameters): { address: Address; stateDiff: StateMapping }[] {
  const smartAccountErc20AllowanceSlot = keccak256(
    encodeAbiParameters(
      [
        {
          type: 'address',
        },
        {
          type: 'bytes32',
        },
      ],
      [
        spender as Address,
        keccak256(
          encodeAbiParameters(
            [
              {
                type: 'address',
              },
              {
                type: 'uint256',
              },
            ],
            [owner as Address, BigInt(slot)],
          ),
        ),
      ],
    ),
  );

  return [
    {
      address: token as Address,
      stateDiff: [
        {
          slot: smartAccountErc20AllowanceSlot,
          value: toHex(amount),
        },
      ],
    },
  ];
}
export const erc20StateOverrideBalanceAndAllowance = ({
  token,
  owner,
  balance = BigInt('0x100000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'),
  spender,
}: {
  token: string;
  owner: string;
  balance?: bigint;
  spender: string;
}) => {
  const balanceSlot = tokensSlots.find((slotData) => slotData.address.toLowerCase() === token.toLowerCase());

  if (!balanceSlot) throw new Error('No balance slot');

  const balanceOverride = erc20BalanceOverride({ balance, slot: BigInt(balanceSlot.balanceSlot), token, owner });
  const approveOverride = erc20AllowanceOverride({
    spender,
    amount: balance,
    token,
    slot: BigInt(balanceSlot.approveSlot),
    owner,
  });

  return [...balanceOverride, ...approveOverride];
};
