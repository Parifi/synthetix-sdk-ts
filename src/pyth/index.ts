import axios, { AxiosInstance } from 'axios';
import { SynthetixSdk } from '..';
import { DEFAULT_PYTH_TIMEOUT, PUBLIC_PYTH_ENDPOINT } from '../constants';
import { EvmPriceServiceConnection, PriceServiceConnectionConfig } from '@pythnetwork/pyth-evm-js';
import { PythConfig } from '../interface/classConfigs';

/**
 * Pyth class
 */
export class Pyth {
  sdk: SynthetixSdk;
  pythConnection: EvmPriceServiceConnection;

  // To store Market Symbol to Pyth Price ID mapping
  priceFeedIds: Map<string, string>;

  constructor(synthetixSdk: SynthetixSdk, pythConfig?: PythConfig) {
    this.sdk = synthetixSdk;

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

  async initPyth() {}

  public updatePriceFeedIds(updatedPriceFeeds: { symbol: string; feedId: string }[]) {
    updatedPriceFeeds.forEach((feed) => {
      this.priceFeedIds.set(feed.symbol, feed.feedId);
    });
  }
}
