import { CallParameters, formatEther } from 'viem';
import { SynthetixSdk } from '..';
import { ZERO_ADDRESS } from '../constants';
import { MarketData, MarketSummary } from './interface';

/**
 * Class for interacting with Synthetix V3 core contracts
 * @remarks
 *
 */
export class Perps {
  sdk: SynthetixSdk;
  defaultAccountId?: bigint;
  accountIds: bigint[];

  // Markets data
  marketsById: Map<string, MarketData>;
  marketsByName: Map<string, MarketData>;

  constructor(synthetixSdk: SynthetixSdk) {
    this.sdk = synthetixSdk;
    this.defaultAccountId =
      process.env.PERPS_ACCOUNT_ID == undefined ? undefined : BigInt(process.env.PERPS_ACCOUNT_ID);
    if (this.defaultAccountId == undefined) {
      this.accountIds = [];
    } else {
      this.accountIds = [this.defaultAccountId];
    }

    // Initialize empty market data
    this.marketsById = new Map<string, MarketData>();
    this.marketsByName = new Map<string, MarketData>();
  }

  /**
   * Fetch a list of perps ``account_id`` owned by an address. Perps accounts
   * are minted as an NFT to the owner's address. The ``account_id`` is the
   * token id of the NFTs held by the address.
   * @param address: The address to get accounts for. Uses connected address if not provided.
   * @param defaultAccountId: The default account ID to set after fetching.
   * @returns A list of account IDs owned by the address
   */

  public async getAccountIds(
    address: string | undefined = undefined,
    defaultAccountId: bigint | undefined = undefined,
  ): Promise<bigint[]> {
    const accountAddress: string = address !== undefined ? address : this.sdk.accountAddress || ZERO_ADDRESS;
    if (accountAddress == ZERO_ADDRESS) {
      throw new Error('Invalid address');
    }

    const accountProxy = await this.sdk.contracts.getPerpsAccountProxyInstance();
    const balance = await accountProxy.read.balanceOf([accountAddress]);
    console.log('balance', balance);

    const argsList = [];

    for (let index = 0; index < Number(balance); index++) {
      argsList.push([accountAddress, index]);
    }
    const accountIds = await this.sdk.utils.multicallErc7412(
      accountProxy.address,
      accountProxy.abi,
      'tokenOfOwnerByIndex',
      argsList,
    );

    console.log('accountIds', accountIds);
    this.sdk.accountIds = accountIds as bigint[];
    if (defaultAccountId) {
      this.defaultAccountId = defaultAccountId;
    } else if (this.sdk.accountIds.length > 0) {
      this.defaultAccountId = this.sdk.accountIds[0];
    }
    console.log('Using default account id as ', this.defaultAccountId);
    this.accountIds = accountIds as bigint[];
    return accountIds as bigint[];
  }

  /**
   * Create a perps account. An account NFT is minted to the sender,
   * who owns the account.
   * @param accountId Id of the account. If not passed, default Perps account ID is used
   * @param submit Executes the transaction if true
   * @returns Transaction hash or transaction data
   */
  public async createAccount(accountId: bigint | undefined = undefined, submit: boolean = false) {
    const txArgs = [];
    if (accountId != undefined) {
      txArgs.push(accountId);
    }

    const perpsAccountProxy = await this.sdk.contracts.getPerpsAccountProxyInstance();
    const tx: CallParameters = await this.sdk.utils.writeErc7412(
      perpsAccountProxy.address,
      perpsAccountProxy.abi,
      'createAccount',
      txArgs,
    );

    if (submit) {
      const txHash = await this.sdk.executeTransaction(tx);
      console.log('Transaction hash: ', txHash);
      await this.getAccountIds();
      return txHash;
    } else {
      return tx;
    }
  }

  /**
   * Fetch the ids and summaries for all perps markets. Market summaries include
   * information about the market's price, open interest, funding rate, and skew
   */
  public async getMarkets() {
    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();
    const marketIds: number[] = (await perpsMarketProxy.read.getMarkets([])) as number[];
    console.log('marketIds', marketIds);

    const marketMetadata = await this.sdk.utils.multicallErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'metadata',
      marketIds as unknown[],
    );
    console.log('marketMetadata', marketMetadata);

    const settlementStrategyInputs: [number, number][] = marketIds.map((marketId) => [marketId, 0]);

    const settlementStrategies = await this.sdk.utils.multicallErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'getSettlementStrategy',
      settlementStrategyInputs,
    );

    console.log('settlementStrategies', settlementStrategies);

    const marketSummaries = await this.getMarketSummaries(marketIds);
    console.log('marketSummaries', marketSummaries);
  }

  public async getMarketSummaries(marketIds: number[]): Promise<MarketSummary[]> {
    interface MarketSummaryResponse {
      skew: bigint;
      size: bigint;
      maxOpenInterest: bigint;
      currentFundingRate: bigint;
      currentFundingVelocity: bigint;
      indexPrice: bigint;
    }

    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const interestRate = await this.sdk.utils.callErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'interestRate',
      [],
    );
    console.log('interestRate', interestRate);

    const marketSummariesInput = marketIds.map((marketId) => [marketId]);

    const marketSummariesResponse: MarketSummaryResponse[] = (await this.sdk.utils.multicallErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'getMarketSummary',
      marketSummariesInput,
    )) as MarketSummaryResponse[];

    console.log('marketSummariesResponse', marketSummariesResponse);

    if (marketIds.length !== marketSummariesResponse.length) {
      console.log('Inconsistent data');
    }

    const marketSummaries: MarketSummary[] = [];
    marketSummariesResponse.forEach((market, index) => {
      const marketId = marketIds[index];

      marketSummaries.push({
        marketId: marketId,
        marketName: '',
        feedId: '',
        indexPrice: Number(formatEther(market.indexPrice)),
        skew: Number(formatEther(market.skew)),
        size: Number(formatEther(market.size)),
        maxOpenInterest: Number(formatEther(market.maxOpenInterest)),
        interestRate: Number(formatEther(interestRate as bigint)),
        currentFundingRate: Number(formatEther(market.currentFundingRate)),
        currentFundingVelocity: Number(formatEther(market.currentFundingVelocity)),
      });
    });
    return marketSummaries;
  }

  public async canLiquidate(accountId: bigint | undefined = undefined): Promise<boolean> {
    if (accountId == undefined) {
      console.log('Using default account ID value :', this.defaultAccountId);
      accountId = this.defaultAccountId;
    }

    const perpsMarketProxy = await this.sdk.contracts.getPerpsMarketProxyInstance();

    const canBeLiquidated = await this.sdk.utils.callErc7412(
      perpsMarketProxy.address,
      perpsMarketProxy.abi,
      'canLiquidate',
      [accountId],
    );
    console.log('canBeLiquidated', canBeLiquidated);
    return canBeLiquidated as boolean;
  }
}
