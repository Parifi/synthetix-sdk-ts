import axios, { AxiosInstance } from 'axios';
import { SynthetixSdk } from '..';
import { DEFAULT_PYTH_TIMEOUT, PUBLIC_PYTH_ENDPOINT } from '../constants';
import { EvmPriceServiceConnection, PriceFeed } from '@pythnetwork/pyth-evm-js';
import { PythConfig } from '../interface/classConfigs';
import { formatUnits, Hex } from 'viem';
import { SYMBOL_TO_PYTH_FEED } from '../constants';

/**
 * Pyth class for interacting with the Pyth price service. The price service is
 * connected to the endpoint specified as ``pythEndpoint`` when initializing
 * the ``Synthetix`` class
 * If an endpoint isn't specified, the default endpoint is used.
 * The default endpoint should be considered unreliable for production applications.
 * The ``Pyth`` class is used to fetch the latest price update data for a list
 * of tokens or feed ids
 */
export class Pyth {
  sdk: SynthetixSdk;
  pythConnection: EvmPriceServiceConnection;

  pythConfig?: PythConfig;
  pythClient: AxiosInstance;

  // To store Market Symbol to Pyth Price ID mapping
  priceFeedIds: Map<string, string>;

  constructor(synthetixSdk: SynthetixSdk, pythConfig?: PythConfig) {
    this.sdk = synthetixSdk;
    this.pythClient = {} as AxiosInstance;
    this.pythConfig = pythConfig;

    let pythEndpoint;
    if (pythConfig != undefined) {
      pythEndpoint = pythConfig.pythEndpoint ?? PUBLIC_PYTH_ENDPOINT;
    } else {
      pythEndpoint = PUBLIC_PYTH_ENDPOINT;
    }

    this.pythConnection = new EvmPriceServiceConnection(pythEndpoint, {
      timeout: DEFAULT_PYTH_TIMEOUT,
    });

    // Initialize empty priceIds data
    this.priceFeedIds = new Map<string, string>();
  }

  async initPyth() {
    this.pythClient = await this.getPythClient();
  }

  /**
   * Get Pyth client instance
   * @returns Pyth client object based on the params provided
   */
  async getPythClient(): Promise<AxiosInstance> {
    let pythServiceEndpoint, pythServiceUsername, pythServicePassword;

    if (this.pythConfig == undefined || this.pythConfig.pythEndpoint == undefined) {
      pythServiceEndpoint = PUBLIC_PYTH_ENDPOINT;
    } else {
      pythServiceEndpoint = this.pythConfig.pythEndpoint;
      pythServiceUsername = this.pythConfig.username;
      pythServicePassword = this.pythConfig.password;
    }

    try {
      if (pythServiceEndpoint) {
        if (pythServiceUsername && pythServicePassword) {
          // If Username and password is provided, connect using credentials
          return axios.create({
            baseURL: pythServiceEndpoint,
            auth: {
              username: pythServiceUsername,
              password: pythServicePassword,
            },
            timeout: this.pythConfig?.cacheTtl ?? DEFAULT_PYTH_TIMEOUT,
          });
        } else {
          // Connect to the PYTH service endpoint without authentication
          return axios.create({
            baseURL: pythServiceEndpoint,
          });
        }
      } else {
        // If Pyth service endpoint is not provided, connect to public endpoints
        return axios.create({
          baseURL: PUBLIC_PYTH_ENDPOINT,
          timeout: this.pythConfig?.cacheTtl ?? DEFAULT_PYTH_TIMEOUT,
        });
      }
    } catch (error) {
      console.error('Error when creating Pyth instance:', error);
      throw error;
    }
  }

  /**
   * The function accepts an array of priceIds and publish Timestamp and
   * returns the priceUpdateData from Pyth for price ids array
   * @param priceIds Pyth Price IDs array
   * @param publishTime Publish time for benchmark data
   * @returns Encoded Pyth price update data
   */
  public getVaaPriceUpdateData = async (priceIds: string[], publishTime: number): Promise<Hex[]> => {
    let priceUpdateData: string[] = [];

    try {
      const response = await this.pythClient.get(`/v2/updates/price/${publishTime}`, {
        params: {
          ids: priceIds,
          encoding: 'hex',
        },
      });
      if (response.status == 200) {
        const responseData = response.data;
        priceUpdateData = responseData.binary?.data ?? [];
      } else {
        throw new Error('Error fetching data from Pyth');
      }
    } catch (error) {
      this.sdk.logger.error('Error fetching data from Pyth', error);
      throw error;
    }
    const updateData = priceUpdateData.map((vaa) => '0x' + vaa);
    return updateData as Hex[];
  };

  /**
   * Update the price feed IDs for the Pyth price service.
   * Additionally sets a lookup for feedId to symbol.
   * @param updatedPriceFeeds Dictionary of feed IDs to update
   */
  public updatePriceFeedIds(updatedPriceFeeds: { symbol: string; feedId: string }[]) {
    updatedPriceFeeds.forEach((feed) => {
      this.priceFeedIds.set(feed.symbol, feed.feedId);
    });
  }

  /**
   * Fetch the latest Pyth price data for a list of feed ids. This is the most reliable way to
   * specify the exact feed you want to fetch data for.
   * @param feedIds An array of price feed ids to fetch the data for
   */
  public async getPriceFromIds(feedIds: Hex[]): Promise<PriceFeed[] | undefined> {
    const pythPrice = await this.pythConnection.getLatestPriceFeeds(feedIds);
    return pythPrice;
  }

  /**
   * Fetch the latest Pyth price data for a list of market symbols. This
   * function is the same as ``getPriceFromIds`` but uses the symbol
   * to fetch the feed id from the lookup table.
   * @param symbols Array of token symbols to get the price details
   */
  public async getPriceFromSymbols(symbols: string[]) {
    const feedIds: Hex[] = [];
    symbols.forEach((tokenSymbol) => {
      const feedId = this.priceFeedIds.get(tokenSymbol) as Hex;
      if (feedId != undefined) {
        feedIds.push(feedId);
      }
    });

    return this.getPriceFromIds(feedIds);
  }

  /**
   * Gets price update data which then can be submitted to Pyth contract to update the prices.
   * This will throw an axios error if there is a network problem or the price service returns
   * a non-ok response (e.g: Invalid price ids)
   * @param priceIds Array of hex-encoded price ids.
   * @returns Array of price update data.
   */
  public async getPriceFeedsUpdateData(feedIds: Hex[]): Promise<Hex[]> {
    const priceUpdateData = await this.pythConnection.getPriceFeedsUpdateData(feedIds);
    return priceUpdateData as Hex[];
  }

  /**
   *
   * @param priceId Pyth price id of the token symbol to fetch the price for
   * @param publishTime Publish time for benchmark data
   * @returns
   */
  public async getFormattedPrice(priceId: Hex, publishTime?: number): Promise<number> {
    let pythPrice: PriceFeed;

    // Get latest price if publishTime is not provided, else fetch benchmark data
    if (publishTime != undefined) {
      pythPrice = await this.pythConnection.getPriceFeed(priceId, publishTime);
    } else {
      const price = await this.pythConnection.getLatestPriceFeeds([priceId]);
      if (price != undefined && price.length > 0) {
        pythPrice = price[0];
      } else {
        throw new Error('Error while fetching Pyth price');
      }
    }

    const priceUnchecked = pythPrice.getPriceUnchecked();
    const price = Number(formatUnits(BigInt(priceUnchecked.price), Math.abs(priceUnchecked.expo)));
    if (price == 0) {
      throw new Error('Invalid price: 0');
    }
    return price;
  }

  /**
   *
   * @param priceId Pyth price id of the token symbol to fetch the price for
   * @param publishTime Publish time for benchmark data
   * @returns
   */
  public async getFormattedPriceSymbol(symbol: string, publishTime?: number): Promise<number> {
    const feedId = this.priceFeedIds.get(symbol);
    if (feedId != undefined) {
      return this.getFormattedPrice(feedId as Hex, publishTime);
    } else {
      throw new Error('Invalid token symbol');
    }
  }

  /**
   * Returns a mapping of token symbol to price ids from constants
   * @returns A map of Token symbol to price id
   */
  public getPriceIdsFromConstants(): Map<string, string> {
    return SYMBOL_TO_PYTH_FEED;
  }
}
