import { SynthetixSdk } from '..';
import { DISABLED_MARKETS } from '../constants';
import { MarketIdOrName } from '../interface/commonTypes';
import { MarketMetadata, MarketData } from '../perps/interface';

export abstract class Market {
  marketMetadata: Map<number, MarketMetadata>;
  marketsById: Map<number, MarketData>;
  marketsByName: Map<string, MarketData>;

  // Mapping of Market Symbol to MarketData.
  // @note Ideally prefer using market symbol over market name
  marketsBySymbol: Map<string, MarketData>;
  disabledMarkets: number[] = [];

  constructor(synthetixSdk: SynthetixSdk) {
    // Initialize empty market data
    this.marketMetadata = new Map<number, MarketMetadata>();
    this.marketsById = new Map<number, MarketData>();
    this.marketsByName = new Map<string, MarketData>();
    this.marketsBySymbol = new Map<string, MarketData>();

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
}
