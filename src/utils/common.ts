import { formatEther, maxUint128, parseEther } from 'viem';
import { mainnet, base, optimism, arbitrum, baseSepolia, arbitrumSepolia, Chain } from 'viem/chains';
import { randomBytes } from 'crypto';
import { publicRpcEndpoints } from '../constants';

export function getPublicRpcEndpoint(chainId: number) {
  return publicRpcEndpoints[chainId];
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

export function convertEtherToWei(amount: string | number | undefined): bigint {
  if (amount == undefined) {
    throw new Error('Invalid amount received during conversion: undefined');
  }
  if (typeof amount == 'number') {
    return parseEther(amount.toString());
  } else if (typeof amount == 'string') {
    return parseEther(amount);
  } else {
    throw new Error('Expected string or bigint for conversion');
  }
}

export function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export function generateRandomAccountId(): bigint {
  const buffer = randomBytes(16); // 16 bytes * 8 bits/byte = 128 bits
  const randomAccountId = BigInt('0x' + buffer.toString('hex'));
  if (randomAccountId > maxUint128) {
    throw new Error('Account ID greater than Maxuint128');
  }
  return randomAccountId;
}
