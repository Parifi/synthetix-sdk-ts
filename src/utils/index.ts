export * from './common';

import {
  Abi,
  Address,
  CallExecutionError,
  CallParameters,
  decodeAbiParameters,
  decodeErrorResult,
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  Hex,
  parseAbiParameters,
} from 'viem';
import { SynthetixSdk } from '..';
import { IERC7412Abi } from '../contracts/abis/IERC7412';
import { Call3Value, Result } from '../interface/contractTypes';
import { parseError } from './parseError';
import { MAX_ERC7412_RETRIES, SIG_FEE_REQUIRED, SIG_ORACLE_DATA_REQUIRED } from '../constants';

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

  /**
   * Decodes the response from a Smart contract function call
   * @param abi Contract ABI
   * @param functionName Function name to decode
   * @param result Response from function call that needs to be decoded
   * @returns Decoded result
   */
  public decodeResponse(abi: unknown, functionName: string, result: Hex) {
    const decodedResult = decodeFunctionResult({
      abi: abi as Abi,
      functionName: functionName,
      data: result,
    });

    return decodedResult;
  }

  /**
   * Determines the type of Error emitted by ERC7412 contract and prepares signed update data
   * @param data Error data emitted from ERC7412 contract
   * @returns Encoded data for oracle price update transaction
   */
  public async fetchOracleUpdateData(data: Hex): Promise<Hex> {
    const [updateType] = decodeAbiParameters([{ name: 'updateType', type: 'uint8' }], data);

    if (updateType === 1) {
      const [updateType, stalenessOrTime, priceIds] = decodeAbiParameters(
        [
          { name: 'updateType', type: 'uint8' },
          { name: 'stalenessTolerance', type: 'uint64' },
          { name: 'priceIds', type: 'bytes32[]' },
        ],
        data,
      );

      console.log('Update type: ', updateType);
      console.log('priceIds: ', priceIds);

      const stalenessTolerance = stalenessOrTime;
      const updateData = (await this.sdk.pyth.pythConnection.getPriceFeedsUpdateData(
        priceIds as string[],
      )) as unknown as Address[];

      return encodeAbiParameters(
        [
          { type: 'uint8', name: 'updateType' },
          { type: 'uint64', name: 'stalenessTolerance' },
          { type: 'bytes32[]', name: 'priceIds' },
          { type: 'bytes[]', name: 'updateData' },
        ],
        [updateType, stalenessTolerance, priceIds, updateData],
      );
    } else if (updateType === 2) {
      const [updateType, requestedTime, priceId] = decodeAbiParameters(
        [
          { name: 'updateType', type: 'uint8' },
          { name: 'requestedTime', type: 'uint64' },
          { name: 'priceIds', type: 'bytes32' },
        ],
        data,
      );
      console.log('Update type: ', updateType);
      console.log('priceIds: ', priceId);

      const [priceFeedUpdateVaa] = await this.sdk.pyth.pythConnection.getVaa(
        priceId as string,
        Number((requestedTime as unknown as bigint).toString()),
      );
      const priceFeedUpdate = '0x' + Buffer.from(priceFeedUpdateVaa, 'base64').toString('hex');

      return encodeAbiParameters(
        [
          { type: 'uint8', name: 'updateType' },
          { type: 'uint64', name: 'timestamp' },
          { type: 'bytes32[]', name: 'priceIds' },
          { type: 'bytes[]', name: 'updateData' },
        ],
        [updateType, requestedTime, [priceId], [priceFeedUpdate as Address]],
      );
    } else {
      throw new Error(`Error encoding/decoding data`);
    }
  }

  /**
   * Handles ERC7412 error by creating a price update tx which is prepended to the existing calls
   * @param error Error thrown by the call function
   * @param calls Multicall call data
   * @returns call array with ERC7412 fulfillOracleQuery transaction
   */
  public async handleErc7412Error(error: unknown, calls: Call3Value[]): Promise<Call3Value[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let err: any;

    try {
      err = decodeErrorResult({
        abi: IERC7412Abi,
        data: parseError(error as CallExecutionError),
      });
    } catch (decodeErr) {
      console.log('Decode Error: ', decodeErr);
      throw new Error('Handle ERC7412 error');
    }

    if (err?.errorName === 'OracleDataRequired') {
      console.log('Oracle Data Required error, adding price update data to tx');
      const oracleAddress = err.args![0] as Address;
      const oracleQuery = err.args![1] as Hex;

      const signedRequiredData = await this.fetchOracleUpdateData(oracleQuery);
      const dataVerificationTx = await this.generateDataVerificationTx(oracleAddress, signedRequiredData);
      calls.unshift(dataVerificationTx);
      return calls;
    } else if (err.errorName === 'FeeRequired') {
      console.log('Fee Required oracle error. Adding fee to tx.value');
      if (calls.length > 0) {
        calls[0].value = err.args[0] as bigint;
        return calls;
      } else {
        throw new Error('Handle ERC7412 error: Calls.length == 0');
      }
    } else {
      throw new Error('Handle ERC7412 error');
    }
  }

  /**
   * Generates Call3Value tx for Price update data of Oracle
   * @param oracleContract Oracle Contract address
   * @param signedRequiredData Encoded Price Update data
   * @returns Transaction Request for Oracle price update
   */
  public generateDataVerificationTx(oracleContract: Hex, signedRequiredData: string): Call3Value {
    const priceUpdateCall: Call3Value = {
      target: oracleContract,
      callData: encodeFunctionData({
        abi: IERC7412Abi as unknown as Abi,
        functionName: 'fulfillOracleQuery',
        args: [signedRequiredData],
      }),
      value: 0n,
      requireSuccess: true,
    };
    return priceUpdateCall;
  }

  /**
   * Calls the `functionName` on `contractAddress` target using the Multicall contract. If the call requires
   * a price update, ERC7412 price update tx is prepended to the tx.
   * @param contractAddress Target contract address for the call
   * @param abi Contract ABI
   * @param functionName Function to be called on the contract
   * @param args Arguments list for the function call
   * @param calls Array of Call3Value calls for Multicall contract
   * @returns Response from the contract function call
   */
  public async callErc7412(
    contractAddress: Address,
    abi: unknown,
    functionName: string,
    args: unknown[],
    calls: Call3Value[] = [],
  ) {
    const multicallInstance = await this.sdk.contracts.getMulticallInstance();
    const currentCall: Call3Value = {
      target: contractAddress,
      callData: encodeFunctionData({
        abi: abi as Abi,
        functionName: functionName,
        args: args,
      }),
      value: 0n,
      requireSuccess: true,
    };

    calls.push(currentCall);

    const publicClient = this.sdk.getPublicClient();

    let totalRetries = 0;
    while (true) {
      try {
        const multicallData = encodeFunctionData({
          abi: multicallInstance.abi,
          functionName: 'aggregate3Value',
          args: [calls],
        });

        let totalValue = 0n;
        for (const tx of calls) {
          totalValue += tx.value || 0n;
        }

        const finalTx = {
          account: this.sdk.accountAddress,
          to: multicallInstance.address,
          data: multicallData,
          value: totalValue,
        };

        const response = await publicClient.call(finalTx);
        if (response.data != undefined) {
          const multicallResult: Result[] = this.decodeResponse(
            multicallInstance.abi,
            'aggregate3Value',
            response.data as Hex,
          ) as unknown as Result[];

          const returnData = multicallResult.at(-1);
          if (returnData?.success && returnData.returnData != undefined) {
            const decodedResult = this.decodeResponse(abi, functionName, returnData.returnData);
            return decodedResult;
          } else {
            throw new Error('Error decoding call data');
          }
        } else {
          throw new Error('Invalid response from function call');
        }
      } catch (error) {
        totalRetries += 1;
        if (totalRetries > MAX_ERC7412_RETRIES) {
          throw new Error('MAX_ERC7412_RETRIES retries reached, tx failed after multiple attempts');
        }

        const parsedError = parseError(error as CallExecutionError);

        const isErc7412Error =
          parsedError.startsWith(SIG_ORACLE_DATA_REQUIRED) || parsedError.startsWith(SIG_FEE_REQUIRED);
        if (!isErc7412Error) {
          console.log('Error details: ', error);
          console.log('Parsed Error details: ', parsedError);
          throw new Error('Error is not related to Oracle data');
        }

        calls = await this.handleErc7412Error(error, calls);
      }
    }
  }

  /**
   * Calls the `functionName` on `contractAddress` target using the Multicall contract. If the call requires
   * a price update, ERC7412 price update tx is prepended to the tx.
   * @param contractAddress Target contract address for the call
   * @param abi Contract ABI
   * @param functionName Function to be called on the contract
   * @param argsList Array of arguments list for the function call
   * @param calls Array of Call3Value calls for Multicall contract
   * @returns Array of responses from the contract function call for the multicalls
   */
  public async multicallErc7412(
    contractAddress: Address,
    abi: unknown,
    functionName: string,
    argsList: unknown[],
    calls: Call3Value[] = [],
  ) {
    const multicallInstance = await this.sdk.contracts.getMulticallInstance();

    // Format the args to the required array format
    argsList = argsList.map((args) => (Array.isArray(args) ? args : [args]));
    const numPrependedCalls = calls.length;

    argsList.forEach((args) => {
      const currentCall: Call3Value = {
        target: contractAddress,
        callData: encodeFunctionData({
          abi: abi as Abi,
          functionName: functionName,
          args: args as unknown[],
        }),
        value: 0n,
        requireSuccess: true,
      };
      calls.push(currentCall);
    });

    const numCalls = calls.length - numPrependedCalls;
    const publicClient = this.sdk.getPublicClient();

    let totalRetries = 0;
    while (true) {
      try {
        const multicallData = encodeFunctionData({
          abi: multicallInstance.abi,
          functionName: 'aggregate3Value',
          args: [calls],
        });

        let totalValue = 0n;
        for (const tx of calls) {
          totalValue += tx.value || 0n;
        }

        const finalTx = {
          account: this.sdk.accountAddress,
          to: publicClient.chain?.contracts?.multicall3?.address,
          data: multicallData,
          value: totalValue,
        };

        const response = await publicClient.call(finalTx);

        const multicallResult: Result[] = this.decodeResponse(
          multicallInstance.abi,
          'aggregate3Value',
          response.data as Hex,
        ) as unknown as Result[];

        const callsToDecode = multicallResult.slice(-numCalls);

        const decodedResult = callsToDecode.map((result) => this.decodeResponse(abi, functionName, result.returnData));
        return decodedResult;
      } catch (error) {
        totalRetries += 1;
        if (totalRetries > MAX_ERC7412_RETRIES) {
          throw new Error('MAX_ERC7412_RETRIES retries reached, tx failed after multiple attempts');
        }
        const parsedError = parseError(error as CallExecutionError);

        const isErc7412Error =
          parsedError.startsWith(SIG_ORACLE_DATA_REQUIRED) || parsedError.startsWith(SIG_FEE_REQUIRED);
        if (!isErc7412Error) {
          console.log('Error details: ', error);
          console.log('Parsed Error details: ', parsedError);
          throw new Error('Error is not related to Oracle data');
        }

        calls = await this.handleErc7412Error(error, calls);
        // console.log('Calls array after handleErc7412Error', calls);
      }
    }
  }

  /**
   * Simulates the `functionName` on `contractAddress` target using the Multicall contract and returns the
   * final transaction call with ERC7412 price update data if required
   * @param contractAddress Target contract address for the call
   * @param abi Contract ABI
   * @param functionName Function to be called on the contract
   * @param args Arguments list for the function call
   * @param calls Array of Call3Value calls for Multicall contract
   * @returns Final transaction with ERC7412 tx data (if necessary)
   */
  public async writeErc7412(
    contractAddress?: Address,
    abi?: unknown,
    functionName?: string,
    args?: unknown[],
    calls: Call3Value[] = [],
  ): Promise<CallParameters> {
    const multicallInstance = await this.sdk.contracts.getMulticallInstance();

    if (contractAddress != undefined && functionName != undefined) {
      const currentCall: Call3Value = {
        target: contractAddress,
        callData: encodeFunctionData({
          abi: abi as Abi,
          functionName: functionName,
          args: args,
        }),
        value: 0n,
        requireSuccess: true,
      };
      calls.push(currentCall);
    }

    const publicClient = this.sdk.getPublicClient();

    let totalRetries = 0;
    let finalTx: CallParameters | undefined;
    while (true) {
      try {
        const multicallData = encodeFunctionData({
          abi: multicallInstance.abi,
          functionName: 'aggregate3Value',
          args: [calls],
        });

        let totalValue = 0n;
        for (const tx of calls) {
          totalValue += tx.value || 0n;
        }

        finalTx = {
          account: this.sdk.accountAddress,
          to: multicallInstance.address,
          data: multicallData,
          value: totalValue,
        };

        // console.log('Final tx: ', finalTx);

        // If the call is successful, return the final tx
        await publicClient.call(finalTx);
        return finalTx;
      } catch (error) {
        totalRetries += 1;
        if (totalRetries > MAX_ERC7412_RETRIES) {
          throw new Error('MAX_ERC7412_RETRIES retries reached, tx failed after multiple attempts');
        }

        const parsedError = parseError(error as CallExecutionError);

        const isErc7412Error =
          parsedError.startsWith(SIG_ORACLE_DATA_REQUIRED) || parsedError.startsWith(SIG_FEE_REQUIRED);
        if (!isErc7412Error) {
          console.log('Error details: ', error);
          console.log('Parsed Error details: ', parsedError);
          try {
            // let err = decodeErrorResult({
            // abi: abi as Abi,
            // data: parsedError,
            // });
            // console.log('Decoded error:', err);
            throw new Error('Error is not related to Oracle data');
          } catch (e) {
            if (finalTx) return finalTx;
            console.log('Error is not related to Oracle data');
            throw e;
          }
        }

        calls = await this.handleErc7412Error(error, calls);
        // console.log('Calls array after handleErc7412Error', calls);
      }
    }
  }

  /**
   * Calls the `functionName` on `contractAddress` target using the Multicall contract. If the call requires
   * a price update, ERC7412 price update tx is prepended to the tx.
   * @param contractAddress Target contract address for the call
   * @param abi Contract ABI
   * @param functionNames Function to be called on the contract
   * @param argsList Array of arguments list for the function call
   * @param calls Array of Call3Value calls for Multicall contract
   * @returns Array of responses from the contract function call for the multicalls
   */
  public async multicallMultifunctionErc7412(
    contractAddress: Address,
    abi: unknown,
    functionNames: string[],
    argsList: unknown[],
    calls: Call3Value[] = [],
  ) {
    const multicallInstance = await this.sdk.contracts.getMulticallInstance();

    // Format the args to the required array format
    argsList = argsList.map((args) => (Array.isArray(args) ? args : [args]));
    const numPrependedCalls = calls.length;

    if (argsList.length != functionNames.length) {
      throw new Error("Inconsistent data: args and functionName don't match");
    }
    argsList.forEach((args, index) => {
      const currentCall: Call3Value = {
        target: contractAddress,
        callData: encodeFunctionData({
          abi: abi as Abi,
          functionName: functionNames[index],
          args: args as unknown[],
        }),
        value: 0n,
        requireSuccess: true,
      };
      calls.push(currentCall);
    });

    const numCalls = calls.length - numPrependedCalls;
    const publicClient = this.sdk.getPublicClient();

    let totalRetries = 0;
    while (true) {
      try {
        const multicallData = encodeFunctionData({
          abi: multicallInstance.abi,
          functionName: 'aggregate3Value',
          args: [calls],
        });

        let totalValue = 0n;
        for (const tx of calls) {
          totalValue += tx.value || 0n;
        }

        const finalTx = {
          account: this.sdk.accountAddress,
          to: publicClient.chain?.contracts?.multicall3?.address,
          data: multicallData,
          value: totalValue,
        };

        const response = await publicClient.call(finalTx);

        const multicallResult: Result[] = this.decodeResponse(
          multicallInstance.abi,
          'aggregate3Value',
          response.data as Hex,
        ) as unknown as Result[];

        const callsToDecode = multicallResult.slice(-numCalls);

        const decodedResult = callsToDecode.map((result, idx) =>
          this.decodeResponse(abi, functionNames[idx], result.returnData),
        );
        return decodedResult;
      } catch (error) {
        totalRetries += 1;
        if (totalRetries > MAX_ERC7412_RETRIES) {
          throw new Error('MAX_ERC7412_RETRIES retries reached, tx failed after multiple attempts');
        }
        const parsedError = parseError(error as CallExecutionError);

        const isErc7412Error =
          parsedError.startsWith(SIG_ORACLE_DATA_REQUIRED) || parsedError.startsWith(SIG_FEE_REQUIRED);
        if (!isErc7412Error) {
          console.log('Error details: ', error);
          console.log('Parsed Error details: ', parsedError);
          throw new Error('Error is not related to Oracle data');
        }

        calls = await this.handleErc7412Error(error, calls);
        // console.log('Calls array after handleErc7412Error', calls);
      }
    }
  }
}
