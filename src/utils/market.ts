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
  public async resolveMarket(
    marketIdOrName: MarketIdOrName,
  ): Promise<{ resolvedMarketId: number; resolvedMarketName: string }> {
    // Do not resolve markets if flag is not set or if market name is passed as
    // an argument
    if (!this.sdk.resolveMarketNames && typeof marketIdOrName === 'number') {
      console.log('Resolve markets set to false. Returning market id without validating...');
      return { resolvedMarketName: 'Unresolved Market', resolvedMarketId: Number(marketIdOrName) };
    }

    const market = await this.getMarket(marketIdOrName);
    if (!market?.marketName || market?.marketId === undefined)
      throw new Error(`Market not found for ${marketIdOrName}`);

    return { resolvedMarketName: market.marketName, resolvedMarketId: market.marketId };
  }

  /**
   * Format the size of a synth for an order. This is used for synths whose base asset
   * does not use 18 decimals. For example, USDC uses 6 decimals, so we need to handle size
   * differently from other assets.
   * @param size The size as an ether value (e.g. 100).
   * @param marketId The id of the market.
   * @returns The formatted size in wei. (e.g. 100 = 100000000000000000000)
   */
  public async formatSize(size: number, marketId: MarketIdOrName) {
    // TODO: think in a better solution maybe get the collateral and query the decimals from the contract
    if (marketId === 'USDC') return parseUnits(size.toString(), 6);

    return parseUnits(size.toString(), 18);
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
    let priceFeedIds: string[] = [];

    if (marketIds.length != 0) {
      const marketSymbols: string[] = [];
      marketIds.forEach((marketId) => {
        const marketSymbol = this.marketsById.get(marketId)?.symbol;
        if (!marketSymbol) return;
        marketSymbols.push(marketSymbol);
      });

      marketSymbols.forEach((marketSymbol) => {
        const feedId = this.sdk.pyth.priceFeedIds.get(marketSymbol);
        if (!feedId) return;
        priceFeedIds.push(feedId);
      });
    } else {
      priceFeedIds = Array.from(this.sdk.pyth.priceFeedIds.values());
    }

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

  public async getMarket(_marketIdOrName: MarketIdOrName): Promise<T> {
    throw new Error('Method not implemented.');
  }
}
