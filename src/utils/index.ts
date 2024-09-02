export * from './common';

import {
  Address,
  decodeAbiParameters,
  decodeErrorResult,
  encodeFunctionData,
  Hex,
  parseAbiParameters,
  TransactionRequest,
} from 'viem';
import { SynthetixSdk } from '..';
import { dynamicImportAbi } from '../contracts/helpers';
import { OracleDataRequiredError } from '../error';
import { Multicall3Abi } from '../contracts/abis/Multicall3';
import { IERC7412Abi } from '../contracts/abis/IERC7412';

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
   * @returns Pyth Price IDs array
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

  /**
   * Fetches off-chain price update data for ERC7412 Oracle contract
   * @param oracleQuery Encoded revert data from ERC7412 Oracle contract with more details about the error
   * @returns Pyth Price update data
   */
  public async fetchOffchainData(oracleQuery: Hex): Promise<string[]> {
    const priceIds = this.getPythPriceIdsFromOracleQuery(oracleQuery as Hex);

    const priceUpdateData = await this.sdk.pyth.getVaaPriceUpdateData(priceIds);
    return priceUpdateData;
  }

  /**
   * Generates Tx for Price update data of Oracle
   * @param oracleContract Oracle Contract address
   * @param signedRequiredData Price Update data
   * @returns Transaction Request for Oracle price update
   */
  public async generateDataVerificationTx(
    oracleContract: Hex,
    signedRequiredData: string[],
  ): Promise<TransactionRequest> {
    const txData = encodeFunctionData({
      abi: IERC7412Abi,
      functionName: 'fulfillOracleQuery',
      args: [signedRequiredData],
    });

    const priceUpdatTx: TransactionRequest = {
      from: this.sdk.accountAddress,
      to: oracleContract,
      data: txData,
    };
    return priceUpdatTx;
  }

  /**
   *
   * @param tx Transaction(s) object to be called
   * @returns Response of tx execution
   */
  public async callErc7412(tx: TransactionRequest | TransactionRequest[]) {
    const multicallTxs: TransactionRequest[] = Array.isArray(tx) ? tx : [tx];

    const publicClient = this.sdk.getPublicClient();
    console.log('Public client account', publicClient.account);

    while (true) {
      try {
        const multicallData = encodeFunctionData({
          abi: Multicall3Abi,
          functionName: 'aggregate3Value',
          args: [
            multicallTxs.map((tx) => ({
              target: tx.to,
              callData: tx.data,
              value: tx.value || 0n,
              allowFailure: false,
            })),
          ],
        });

        let totalValue = 0n;
        for (const tx of multicallTxs) {
          totalValue += tx.value || 0n;
        }

        const finalTx = {
          account: this.sdk.accountAddress,
          to: publicClient.chain?.contracts?.multicall3?.address,
          data: multicallData,
          value: totalValue,
        };

        const response = await publicClient.call(finalTx);
        console.log(response);
        return finalTx;
      } catch (error) {
        if (error instanceof OracleDataRequiredError) {
          const signedRequiredData = await this.fetchOffchainData(error.oracleQuery as Hex);
          const dataVerificationTx = await this.generateDataVerificationTx(
            error.oracleContract as Hex,
            signedRequiredData,
          );
          multicallTxs.unshift(dataVerificationTx);
          console.log(dataVerificationTx);
          this.callErc7412(multicallTxs);
        }
      }
    }
  }
}
