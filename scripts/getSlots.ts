import { Address, createPublicClient, encodeFunctionData, Hash, http, erc20Abi } from 'viem';
import { baseSepolia } from 'viem/chains';
import { erc20AllowanceOverride, erc20BalanceOverride } from '../src/utils/override';

type Response = {
  address: string;
  approveSlot: number;
  balanceSlot: number;
};

const MAX_SLOTS = 500;

const tokens: { symbol: string; address: string }[] = [
  {
    name: 'USDC',
    value: 'USDC',
    synthAddress: '0x8069c44244e72443722cfb22DcE5492cba239d39',
    address: '0xc43708f8987Df3f3681801e5e640667D86Ce3C30',
    synthetixId: 1,
  },

  {
    name: 'cbBTC',
    value: 'cbBTC',
    synthAddress: '0x410EecB4b4CF7175352a472572492C1c9997a5e8',
    address: '0x8608d511E224180051A36d34121725D978064e6E',
    synthetixId: 7,
  },
  {
    name: 'WETH',
    value: 'WETH',
    synthAddress: '0x86B35F1b900B15C98049f68f4248815518e71985',
    address: '0x4200000000000000000000000000000000000006',
    synthetixId: 9,
  },
  {
    name: 'stataUSDC',
    value: 'stataUSDC',
    synthAddress: '0xB94c6E4f5162717c6fAb1Eeab8f0296307F91528',
    address: '0xB3f05d39504dA95876EA0174D25Ae51Ac2422a70',
    synthetixId: 4,
  },
  {
    name: 'cbETH',
    value: 'cbETH',
    synthAddress: '0x1c6dfe3205334Fece6a9169c88bF698Ed4370107',
    address: '0x00ab6b818652bB3bFE334983171edFD38184DbeD',
    synthetixId: 8,
  },
  {
    name: 'wstETH',
    value: 'wstETH',
    synthAddress: '0x5dc2592d23f72833c559ACB35c7122995EA80486',
    address: '0x7Bf65af7EFBd0E933fb87dD2C9cE7A17d959b822',
    synthetixId: 10,
  },
].reduce(
  (acc, token) => {
    const nToken = { address: token.address, symbol: token.name };
    // const sToken = { address: token.synthAddress, symbol: 's' + token.name };

    acc.push(nToken);
    return acc;
  },
  [] as { address: string; symbol: string }[],
);
const chain = baseSepolia;
const publicClient = createPublicClient({
  chain,
  transport: http('https://base-sepolia.g.alchemy.com/v2/6LTyykl0AuwyGKNq0yqIN1bVMZCwoUa6'),
});

const emptyAddress = '0x364576831e4c9b3660C6ACd8f586d8bf34C94c80';

(async () => {
  const responses: Response[] = [];
  for (const token of tokens) {
    const txs = [
      {
        to: token.address as Address,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [emptyAddress],
        }) as Hash,
        value: 0n,
        txType: 'balance',
        // stateOverride: {},
      },
      {
        txType: 'allowance',
        to: token.address as Address,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'allowance',
          args: [emptyAddress, emptyAddress],
        }) as Hash,
        value: 0n,
        // stateOverride: {},
      },
    ];
    const slots = [];

    for (const { txType, ...tx } of txs) {
      for (let i = 0; i < MAX_SLOTS; i++) {
        const overrideBalanceData =
          txType === 'balance'
            ? erc20BalanceOverride({
                token: token.address,
                owner: emptyAddress,
                slot: BigInt(i),
              })
            : erc20AllowanceOverride({
                token: token.address as Address,
                owner: emptyAddress,
                spender: emptyAddress,
                slot: BigInt(i),
              });

        const response = await publicClient.call({ ...tx, stateOverride: overrideBalanceData });

        const amount = BigInt(response.data || 0);
        console.log('=== ', { slot: i, amount, token: token.symbol });
        if (amount > 0n) {
          slots.push(i);
          break;
        }
      }
    }

    responses.push({
      address: token.address,
      balanceSlot: slots[0],
      approveSlot: slots[1],
    });
  }
  console.log('=== responses', responses);

  // fs.writeFileSync('slots-data.json', JSON.stringify(responses));
})();
