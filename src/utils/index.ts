export * from './common';

import { Address, decodeErrorResult, Hex } from 'viem';
import { SynthetixSdk } from '..';
import { dynamicImportAbi } from '../contracts/helpers';

/**
 * Utility class
 *
 */
export class Utils {
  sdk: SynthetixSdk;
  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
  }

  public async decodeErc7412Error(errorData: Hex) {
    try {
      const oracleManagerAbi = await dynamicImportAbi(
        this.sdk.rpcConfig.chainId,
        this.sdk.rpcConfig.preset,
        'OracleManagerProxy',
      );
      const response = decodeErrorResult({
        abi: oracleManagerAbi,
        data: errorData,
      });
      console.log('Response after decoding error', response);

      if (response.errorName == 'OracleDataRequired') {
        const oracleAddress = response.args[0] as Address;
        const oracleQuery = response.args[1] as Hex;

        console.log('oracleAddress', oracleAddress);
        console.log('oracleQuery', oracleQuery);
      }
    } catch (error) {
      console.log('Error decoding revert data', error);
    }
  }
}
