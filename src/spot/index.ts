import {
  Address,
  CallParameters,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  getContract,
  Hex,
  maxUint256,
  parseUnits,
} from 'viem';
import { SynthetixSdk } from '..';
import { Side, SpotMarketData, SpotOrder, SpotSettlementStrategy } from '../spot/interface';
import { DISABLED_MARKETS, ZERO_ADDRESS } from '../constants';
import { convertEtherToWei, convertWeiToEther, sleep } from '../utils';

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

  async initSpot() {
    await this.getMarkets();
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
   * Format the size of a synth for an order. This is used for synths whose base asset
   * does not use 18 decimals. For example, USDC uses 6 decimals, so we need to handle size
   * differently from other assets.
   * @param size The size as an ether value (e.g. 100).
   * @param marketId The id of the market.
   * @returns The formatted size in wei. (e.g. 100 = 100000000000000000000)
   */
  public formatSize(size: number, marketId: number): bigint {
    const { resolvedMarketName } = this.resolveMarket(marketId, undefined);
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
      symbol: 'sUSD',
      contractAddress: usdProxy.address,
    });

    this.marketsByName.set('sUSD', {
      marketId: 0,
      marketName: 'sUSD',
      symbol: 'sUSD',
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

    let settlementStrategies: SpotSettlementStrategy[];
    if (this.asyncOrderEnabled) {
      const marketIds = Array.from(finalSynths.keys());
      // Get settlement strategies
      // settlementStrategies = await this.getSettlementStrategies(0, marketIds);
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
      if (settlementStrategies != undefined && settlementStrategies.length > 0) {
        const strategy = settlementStrategies.find((strategy) => strategy.marketId == synth.marketId);
        synth.settlementStrategy = strategy;
      }
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
  public getSynthContract(marketId?: number, marketName?: string) {
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

  /**
   * Get the allowance for a ``target_address`` to transfer from ``address``. Provide either
   * a ``marketId`` or ``marketName`` to choose the synth.
   * @param targetAddress The address for which to check allowance.
   * @param address The owner address to check allowance for.
   * @param marketId The id of the market.
   * @param marketName The name of the market.
   * @returns The allowance in ether.
   */
  public async getAllowance(
    targetAddress: string,
    address?: string,
    marketId?: number,
    marketName?: string,
  ): Promise<number> {
    const synthContract = await this.getSynthContract(marketId, marketName);
    const allowance = await synthContract.read.allowance([address as Hex, targetAddress as Hex]);
    return convertWeiToEther(allowance);
  }

  /**
   * Approve an address to transfer a specified synth from the connected address.
   * Approves the ``targetAddress`` to transfer up to the ``amount`` from your account.
   * If ``amount`` is ``undefined``, approves the maximum possible amount.
   * Requires either a ``marketId`` or ``marketName`` to be provided to resolve the market.
   * @param targetAddress The address to approve.
   * @param amount The amount in ether to approve. Default is max uint256.
   * @param marketId The ID of the market.
   * @param marketName The name of the market.
   * @param submit Whether to broadcast the transaction.
   */
  public async approve(
    targetAddress: string,
    amount?: number,
    marketId?: number,
    marketName?: string,
    submit: boolean = false,
  ) {
    let amountInWei: bigint;
    if (amount == undefined) {
      amountInWei = maxUint256;
    } else {
      amountInWei = convertEtherToWei(amount);
    }

    const synthContract = this.getSynthContract(marketId, marketName);

    const approveTx: CallParameters = {
      account: this.sdk.accountAddress,
      to: synthContract.address as Hex,
      data: encodeFunctionData({
        abi: synthContract.abi,
        functionName: 'approve',
        args: [targetAddress as Hex, amountInWei],
      }),
    };

    if (submit) {
      console.log(`Approving ${targetAddress} to spend ${amount}`);
      const txHash = await this.sdk.executeTransaction(approveTx);
      console.log('Approve txHash: ', txHash);
      return txHash;
    } else {
      return approveTx;
    }
  }

  /**
   * Get details about an async order by its ID.
   * Retrieves order details like owner, amount escrowed, settlement strategy, etc.
   * Can also fetch the full settlement strategy parameters if ``fetchSettlementStrategy``
   * is ``true``.
   * Requires either a ``market_id`` or ``market_name`` to be provided to resolve the market.
   * @param asyncOrderId The ID of the async order to retrieve.
   * @param marketId The ID of the market.
   * @param marketName The name of the market.
   * @param fetchSettlementStrategy Whether to fetch the full settlement strategy parameters. Default is true.
   * @returns The order details.
   */
  public async getOrder(
    asyncOrderId: number,
    marketId?: number,
    marketName?: string,
    fetchSettlementStrategy: boolean = true,
  ) {
    const { resolvedMarketId } = this.resolveMarket(marketId, marketName);

    const spotProxy = await this.sdk.contracts.getSpotMarketProxyInstance();

    const order = (await spotProxy.read.getAsyncOrderClaim([resolvedMarketId, asyncOrderId])) as unknown as SpotOrder;
    console.log('order', order);

    if (fetchSettlementStrategy) {
      const settlementStrategy = await this.getSettlementStrategy(
        Number(order.settlementStrategyId) ?? 0n,
        resolvedMarketId,
      );
      order.settlementStrategy = settlementStrategy;
    }

    return order;
  }

  /**
   * Fetch the settlement strategy for a spot market.
   * @param settlementStrategyId The id of the settlement strategy to retrieve.
   * @param marketId The id of the market.
   * @param marketName The name of the market.
   */
  public async getSettlementStrategy(
    settlementStrategyId: number,
    marketId: number | undefined = undefined,
    marketName: string | undefined = undefined,
  ): Promise<SpotSettlementStrategy> {
    const { resolvedMarketId, resolvedMarketName } = this.resolveMarket(marketId, marketName);
    const spotProxy = await this.sdk.contracts.getSpotMarketProxyInstance();

    interface SettlementStrategyResponse {
      strategyType?: number;
      settlementDelay?: bigint;
      settlementWindowDuration?: bigint;
      priceVerificationContract?: string;
      feedId?: string;
      url?: string;
      settlementReward?: bigint;
      priceDeviationTolerance?: bigint;
      minimumUsdExchangeAmount?: bigint;
      maxRoundingLoss?: bigint;
      disabled?: boolean;
    }

    const settlementStrategy: SettlementStrategyResponse = (await this.sdk.utils.callErc7412(
      spotProxy.address,
      spotProxy.abi,
      'getSettlementStrategy',
      [resolvedMarketId, settlementStrategyId],
    )) as SettlementStrategyResponse;

    return {
      marketId: resolvedMarketId,
      marketName: resolvedMarketName,
      strategyType: settlementStrategy.strategyType,
      settlementDelay: Number(settlementStrategy.settlementDelay),
      settlementWindowDuration: Number(settlementStrategy.settlementWindowDuration),
      priceVerificationContract: settlementStrategy.priceVerificationContract,
      feedId: settlementStrategy.feedId,
      url: settlementStrategy.url,
      settlementReward: convertWeiToEther(settlementStrategy.settlementReward),
      priceDeviationTolerance: convertWeiToEther(settlementStrategy.priceDeviationTolerance),
      minimumUsdExchangeAmount: convertWeiToEther(settlementStrategy.minimumUsdExchangeAmount),
      maxRoundingLoss: convertWeiToEther(settlementStrategy.maxRoundingLoss),
      disabled: settlementStrategy.disabled,
    } as SpotSettlementStrategy;
  }

  /**
   * Fetch the settlement strategies for all spot markets.
   * @param stragegyId The id of the settlement strategy to retrieve.
   * @param marketIds Array of marketIds to fetch settlement strategy
   * @returns Settlement strategy array for markets
   */
  public async getSettlementStrategies(stragegyId: number, marketIds: number[]): Promise<SpotSettlementStrategy[]> {
    const spotProxy = await this.sdk.contracts.getSpotMarketProxyInstance();

    interface SettlementStrategyResponse {
      strategyType?: number;
      settlementDelay?: bigint;
      settlementWindowDuration?: bigint;
      priceVerificationContract?: string;
      feedId?: string;
      url?: string;
      settlementReward?: bigint;
      priceDeviationTolerance?: bigint;
      minimumUsdExchangeAmount?: bigint;
      maxRoundingLoss?: bigint;
      disabled?: boolean;
    }

    const settlementStrategies: SpotSettlementStrategy[] = [];
    let settlementStrategiesResponse: SettlementStrategyResponse[];

    const argsList: [number, number][] = marketIds.map((marketId) => [marketId, stragegyId]);

    const response = await this.sdk.utils.multicallErc7412(
      spotProxy.address,
      spotProxy.abi,
      'getSettlementStrategy',
      argsList,
    );

    if (response == undefined) {
      settlementStrategiesResponse = [];
    } else {
      settlementStrategiesResponse = response as unknown[] as SettlementStrategyResponse[];
    }

    console.log('settlementStrategiesResponse', settlementStrategiesResponse);

    settlementStrategiesResponse.forEach((strategy, index) => {
      settlementStrategies.push({
        marketId: marketIds[index],
        strategyType: strategy.strategyType,
        settlementDelay: Number(strategy.settlementDelay),
        settlementWindowDuration: Number(strategy.settlementWindowDuration),
        priceVerificationContract: strategy.priceVerificationContract,
        feedId: strategy.feedId,
        url: strategy.url,
        settlementReward: convertWeiToEther(strategy.settlementReward),
        priceDeviationTolerance: convertWeiToEther(strategy.priceDeviationTolerance),
        minimumUsdExchangeAmount: convertWeiToEther(strategy.minimumUsdExchangeAmount),
        maxRoundingLoss: convertWeiToEther(strategy.maxRoundingLoss),
        disabled: strategy.disabled,
      });
    });
    return settlementStrategies;
  }

  /**
   * Execute an atomic order on the spot market.
   * Atomically executes a buy or sell order for the given size.
   * Amounts are transferred directly, no need to settle later. This function
   * is useful for swapping sUSDC with sUSD on Base Andromeda contracts. The default
   * slippage is set to zero, since sUSDC and sUSD can be swapped 1:1
   * For example:
   *    const tx = await atomicOrder(Side.BUY, 100, 0, undefined, undefined, "sUSDC");
   * Requires either a ``market_id`` or ``market_name`` to be provided to resolve the market.
   * @param side The side of the order (buy/sell).
   * @param size The order size in ether.
   * @param slippageTolerance The slippage tolerance for the order as a percentage (0.01 = 1%). Default is 0.
   * @param minAmountReceived The minimum amount to receive in ether units. This will override the slippage_tolerance.
   * @param marketId The ID of the market.
   * @param marketName The name of the market.
   * @param submit Whether to broadcast the transaction.
   */
  public async atomicOrder(
    side: Side,
    size: number,
    slippageTolerance: number = 0,
    minAmountReceived?: number,
    marketId?: number,
    marketName?: string,
    submit: boolean = false,
  ) {
    const { resolvedMarketId, resolvedMarketName } = this.resolveMarket(marketId, marketName);
    const spotMarketProxy = await this.sdk.contracts.getSpotMarketProxyInstance();

    // If network is Base where USDC and sUSDC are 1:1, set minAmount to actual amount
    if (
      this.sdk.rpcConfig.chainId in [8453, 84532] &&
      resolvedMarketName in ['sUSDC'] &&
      minAmountReceived == undefined
    ) {
      minAmountReceived = size;
    } else if (minAmountReceived == undefined) {
      // Get asset price
      const tokenSymbol = this.marketsById.get(resolvedMarketId)?.symbol;
      if (tokenSymbol == undefined) {
        throw new Error(`Invalid token symbol for market id: ${resolvedMarketId}`);
      }

      const feedId =
        this.sdk.pyth.priceFeedIds.get(tokenSymbol) ??
        '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a';

      const price = await this.sdk.pyth.getFormattedPrice(feedId as Hex);
      console.log('Formatted price:', price);

      let tradeSize;
      if (side == Side.BUY) {
        tradeSize = size / price;
      } else {
        tradeSize = size * price;
      }
      minAmountReceived = tradeSize * (1 - slippageTolerance);
    }

    const minAmountReceivedInWei = convertEtherToWei(minAmountReceived);
    const sizeInWei = convertEtherToWei(size);

    const functionName = side == Side.BUY ? 'buy' : 'sell';
    const args = [resolvedMarketId, sizeInWei, minAmountReceivedInWei, this.sdk.referrer];
    const tx = await this.sdk.utils.writeErc7412(spotMarketProxy.address, spotMarketProxy.abi, functionName, args);

    if (submit) {
      console.log(
        `Committing ${functionName} atomic order of size ${sizeInWei} (${size}) to ${resolvedMarketName} (id: ${marketId})`,
      );
      const txHash = await this.sdk.executeTransaction(tx);
      console.log('Order transaction: ', txHash);
      return txHash;
    } else {
      return tx;
    }
  }
  /**
   * Wrap an underlying asset into a synth or unwrap back to the asset.
   * Wraps an asset into a synth if size > 0, unwraps if size < 0.
   * The default slippage is set to zero, since the synth and asset can be swapped 1:1.
   * For example:
   *    const tx = wrap(100, undefined, "sUSDC")  # wrap 100 USDC into sUSDC
   *    const tx = wrap(-100, undefined, "sUSDC") # unwrap 100 sUSDC into USDC
   * Requires either a ``market_id`` or ``market_name`` to be provided to resolve the market.
   * @param size The amount of the asset to wrap/unwrap.
   * @param marketId The ID of the market.
   * @param marketName The name of the market.
   * @param submit Whether to broadcast the transaction.
   * @returns
   */
  public async wrap(size: number, marketId?: number, marketName?: string, submit: boolean = false) {
    const { resolvedMarketId, resolvedMarketName } = this.resolveMarket(marketId, marketName);
    const spotMarketProxy = await this.sdk.contracts.getSpotMarketProxyInstance();

    let sizeInWei = this.formatSize(Math.abs(size), resolvedMarketId);
    let functionName = size > 0 ? 'wrap' : 'unwrap';

    const tx: CallParameters = await this.sdk.utils.writeErc7412(
      spotMarketProxy.address,
      spotMarketProxy.abi,
      functionName,
      [resolvedMarketId, sizeInWei, sizeInWei],
    );

    if (submit) {
      console.log(`${functionName} of size ${sizeInWei} (${size}) to ${marketName} (id: ${marketId})`);
      const txHash = await this.sdk.executeTransaction(tx);
      console.log('Wrap tx hash', txHash);
      return txHash;
    } else {
      return tx;
    }
  }

  /**
   * Commit an async order to the spot market.
   * Commits a buy or sell order of the given size. The order will be settled
   * according to the settlement strategy.
   * Requires either a ``marketId`` or ``marketName`` to be provided to resolve the market.
   * @param side The side of the order (buy/sell).
   * @param size The order size in ether. If ``side`` is "buy", this is the amount
   * of the synth to buy. If ``side`` is "sell", this is the amount of the synth to sell.
   * @param slippageTolerance The slippage tolerance for the order as a percentage (0.01 = 1%). Default is 0.
   * @param minAmountReceived The minimum amount to receive in ether units. This will override the slippage_tolerance.
   * @param settlementStrategyId The settlement strategy ID. Default 2.
   * @param marketId The ID of the market.
   * @param marketName The name of the market.
   * @param submit Whether to broadcast the transaction.
   */
  public async commitOrder(
    side: Side,
    size: number,
    slippageTolerance: number,
    minAmountReceived?: number,
    settlementStrategyId: number = 0,
    marketId?: number,
    marketName?: string,
    submit: boolean = false,
  ) {
    const { resolvedMarketId, resolvedMarketName } = this.resolveMarket(marketId, marketName);
    const spotMarketProxy = await this.sdk.contracts.getSpotMarketProxyInstance();

    if (minAmountReceived == undefined) {
      const settlementReward = this.marketsById.get(resolvedMarketId)?.settlementStrategy?.settlementReward ?? 0;

      // Get asset price
      const feedId =
        this.marketsById.get(resolvedMarketId)?.settlementStrategy?.feedId ??
        '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a';

      const price = await this.sdk.pyth.getFormattedPrice(feedId as Hex);
      console.log('Formatted price:', price);

      let tradeSize;
      if (side == Side.BUY) {
        tradeSize = size / price;
      } else {
        tradeSize = size * price;
      }
      minAmountReceived = tradeSize * (1 - slippageTolerance) - settlementReward;
    }

    const minAmountReceivedInWei = convertEtherToWei(minAmountReceived);
    const sizeInWei = convertEtherToWei(size);
    const orderType = side == Side.BUY ? 3 : 4;

    const args = [
      resolvedMarketId,
      orderType,
      sizeInWei,
      settlementStrategyId,
      minAmountReceivedInWei,
      this.sdk.referrer,
    ];
    const tx = await this.sdk.utils.writeErc7412(spotMarketProxy.address, spotMarketProxy.abi, 'commitOrder', args);

    if (submit) {
      console.log(
        `Committing ${size == Side.BUY ? 'buy' : 'sell'} atomic order of size ${sizeInWei} (${size}) to ${resolvedMarketName} (id: ${marketId})`,
      );
      const txHash = await this.sdk.executeTransaction(tx);
      console.log('Commit order transaction: ', txHash);
      return txHash;
    } else {
      return tx;
    }
  }

  /**
   * Settle an async Pyth order after price data is available.
   * Fetches the price for the order from Pyth and settles the order.
   * Retries up to ``maxTxTries`` times on failure with a delay of ``txDelay`` seconds.
   * Requires either a ``marketId`` or ``marketName`` to be provided to resolve the market.
   * @param asyncOrderId The ID of the async order to settle.
   * @param marketId The ID of the market
   * @param marketName The name of the market.
   * @param maxTxTries Max retry attempts if price fetch fails.
   * @param txDelay Seconds to wait between retries.
   * @param submit Whether to broadcast the transaction.
   */
  public async settleOrder(
    asyncOrderId: number,
    marketId?: number,
    marketName?: string,
    maxTxTries: number = 5,
    txDelay: number = 2,
    submit: boolean = false,
  ) {
    const { resolvedMarketId, resolvedMarketName } = this.resolveMarket(marketId, marketName);
    const spotMarketProxy = await this.sdk.contracts.getSpotMarketProxyInstance();

    const order = await this.getOrder(asyncOrderId, resolvedMarketId);
    if (order.settledAt == undefined || order.commitmentTime == undefined) {
      throw new Error('Invalid fields for order: undefined');
    }
    const settlementStrategy = order.settlementStrategy;
    const settlementTime = order.commitmentTime + (settlementStrategy?.settlementDelay ?? 0);
    const expirationTime = order.commitmentTime + (settlementStrategy?.settlementWindowDuration ?? 0);

    const currentTimestamp = Math.floor(Date.now() / 1000);

    if (order.settledAt > 0) {
      throw new Error(`Order ${asyncOrderId} on market ${resolvedMarketId} is already settled for account`);
    } else if (settlementTime > currentTimestamp) {
      const duration = settlementTime - currentTimestamp;
      console.log(`Waiting ${duration} seconds to settle order`);
      await sleep(duration);
    } else if (expirationTime < currentTimestamp) {
      throw new Error(`Order ${asyncOrderId} on market ${resolvedMarketId} has expired`);
    } else {
      console.log(`Order ${asyncOrderId} on market ${resolvedMarketId} is ready to be settled`);
    }

    let totalTries = 0;
    let tx;
    while (totalTries < maxTxTries) {
      try {
        tx = await this.sdk.utils.writeErc7412(spotMarketProxy.address, spotMarketProxy.abi, 'settleOrder', [
          resolvedMarketId,
          asyncOrderId,
        ]);
      } catch (error) {
        console.log('Settle order error: ', error);
        totalTries += 1;
        sleep(txDelay);
        continue;
      }

      if (submit) {
        console.log(`Settling order ${asyncOrderId} for market ${resolvedMarketId}`);
        const txHash = await this.sdk.executeTransaction(tx);
        console.log('Settle txHash: ', txHash);

        const updatedOrder = await this.getOrder(asyncOrderId, resolvedMarketId);
        if (updatedOrder.settledAt != undefined && updatedOrder.settledAt > 0) {
          console.log('Order settlement successful for order id ', asyncOrderId);
          return txHash;
        }

        // If order settlement failed, retry after a delay
        totalTries += 1;
        if (totalTries > maxTxTries) {
          throw new Error('Failed to settle order');
        } else {
          console.log(`Failed to settle order, waiting ${txDelay} seconds and retrying`);
          sleep(txDelay);
        }
      } else {
        return tx;
      }
    }
  }
}
