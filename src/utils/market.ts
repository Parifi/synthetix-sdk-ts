import { parseUnits } from 'viem';
import { SynthetixSdk } from '..';
import { DISABLED_MARKETS } from '../constants';
import { MarketIdOrName } from '../interface/commonTypes';
import { MarketData, SpotMarketData } from '../perps/interface';

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

    const chainIds = [8453, 84532, 42161, 421514];
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
}
