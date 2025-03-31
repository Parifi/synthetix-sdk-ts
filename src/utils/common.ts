import { Address, formatEther, maxUint128, parseEther } from 'viem';

import { mainnet, base, optimism, arbitrum, baseSepolia, arbitrumSepolia, Chain } from 'viem/chains';
import { randomBytes } from 'crypto';
import { publicRpcEndpoints } from '../constants';
import { ZAP_BY_CHAIN } from '../contracts/addreses/zap';

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

export type QuoteParams = {
  fromChain: number;
  fromToken: Address;
  toToken: Address;
  fromAmount: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FetcherArgs = Omit<RequestInit, 'body'> & { body?: any };

export const fetcher = (
  url: string,
  init: FetcherArgs = {
    headers: {
      'Content-Type': 'application/json',
    },
  },
) =>
  fetch(url, {
    ...init,
    body: JSON.stringify(init.body),
    headers: init.headers,
    method: init.body && !init.method ? 'POST' : init.method,
  });

const odoFetcher = async (url: string, options: FetcherArgs) => {
  return fetcher(`https://api.odos.xyz/sor${url}`, options);
};

const assemblePath = async (user: string, pathId: string) => {
  const response = await odoFetcher(`/assemble`, {
    body: {
      userAddr: user,
      pathId,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return '';
  const data = (await response.json()) as { transaction: { data: string } };

  return data.transaction.data;
};

export const getOdosPath = async (quoteParams: QuoteParams) => {
  const data = {
    chainId: quoteParams.fromChain,
    inputTokens: [{ tokenAddress: quoteParams.fromToken, amount: quoteParams.fromAmount }],
    outputTokens: [{ tokenAddress: quoteParams.toToken, proportion: 1 }],
    // slippageLimitPercent: 1,
    // zap contract
    userAddr: ZAP_BY_CHAIN[quoteParams.fromChain],
  };

  // return TEST_DATA;

  const response = await odoFetcher('/quote/v2', {
    body: data,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return { path: '' };

  const quote = (await response.json()) as { pathId: string };
  const quoteId = quote.pathId;

  const path = await assemblePath(data.userAddr, quoteId);

  return { path };
};
