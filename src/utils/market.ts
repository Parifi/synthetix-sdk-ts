import { encodeAbiParameters, Hex, parseUnits } from 'viem';
import { SynthetixSdk } from '..';
import { DISABLED_MARKETS } from '../constants';
import { MarketIdOrName } from '../interface/commonTypes';
import { MarketData, SpotMarketData } from '../perps/interface';
import { Call3Value } from '../interface/contractTypes';

export abstract class Market<T extends MarketData | SpotMarketData> {
  sdk: SynthetixSdk;
  marketsById: Map<number, T>;
  marketsByName: Map<string, T>;

  // Mapping of Market Symbol to T.
  // @note Ideally prefer using market symbol over market name
  marketsBySymbol: Map<string, T>;
  disabledMarkets: number[] = [];

  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
    // Initialize empty market data
    this.marketsById = new Map<number, T>();
    this.marketsByName = new Map<string, T>();
    this.marketsBySymbol = new Map<string, T>();

    // Set disabled markets
    if (synthetixSdk.rpcConfig.chainId in DISABLED_MARKETS) {
      this.disabledMarkets = DISABLED_MARKETS[synthetixSdk.rpcConfig.chainId];
    }
  }
  /**
   * Look up the market_id and market_name for a market. If only one is provided,
   * the other is resolved. If both are provided, they are checked for consistency.
   * @param marketIdOrName Id or name of the market to resolve
   */
  public resolveMarket(marketIdOrName: MarketIdOrName): { resolvedMarketId: number; resolvedMarketName: string } {
    const isMarketId = typeof marketIdOrName === 'number';

    if (!isMarketId) {
      if (!this.marketsByName.has(marketIdOrName)) throw new Error('Invalid market name');
      const resolvedMarketId = this.marketsByName.get(marketIdOrName)!.marketId;
      return { resolvedMarketId: resolvedMarketId!, resolvedMarketName: marketIdOrName };
    }

    if (!this.marketsById.has(marketIdOrName)) throw new Error('Invalid market id');
    const resolvedMarketName = this.marketsById.get(marketIdOrName)!.marketName;

    return { resolvedMarketName: resolvedMarketName!, resolvedMarketId: marketIdOrName };
  }

  /**
   * Format the size of a synth for an order. This is used for synths whose base asset
   * does not use 18 decimals. For example, USDC uses 6 decimals, so we need to handle size
   * differently from other assets.
   * @param size The size as an ether value (e.g. 100).
   * @param marketId The id of the market.
   * @returns The formatted size in wei. (e.g. 100 = 100000000000000000000)
   */
  public formatSize(size: number, marketId: number): bigint {
    const { resolvedMarketName } = this.resolveMarket(marketId);
    let sizeInWei: bigint;

    const chainIds = [8453, 84532, 42161, 421614];
    const marketNames = ['sUSDC', 'sStataUSDC'];

    // Hard-coding a catch for USDC with 6 decimals
    if (chainIds.includes(this.sdk.rpcConfig.chainId) && marketNames.includes(resolvedMarketName)) {
      sizeInWei = parseUnits(size.toString(), 6);
    } else {
      sizeInWei = parseUnits(size.toString(), 18);
    }
    console.log(`Size ${size} in wei for market ${resolvedMarketName}: ${sizeInWei}`);
    return sizeInWei;
  }

  /**
   *   Prepare a call to the external node with oracle updates for the specified market names.
   * The result can be passed as the first argument to a multicall function to improve performance
   * of ERC-7412 calls. If no market names are provided, all markets are fetched. This is useful for
   * read functions since the user does not pay gas for those oracle calls, and reduces RPC calls and
   * runtime.
   * @param {number[]} marketIds An array of market ids to fetch prices for. If not provided, all markets are fetched
   * @returns {Promise<Call3Value[]>} objects representing the target contract, call data, value, requireSuccess flag and other necessary details for executing the function in the blockchain.
   */
  public async prepareOracleCall(marketIds: number[] = []): Promise<Call3Value[]> {
    let marketSymbols: string[] = [];

    if (marketIds.length == 0) {
      marketSymbols = Array.from(this.marketsBySymbol.keys());
    } else {
      marketIds.forEach((marketId) => {
        const marketSymbol = this.marketsById.get(marketId)?.symbol;
        if (!marketSymbol) return;
        marketSymbols.push(marketSymbol);
      });
    }

    const priceFeedIds: string[] = [];
    marketSymbols.forEach((marketSymbol) => {
      const feedId = this.sdk.pyth.priceFeedIds.get(marketSymbol);
      if (!feedId) return;
      priceFeedIds.push(feedId);
    });

    if (!priceFeedIds.length) {
      return [];
    }

    const stalenessTolerance = 30n; // 30 seconds
    const updateData = await this.sdk.pyth.getPriceFeedsUpdateData(priceFeedIds as Hex[]);

    const signedRequiredData = encodeAbiParameters(
      [
        { type: 'uint8', name: 'updateType' },
        { type: 'uint64', name: 'stalenessTolerance' },
        { type: 'bytes32[]', name: 'priceIds' },
        { type: 'bytes[]', name: 'updateData' },
      ],
      [1, stalenessTolerance, priceFeedIds as Hex[], updateData],
    );

    const pythWrapper = await this.sdk.contracts.getPythErc7412WrapperInstance();
    const dataVerificationTx = this.sdk.utils.generateDataVerificationTx(pythWrapper.address, signedRequiredData);

    // set `requireSuccess` to false in this case, since sometimes
    // the wrapper will return an error if the price has already been updated

    // @note A better approach would be to fetch the priceUpdateFee for tx dynamically
    // from the Pyth contract instead of using arbitrary values for pyth price update fees
    return [{ ...dataVerificationTx, value: 500n, requireSuccess: false }];
  }

  protected async _getOracleCalls(txs: Call3Value[]) {
    const oracleCalls = await this.prepareOracleCall([]);
    const calls = [...oracleCalls, ...txs];
    const missingCalls = await this.sdk.utils.getMissingOracleCalls(calls);

    return [...missingCalls, ...calls];
  }
}
