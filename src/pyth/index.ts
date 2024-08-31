import axios, { AxiosInstance } from 'axios';
import { SynthetixSdk } from '..';
import { DEFAULT_PYTH_TIMEOUT, PUBLIC_PYTH_ENDPOINT } from '../constants';

/**
 * Pyth class
 */
export class Pyth {
  sdk: SynthetixSdk;
  pythClient: AxiosInstance;

  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
    this.pythClient = {} as AxiosInstance;
  }

  async initPyth() {
    this.pythClient = await this.getPythClient();
  }

  /**
   * Get Pyth client instance
   * @returns Pyth client object based on the params provided
   */
  async getPythClient(): Promise<AxiosInstance> {
    const pythServiceEndpoint = this.sdk.pythConfig.pythEndpoint;
    const pythServiceUsername = this.sdk.pythConfig.username;
    const pythServicePassword = this.sdk.pythConfig.password;
    const ttl = this.sdk.pythConfig.cacheTtl ?? DEFAULT_PYTH_TIMEOUT;

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
            timeout: ttl,
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
          timeout: ttl,
        });
      }
    } catch (error) {
      console.error('Error when creating Pyth instance:', error);
      throw error;
    }
  }

  /**
   * The function accepts an array of priceIds and returns the priceUpdateData from Pyth
   * @param priceIds Pyth Price IDs array
   * @returns Encoded Pyth price update data
   */
  public getVaaPriceUpdateData = async (priceIds: string[]): Promise<string[]> => {
    let priceUpdateData: string[] = [];

    try {
      const response = await this.pythClient.get('/api/latest_vaas', {
        params: {
          ids: priceIds,
        },
      });
      priceUpdateData = response.data;
    } catch (error) {
      console.log('Error fetching data from Pyth', error);
      throw error;
    }

    return priceUpdateData.map((vaa) => '0x' + Buffer.from(vaa, 'base64').toString('hex'));
  };
}