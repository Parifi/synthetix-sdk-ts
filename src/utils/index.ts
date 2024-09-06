export * from './common';

import {
  Abi,
  Address,
  CallParameters,
  ContractFunctionParameters,
  decodeAbiParameters,
  decodeErrorResult,
  decodeFunctionResult,
  encodeFunctionData,
  Hex,
  parseAbiParameters,
} from 'viem';
import { SynthetixSdk } from '..';
import { dynamicImportAbi } from '../contracts/helpers';
import { OracleDataRequiredError } from '../error';
import { IERC7412Abi } from '../contracts/abis/IERC7412';
import { Call3Value, Result } from '../interface/contractTypes';

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

  public decodeResponse(abi: unknown, functionName: string, result: Hex) {
    const decodedResult = decodeFunctionResult({
      abi: abi as Abi,
      functionName: functionName,
      data: result,
    });

    return decodedResult;
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
  public async fetchOffchainData(oracleQuery: Hex): Promise<Hex> {
    const priceIds = this.getPythPriceIdsFromOracleQuery(oracleQuery as Hex);

    const priceUpdateData = await this.sdk.pyth.getVaaPriceUpdateData(priceIds);
    console.log('priceUpdateData', priceUpdateData);
    return priceUpdateData.toString() as Hex;
  }

  /**
   * Generates Tx for Price update data of Oracle
   * @param oracleContract Oracle Contract address
   * @param signedRequiredData Price Update data
   * @returns Transaction Request for Oracle price update
   */
  public generateDataVerificationTx(oracleContract: Hex, signedRequiredData: string): ContractFunctionParameters {
    const priceUpdateTx: ContractFunctionParameters = {
      address: oracleContract,
      abi: IERC7412Abi as unknown as Abi,
      functionName: 'fulfillOracleQuery',
      args: [signedRequiredData],
    };
    return priceUpdateTx;
  }

  /**
   * Encoded calls using the Multicall contract implementation
   * @param tx Transaction(s) object to be called
   * @returns Response of tx execution
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
        console.log("Response: ", response)
        if (response.data != undefined) {
          const multicallResult: Result[] = this.decodeResponse(
            multicallInstance.abi,
            'aggregate3Value',
            response.data as Hex,
          ) as unknown as Result[];

          const returnData = multicallResult.at(-1);
          console.log("Return data", returnData)
          if (returnData?.success && returnData.returnData != undefined) {
            const decodedResult = this.decodeResponse(abi, functionName, returnData.returnData);
            return decodedResult;
          } else {
            throw new Error('Error decoding call data');
          }
        } else {
          throw new Error("Invalid response from function call");

        }
      } catch (error) {
        console.log('error', error);

        // if (error instanceof OracleDataRequiredError) {
        //   // @todo Add updated Pyth contract logic
        // }
        throw error;

      }
    }
  }

  /**
   * Encoded calls using the Multicall contract implementation
   * @param tx Transaction(s) object to be called
   * @returns Response of tx execution
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
        console.log('error', error);

        if (error instanceof OracleDataRequiredError) {
          // @todo Add updated Pyth contract logic
        }
        throw error;
      }
    }
  }

  /**
   * Encoded calls using the Multicall contract implementation
   * @param tx Transaction(s) object to be called
   * @returns Response of tx execution
   */
  public async writeErc7412(
    contractAddress: Address,
    abi: unknown,
    functionName: string,
    args: unknown[],
    calls: Call3Value[] = [],
  ): Promise<CallParameters> {
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

        const finalTx: CallParameters = {
          account: this.sdk.accountAddress,
          to: multicallInstance.address,
          data: multicallData,
          value: totalValue,
        };

        // If the call is successful, return the final tx
        await publicClient.call(finalTx);
        return finalTx;
      } catch (error) {
        console.log('error', error);

        if (error instanceof OracleDataRequiredError) {
          // @todo Add updated Pyth contract logic
        }
        throw error;
      }
    }
  }
}
