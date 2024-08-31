export * from './common';

import { Address, decodeAbiParameters, decodeErrorResult, Hex, parseAbiParameters, TransactionRequest } from 'viem';
import { SynthetixSdk } from '..';
import { dynamicImportAbi } from '../contracts/helpers';
import { OracleDataRequiredError } from '../error';

/**
 * Utility class
 *
 */
export class Utils {
  sdk: SynthetixSdk;
  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
  }

  /**
   * Returns the Pyth price ids array
   * @param oracleQueryData
   * @returns
   */
  public getPythPriceIdsFromOracleQuery(oracleQueryData: Hex): Hex[] {
    const values = decodeAbiParameters(parseAbiParameters('uint8, uint64, bytes32[]'), oracleQueryData);
    return values[2] as Hex[];
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

  public async fetchOffchainData(oracleContract: Hex, oracleQuery: string): Promise<string> {
    console.log(oracleContract);
    console.log(oracleQuery);
    return '0x';
  }

  public async generateDataVerificationTx(
    oracleContract: Hex,
    signedRequiredData: string,
  ): Promise<TransactionRequest> {
    console.log(oracleContract);
    console.log(signedRequiredData);

    const tx: TransactionRequest = {
      from: this.sdk.accountAddress,
      to: oracleContract,
      data: '0x',
    };
    return tx;
  }

  public async callErc7412(tx: TransactionRequest | TransactionRequest[]) {
    const multicallTx: TransactionRequest[] = Array.isArray(tx) ? tx : [tx];

    const publicClient = this.sdk.getPublicClient();
    console.log('Public client account', publicClient.account);
    while (true) {
      try {
        console.log('Multicall execution data', multicallTx);
        return multicallTx;
      } catch (error) {
        if (error instanceof OracleDataRequiredError) {
          const signedRequiredData = await this.fetchOffchainData(error.oracleContract as Hex, error.oracleQuery);
          const dataVerificationTx = await this.generateDataVerificationTx(
            error.oracleContract as Hex,
            signedRequiredData,
          );
          multicallTx.unshift(dataVerificationTx);
        }
      }
    }
  }
}
