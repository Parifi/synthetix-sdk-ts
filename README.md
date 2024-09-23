# Synthetix SDK - Typescript

The Synthetix TypeScript SDK is a powerful and user-friendly package for interacting with Synthetix protocol smart contracts. It offers a variety of functions and utilities to assist developers in integrating Synthetix into their applications, enabling them to retrieve data, and prepare and execute transactions for Synthetix V3 smart contracts

The SDK is built using TypeScript, which ensures type safety and reduces the likelihood of runtime errors. TypeScript’s static type checking helps catch errors early during development, and enhance the developer experience by providing better code completion. The SDK use `viem` internally, which offers lightweight, composable, and type-safe modules, resulting in a better developer experience as compared to other existing libraries.

## Installation

To install the Synthetix SDK, you can use npm or yarn or any other Node package manager:

```bash
npm install @parifi/synthetix-sdk-ts
```

or

```bash
yarn add @parifi/synthetix-sdk-ts
```

## Usage

1. **Import the SDK:**

Import the Synthetix SDK into your project.

```javascript
import { SynthetixSdk } from '@parifi/synthetix-sdk-ts';
```

2. **Initialize SDK:**

Initialize the SDK to interact with the protocol. The only mandatory parameters for initialization are `chainId` and either `address` or `env.PRIVATE_KEY`. All other parameters are optional and will default to preset values if not provided.

```javascript
const accountConfig = { address: 'YOUR_WALLET_ADDRESS' };

const rpcConfig = {
  chainId: 42161,
};

const sdk = new SynthetixSdk({ accountConfig, rpcConfig });
await sdk.init();
```

4. **Use SDK Functions:**

Use the functions provided by the SDK modules to access protocol functionalities.

```javascript
const markets = await sdk.perps.getMarkets();
const accountIds = await sdk.perps.getAccountIds():
```

The SDK also offers the functionality to submit transactions directly to the RPC if the `env.PRIVATE_KEY` is set, or provides the Transaction data on these write functions so they can be signed and executed separately. For example:

```javascript
const txData = await sdk.perps.createAccount(undefined, false);
console.log('Create account tx data:', txData);
```

Response:

```
Create account tx data: {
      account: '0xe6E36c127ebC34Fe1FAF4f676416f419833DDAF4',
      to: '0xE2C5658cC5C448B48141168f3e475dF8f65A1e3e',
      data: '0x174dea71000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000f53ca60f031faf0e347d44fbaa4870da68250c8d00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000049dca362f00000000000000000000000000000000000000000000000000000000',
      value: 0n
    }
```

For submitting the tx directly to the RPC, pass `submit=true` to the above function as follows:

```javascript
const txHash = await sdk.perps.createAccount(undefined, true);
console.log('Create account tx:', txHash);
```

Response:

```
Create account tx: 0xe7943b1d06c85dafe439aacc72e889b228e7b293739eb9f1253a1a132f5b8db0
```

## Testing

The SDK uses Jest as its testing framework. The SDK can be tested using the test scripts added under the `tests` directory.

To run all test cases:

```
npm test
```

To run test cases for a specific module, use

```
npm test tests/perps
```

### Writing test cases

To add new tests, create a file with the .test.ts extension in the tests directory. Here’s an example of a simple test:

```javascript
describe('Perps', () => {
  let sdk: SynthetixSdk;
  beforeAll(async () => {
    const accountConfig = { address: 'YOUR_WALLET_ADDRESS' };

    const rpcConfig = {
    chainId: 42161,
    };

    const sdk = new SynthetixSdk({ accountConfig, rpcConfig });
    await sdk.init();

    // Get accounts for address and sets the default account
    const defaultAddress = process.env.DEFAULT_ADDRESS;
    const accountIds = await sdk.perps.getAccountIds(defaultAddress);
    console.log('Account ids for default account: ', accountIds);

    await sdk.perps.getMarkets();
  });

  it('should return if an account can be liquidated', async () => {
    const canBeLiquidated = await sdk.perps.getCanLiquidate(ACCOUNT_ID);
    console.log('canBeLiquidated :', canBeLiquidated);
    expect(canBeLiquidated).toBe(false)
  });
});
```

## API Reference

The API reference for the SDK can be viewed here: [Parifi Synthetix Typescript SDK](https://parifi.github.io/synthetix-sdk-ts/classes/index.SynthetixSdk.html)
