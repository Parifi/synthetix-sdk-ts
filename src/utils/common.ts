import { formatEther } from 'viem';
import { mainnet, base, optimism, arbitrum, baseSepolia, arbitrumSepolia, Chain } from 'viem/chains';
// import { mainnet } as chains from 'viem/chains';

export function getPublicRpcEndpoint(chainId: number) {
  console.log(chainId);
  //   @todo Add chain specific logic for default public rpc endpoint
  return 'https://base.llamarpc.com';
}

/**
 * Gets the chain object for the given chain id.
 * @param chainId - Chain id of the target EVM chain.
 * @returns Viem's chain object.
 */
export function getChain(chainId: number): Chain {
  const chains = [mainnet, base, optimism, arbitrum, baseSepolia, arbitrumSepolia];
  for (const chain of Object.values(chains)) {
    if (chain.id === chainId) {
      return chain;
    }
  }
  throw new Error(`Chain with id ${chainId} not found`);
}

export function convertWeiToEther(amountInWei: string | bigint | undefined): number {
  if (amountInWei == undefined) {
    throw new Error('Invalid amount received during conversion: undefined');
  }
  if (typeof amountInWei == 'bigint') {
    return Number(formatEther(amountInWei));
  } else if (typeof amountInWei == 'string') {
    return Number(formatEther(BigInt(amountInWei)));
  } else {
    throw new Error('Expected string or bigint for conversion');
  }
}
