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
  const maxUint128Half = maxUint128 / BigInt(2);

  const buffer = randomBytes(8); // 8 bytes * 8 bits/byte = 64 bits
  const randomAccountId = BigInt('0x' + buffer.toString('hex'));
  if (randomAccountId > maxUint128Half) {
    throw new Error('Account ID greater than Maxuint128');
  }
  return randomAccountId;
}

/**
 * @name batchArray
 * @description This function batches an array into smaller subarrays based on a given size. It uses the reduce method to iterate over the array and push each batch into an accumulator array.
 * @param {any[]} arr - The array that needs to be batched.
 * @param {number} batchSize - The number of elements to include in each subarray.
 * @returns {any[][]} - An array of arrays, where each inner array contains the batched subarrays.
 */
export const batchArray = <T>(arr: T[], batchSize: number): T[][] => {
  return arr.reduce((acc, _, i) => (i % batchSize ? acc : [...acc, arr.slice(i, i + batchSize)]), [] as T[][]);
};
