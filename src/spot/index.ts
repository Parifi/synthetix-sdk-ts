import { Address, CallParameters, erc20Abi, getContract, Hex, parseUnits } from 'viem';
import { SynthetixSdk } from '..';
import { SpotMarketData } from '../perps/interface';
import { DISABLED_MARKETS, ZERO_ADDRESS } from '../constants';
import { convertWeiToEther } from '../utils';

/**
 * Class for interacting with Synthetix V3 spot market contracts.
 * Provider methods for wrapping and unwrapping assets, approvals, atomic orders, and async orders.
 * Use ``get`` methods to fetch information about balances, allowances, and markets
 * const { marketsById, marketsByName } = await sdk.perps.getMarkets();
 *
 * Other methods prepare transactions, and submit them to your RPC.
 * An instance of this module is available as ``sdk.spot``. If you are using a network without
 * spot contracts deployed, the contracts will be unavailable and the methods will raise an error.
 * The following contracts are required:
 * - SpotMarketProxy
 */
export class Spot {
  sdk: SynthetixSdk;
  defaultAccountId?: bigint;
  accountIds: bigint[];

  marketsById: Map<number, SpotMarketData>;
  marketsByName: Map<string, SpotMarketData>;

  asyncOrderEnabled: boolean = false;
  disabledMarkets: number[] = [];

  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
    this.accountIds = [];

    this.marketsById = new Map<number, SpotMarketData>();
    this.marketsByName = new Map<string, SpotMarketData>();

    if (synthetixSdk.rpcConfig.chainId == 42161 || synthetixSdk.rpcConfig.chainId == 421614) {
      this.asyncOrderEnabled = true;
    }

    // Set disabled markets
    if (synthetixSdk.rpcConfig.chainId in DISABLED_MARKETS) {
      this.disabledMarkets = DISABLED_MARKETS[synthetixSdk.rpcConfig.chainId];
    }
  }

  /**
   * Look up the market_id and market_name for a market. If only one is provided,
   * the other is resolved. If both are provided, they are checked for consistency.
   * @param marketId Id of the market to resolve
   * @param marketName Name of the market to resolve
   */
  public resolveMarket(
    marketId: number | undefined = undefined,
    marketName: string | undefined = undefined,
  ): { resolvedMarketId: number; resolvedMarketName: string } {
    let resolvedMarketId, resolvedMarketName;

    const hasMarketId = marketId != undefined;
    const hasMarketName = marketName != undefined;

    if (!hasMarketId && hasMarketName) {
      if (this.marketsByName.has(marketName)) {
        resolvedMarketId = this.marketsByName.get(marketName)?.marketId;
      } else {
        throw new Error('Invalid market name');
      }
    } else if (hasMarketId && !hasMarketName) {
      if (this.marketsById.has(marketId)) {
        resolvedMarketName = this.marketsById.get(marketId)?.marketName;
      }
    } else if (hasMarketId && hasMarketName) {
      const marketNameLookup = this.marketsById.get(marketId)?.marketName;
      if (marketNameLookup != marketName) {
        throw new Error(`Market name ${marketName} does not match market id ${marketId}`);
      }
    } else {
      throw new Error('Must provide either a marketId or marketName');
    }
    return {
      resolvedMarketId: (resolvedMarketId ?? marketId) as number,
      resolvedMarketName: resolvedMarketName ?? marketName ?? 'Unresolved market',
    };
  }

  /**
   * Fetches contracts and metadata about all spot markets on the network. This includes
   * the market id, synth name, contract address, and the underlying synth contract. Each
   * synth is an ERC20 token, so these contracts can be used for transfers and allowances.
   * The metadata is also used to simplify interactions in the SDK by mapping market ids
   * and names to their metadata
   * For example:
   *    sdk.spot.wrap(100, market_name='sUSDC', submit=True)
   * This will look up the market id for the sUSDC market and use that to wrap 100 USDC into sUSDC.
   * The market metadata is returned from the method as a mapping object of two dictionaries/records.
   * The first is keyed by ``marketsById`` and the second is keyed by ``marketsByName``
   * For example: sdk.spot.marketsByName
   * Response: {
      'sUSD' => {
        marketId: 0,
        marketName: 'sUSD',
        contractAddress: '0x682f0d17feDC62b2a0B91f8992243Bf44cAfeaaE'
      },

   * Example:  sdk.spot.marketsById
   * Response: {
      0 => {
        marketId: 0,
        marketName: 'sUSD',
        contractAddress: '0x682f0d17feDC62b2a0B91f8992243Bf44cAfeaaE'
      },...
   */
  public async getMarkets(): Promise<{
    marketsById: Map<number, SpotMarketData>;
    marketsByName: Map<string, SpotMarketData>;
  }> {
    // Initialize markets with defaults
    const usdProxy = await this.sdk.contracts.getUSDProxyInstance();
    this.marketsById.set(0, {
      marketId: 0,
      marketName: 'sUSD',
      contractAddress: usdProxy.address,
    });

    this.marketsByName.set('sUSD', {
      marketId: 0,
      marketName: 'sUSD',
      contractAddress: usdProxy.address,
    });

    const spotProxy = await this.sdk.contracts.getSpotMarketProxyInstance();
    let finalSynths: SpotMarketData[] = [];

    // Iterate through all the market IDs until ADDRESS_ZERO is returned
    const MAX_MARKETS = 100;
    const ITEMS_PER_ITER = 5;

    for (let index = 0; index < MAX_MARKETS; index += ITEMS_PER_ITER) {
      const argsList = Array.from({ length: ITEMS_PER_ITER }, (_, i) => index + i);
      const synthAddresses = (await this.sdk.utils.multicallErc7412(
        spotProxy.address,
        spotProxy.abi,
        'getSynth',
        argsList,
      )) as Address[];

      synthAddresses.forEach((synthAddress, idx) => {
        // Filter disabled and invalid markets
        const isMarketDisabled = this.disabledMarkets.includes(argsList[idx]);
        if (synthAddress != ZERO_ADDRESS && !isMarketDisabled) {
          finalSynths.push({
            marketId: argsList[idx],
            contractAddress: synthAddress,
          });
        }
      });

      // Do not query additional markets if the last fetched market was zero address
      if (synthAddresses.at(-1) == ZERO_ADDRESS) {
        break;
      }
    }

    // @todo Add settlement strategies
    if (this.asyncOrderEnabled) {
      // Get settlement strategies
    } else {
      console.log('Async orders not enabled on network ', this.sdk.rpcConfig.chainId);
    }

    // Query ERC20 contract for market details for each synth
    const multicallInputs: any = [];
    finalSynths.forEach((synth) => {
      multicallInputs.push({
        address: synth.contractAddress,
        abi: erc20Abi,
        functionName: 'symbol',
      });
    });

    const synthSymbols = await this.sdk.publicClient.multicall({
      contracts: multicallInputs,
    });

    finalSynths.forEach((synth, idx) => {
      if (synthSymbols.at(idx)?.status == 'success') {
        const name = synthSymbols.at(idx)?.result as string;
        synth.marketName = name;
        synth.symbol = name.slice(1); // Example: Remove initial character 's' from sETH.
      }
    });

    // Populate the final market objects
    finalSynths.forEach((synth) => {
      this.marketsById.set(synth.marketId, synth);
      this.marketsByName.set(synth.marketName ?? 'INVALID', synth);
    });

    return { marketsById: this.marketsById, marketsByName: this.marketsByName };
  }

  /**
   * Fetch the underlying synth contract for a market. Synths are represented as an ERC20 token,
   * so this is useful to do things like check allowances or transfer tokens.
   * This method requires a ``marketId`` or ``marketName`` to be provided.
   * @param marketId The id of the market.
   * @param marketName The name of the market
   * @returns
   */
  public async getSynthContract(marketId?: number, marketName?: string) {
    const { resolvedMarketId } = this.resolveMarket(marketId, marketName);

    const contractAddress = this.marketsById.get(resolvedMarketId)?.contractAddress;
    if (contractAddress == undefined) {
      throw new Error('Invalid market - contractAddress');
    }

    const synthContract = getContract({
      address: contractAddress as Hex,
      abi: erc20Abi,
      client: this.sdk.publicClient,
    });
    return synthContract;
  }

  /**
   * Get the balance of a spot synth. Provide either a ``marketId`` or ``marketName``
   * to choose the synth.
   * @param address The address to check the balance of. If not provided, the
   * current account will be used.
   * @param marketId The id of the market.
   * @param marketName The name of the market.
   * @returns The balance of the synth in ether.
   */
  public async getBalance(address?: string, marketId?: number, marketName?: string): Promise<number> {
    if (address == undefined) {
      address = this.sdk.accountAddress;
    }

    const synthContract = await this.getSynthContract(marketId, marketName);
    const balance = await synthContract.read.balanceOf([address as Hex]);
    return convertWeiToEther(balance);
  }


  public async wrap(size: string, marketId: Number, submit: boolean) {
    const sizeInWei = parseUnits(size.toString(), 6);
    const spotMarketProxy = await this.sdk.contracts.getSpotMarketProxyInstance();
    const tx: CallParameters = await this.sdk.utils.writeErc7412(spotMarketProxy.address, spotMarketProxy.abi, 'wrap', [
      marketId,
      sizeInWei,
      sizeInWei,
    ]);

    if (submit) {
      const txHash = await this.sdk.executeTransaction(tx);
      console.log('Wrap tx hash', txHash);
      return txHash;
    } else {
      return tx;
    }
  }
}
