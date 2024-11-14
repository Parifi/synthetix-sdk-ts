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
  Hash,
  Hex,
  parseAbiParameters,
} from 'viem';
import { SynthetixSdk } from '..';
import { IERC7412Abi } from '../contracts/abis/IERC7412';
import { Call3Value, Result } from '../interface/contractTypes';
import { parseError } from './parseError';
import { MAX_ERC7412_RETRIES, SIG_ERRORS, SIG_FEE_REQUIRED, SIG_ORACLE_DATA_REQUIRED } from '../constants';
import {
  OverrideParamsWrite,
  TransactionData,
  WriteContractParams,
  WriteErc7412,
  WriteReturnType,
} from '../interface/commonTypes';
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

  async handleOracleDataRequiredError(parsedError: Hash): Promise<Call3Value> {
    const err = decodeErrorResult({
      abi: IERC7412Abi,
      data: parsedError,
    });

    const oracleAddress = err.args![0] as Address;
    const oracleQuery = err.args![1] as Hex;
    const signedRequiredData = await this.fetchOracleUpdateData(oracleQuery);
    const dataVerificationTx = this.generateDataVerificationTx(oracleAddress, signedRequiredData);

    return dataVerificationTx;
  }

  /**
   * Handles ERC7412 error by creating a price update tx which is prepended to the existing calls
   * @param error Error thrown by the call function
   * @param calls Multicall call data
   * @returns call array with ERC7412 fulfillOracleQuery transaction
   */
  public async handleErc7412Error(parsedError: Hash): Promise<Call3Value[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let err: any;

    try {
      err = decodeErrorResult({
        abi: IERC7412Abi,
        data: parsedError,
      });
    } catch (decodeErr) {
      console.log('Decode Error: ', decodeErr);
      throw new Error('Handle ERC7412 error');
    }

    console.log('=== err', err);

    if (!['OracleDataRequired', 'FeeRequired', 'Errors'].includes(err?.errorName))
      throw new Error('Handle ERC7412 error');

    if (err?.errorName === 'Errors') {
      const oracleCalls = err.args[0] as Hex[];
      const resolvedCalls = [];
      console.log('=== oracleError', oracleCalls.length);
      for (const oracleCall of oracleCalls) {
        const resolvedCall = await this.handleErc7412Error(oracleCall);
        resolvedCalls.push(resolvedCall);
      }
      return resolvedCalls.flat();
    }

    if (err?.errorName === 'OracleDataRequired') {
      console.log('Oracle Data Required error, adding price update data to tx');

      return [await this.handleOracleDataRequiredError(parsedError)];
    }

    // console.log('Fee Required oracle error. Adding fee to tx.value', err);
    // if (!calls.length) throw new Error('Handle ERC7412 error: Calls.length == 0');
    //
    // calls[0].value = err.args[0] as bigint;

    return [];
  }

  /**
   * Generates Call3Value tx for Price update data of Oracle
   * @param oracleContract Oracle Contract address
   * @param signedRequiredData Encoded Price Update data
   * @returns Transaction Request for Oracle price update
   */
  public generateDataVerificationTx(oracleContract: Hex, signedRequiredData: string): Call3Value {
    const priceUpdateCall: Call3Value = {
      // target: '0x59d6Ec32e05900949D7FFF679a4aDc7F94F0208C',
      target: oracleContract,
      callData: encodeFunctionData({
        abi: IERC7412Abi as unknown as Abi,
        functionName: 'fulfillOracleQuery',
        args: [signedRequiredData],
      }),
      value: 500n,
      requireSuccess: false,
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
  public async callErc7412({ contractAddress, abi, args, functionName, calls = [] }: WriteContractParams) {
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

    const oracleCalls = await this.getMissingOracleCalls(calls);
    const multicallData = encodeFunctionData({
      abi: multicallInstance.abi,
      functionName: 'aggregate3Value',
      args: [[...oracleCalls, ...calls]],
    });

    const totalValue = calls.reduce((acc, tx) => {
      return acc + (tx.value || 0n);
    }, 0n);

    const finalTx = {
      account: this.sdk.accountAddress,
      to: multicallInstance.address,
      data: multicallData,
      value: totalValue,
    };

    const response = await publicClient.call(finalTx);

    if (!response.data) throw new Error('Error decoding call data');
    const multicallResult: Result[] = this.decodeResponse(
      multicallInstance.abi,
      'aggregate3Value',
      response.data as Hex,
    ) as unknown as Result[];

    const returnData = multicallResult.at(-1);

    if (!returnData?.success) throw new Error('Error decoding call data');

    const decodedResult = this.decodeResponse(abi, functionName, returnData.returnData);
    return decodedResult;
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
  public async multicallErc7412({
    contractAddress,
    abi,
    functionName,
    args: argsList,
    calls = [],
  }: WriteContractParams) {
    const multicallInstance = await this.sdk.contracts.getMulticallInstance();

    // Format the args to the required array format
    argsList = argsList.map((args) => (Array.isArray(args) ? args : [args]));

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
    const oracleCalls = await this.getMissingOracleCalls(calls);
    console.log('=== oracleCalls', oracleCalls);

    const numCalls = calls.length;
    const publicClient = this.sdk.getPublicClient();
    const multicallData = encodeFunctionData({
      abi: multicallInstance.abi,
      functionName: 'aggregate3Value',
      args: [[...oracleCalls, ...calls]],
    });

    const totalValue = oracleCalls.reduce((acc, tx) => {
      return acc + (tx.value || 0n);
    }, 0n);

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
  }
  protected isWriteContractParams(data: WriteErc7412): data is WriteContractParams {
    return (data as WriteContractParams).contractAddress !== undefined;
  }

  /**
   * Simulates the `functionName` on `contractAddress` target using the Multicall contract and returns the
   * final transaction call with ERC7412 price update data if required
   * @param contractAddress Target contract address for the call
   * @param abi Contract ABI
   * @param functionName Function to be called on the contract
   * @param args Arguments list for the function call
   * @param calls Array of Call3Value calls for Multicall contract
   * @param override Override parameters for the transaction
   * @returns Final transaction call with ERC7412 price update data if required
   */
  public async writeErc7412(
    data: WriteErc7412,
    override: OverrideParamsWrite = {
      shouldRevertOnTxFailure: true,
    },
  ): Promise<TransactionData> {
    const calls: Call3Value[] = data.calls ?? [];
    const multicallInstance = await this.sdk.contracts.getMulticallInstance();

    if (this.isWriteContractParams(data)) {
      const { contractAddress, abi, functionName, args } = data as WriteContractParams;
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
      account: override.account || this.sdk.accountAddress,
      to: multicallInstance.address,
      data: multicallData,
      value: totalValue,
    };

    const publicClient = this.sdk.getPublicClient();

    if (override.shouldRevertOnTxFailure) await publicClient.call(finalTx);

    return this._fromCallDataToTransactionData(finalTx);
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
  public async multicallMultifunctionErc7412({
    contractAddress,
    abi,
    functionNames,
    args: argsList,
    calls = [],
  }: Omit<WriteContractParams, 'functionName'> & { functionNames: string[] }) {
    const multicallInstance = await this.sdk.contracts.getMulticallInstance();

    // Format the args to the required array format
    argsList = argsList.map((args) => (Array.isArray(args) ? args : [args]));

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

    const publicClient = this.sdk.getPublicClient();
    const oracleCalls = await this.getMissingOracleCalls(calls);

    const multicallData = encodeFunctionData({
      abi: multicallInstance.abi,
      functionName: 'aggregate3Value',
      args: [[...oracleCalls, ...calls]],
    });

    let totalValue = 0n;
    for (const tx of oracleCalls) {
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

    const callsToDecode = multicallResult.slice(-oracleCalls.length);

    const decodedResult = callsToDecode.map((result, idx) =>
      this.decodeResponse(abi, functionNames[idx], result.returnData),
    );
    return decodedResult;
  }

  public async getMissingOracleCalls(
    calls: Call3Value[],
    oracleCalls: Call3Value[] = [],
    { attempts = MAX_ERC7412_RETRIES, account }: { attempts?: number; account?: Address } = {},
  ): Promise<Call3Value[]> {
    const publicClient = this.sdk.getPublicClient();
    const totalValue = calls.reduce((acc, tx) => {
      return acc + (tx.value || 0n);
    }, 0n);

    const multicallInstance = await this.sdk.contracts.getMulticallInstance();
    const multicallData = encodeFunctionData({
      abi: multicallInstance.abi,
      functionName: 'aggregate3Value',
      args: [[...oracleCalls, ...calls]],
    });

    const parsedTx = {
      account: account || this.sdk.accountAddress,
      to: multicallInstance.address,
      data: multicallData,
      value: totalValue,
    };
    const blockNumber = await publicClient.getBlockNumber();

    try {
      await publicClient.call(parsedTx);
      return oracleCalls;
    } catch (error) {
      const parsedError = parseError(error as CallExecutionError);

      const isErc7412Error = this.isErc7412Error(parsedError);

      console.log('=== attempts', {
        attempts,
        parsedTx,
        calls,
        blockNumber,
        oracleCalls,
        error,
        parsedError,
        isErc7412Error,
      });
      //
      if (!isErc7412Error) return oracleCalls;
      if (isErc7412Error && !attempts) return oracleCalls;

      const data = await this.handleErc7412Error(parsedError);

      return await this.getMissingOracleCalls(calls, [...oracleCalls, ...data], { attempts: attempts - 1, account });
    }
  }

  _fromCall3ToTransactionData(call: Call3Value): TransactionData {
    return {
      to: call.target,
      data: call.callData,
      value: call?.value?.toString() ?? '0',
    } as TransactionData;
  }

  _fromCallDataToTransactionData(calls: CallParameters): TransactionData {
    return {
      to: calls.to as Address,

      data: calls.data as Hash,
      value: calls?.value?.toString() ?? '0',
    } as TransactionData;
  }
  _fromTransactionDataToCallData(data: TransactionData): CallParameters {
    return {
      account: this.sdk.accountAddress,
      to: data.to,
      data: data.data,
      value: BigInt(data.value || 0),
    } as CallParameters;
  }

  async processTransactions(data: Call3Value[], override: OverrideParamsWrite): Promise<WriteReturnType> {
    const useOracleCall = override.useOracleCalls ?? true;
    const oracleCalls = useOracleCall ? await this.getMissingOracleCalls(data) : [];
    console.log('=== oracleCalls', oracleCalls);
    const txs = [...oracleCalls, ...data];
    if (!override.useMultiCall && !override.submit) return txs.map(this.sdk.utils._fromCall3ToTransactionData);

    const tx = await this.sdk.utils.writeErc7412({ calls: txs }, override);
    if (!override.submit) return [tx];

    return this.sdk.executeTransaction(this.sdk.utils._fromTransactionDataToCallData(tx));
  }

  handleRetryLogic(error: unknown, override: OverrideParamsWrite, totalRetries: number = MAX_ERC7412_RETRIES): boolean {
    totalRetries -= 1;
    if (totalRetries <= MAX_ERC7412_RETRIES) {
      if (override.shouldRevertOnTxFailure)
        throw new Error('MAX_ERC7412_RETRIES retries reached, tx failed after multiple attempts');
      return false;
    }

    const parsedError = parseError(error as CallExecutionError);

    const isErc7412Error = this.isErc7412Error(parsedError);

    if (!isErc7412Error) {
      if (override.shouldRevertOnTxFailure) throw new Error('Error is not related to Oracle data');
      return false;
    }

    return true;
  }

  isErc7412Error(parsedError: Hash): boolean {
    return (
      parsedError.startsWith(SIG_ORACLE_DATA_REQUIRED) ||
      parsedError.startsWith(SIG_FEE_REQUIRED) ||
      parsedError.startsWith(SIG_ERRORS)
    );
  }
}
