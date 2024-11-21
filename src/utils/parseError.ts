import { Hex } from 'viem';

// TODO: Generalize this. See https://github.com/usecannon/cannon/blob/main/packages/builder/src/error/index.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseError(error: any): Hex {
  try {
    if (error.cause?.data) {
      return error.cause?.data;
    }
    if (error.cause?.cause?.data) {
      return error.cause?.cause?.data;
    }
    if (error.cause?.cause?.cause?.data) {
      return error.cause?.cause?.cause?.data;
    }
    if (error.cause?.cause?.error?.data) {
      return error.cause?.cause?.error?.data;
    }
    if (error.cause?.cause?.cause?.error?.data) {
      return error.cause?.cause?.cause?.error?.data;
    }
  } catch (err) {
    console.error('=== exception in erc7412 error parser:', err);
  }
  console.log('=== a', JSON.stringify(error, null, 2));
  // rethrow the error (and log it so we can see the original)
  console.error('=== got unknown error in erc7412 parse', error);
  return '0x';
}
