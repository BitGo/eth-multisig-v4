# Ethereum MultiSig Wallet Contract

## About

Multi-sig contract suitable for use as a 2-of-3 multisig wallet.

The core functionality of the wallet is implemented in the [WalletSimple](contracts/WalletSimple.sol) contract. It is initialized with 3 signer addresses, two of which must participate in order to execute a transaction from the wallet.
Auxillary contracts called [Forwarders](contracts/Forwarder.sol) can be deployed with a WalletSimple contract initialized as its "parent". Any funds that the forwarder receives will be sent on back to the parent wallet. This enables omnibus-style wallets to create many addresses that are all controlled by the same wallet.

Features of the [wallet contract](contracts/WalletSimple.sol):

1. Functions as a 2-of-3 multisig wallet for sending transactions.
2. Support for synchronous (single transaction) approvals containing multiple signatures through the use of ecrecover.
3. ERC20 tokens and ether can be sent out from the main wallet through a multisig process.
4. ‘Safe Mode’ can be set on a wallet contract that prevents ETH and ERC20 tokens from being sent anywhere other than to wallet signers.
5. Transactions can be sent in batches through a batch function (sendMultiSigBatch) to save on fees if a user needs to perform multiple transactions.
6. Slightly different implementations exist for non-eth chains, which require signatures to include a networkId to protect against cross-chain replay of signatures.

Features of the [forwarder contract](contracts/Forwarder.sol)

1. Deployed with a single, permanent parent address.
2. Automatically flushes any ETH received to the parent address.
3. Able to flush ERC20 tokens received to the parent address through a separate transaction (flushForwarderTokens).

Note that this suite of contracts is an upgraded version of [eth-multisig-v2](https://github.com/bitgo/eth-multisig-v2). The main changes that were made are as follows:
- Wallets and forwarders are deployed as proxy instances to a single implementation, to save on deployment fees.
- Wallets and forwarders are deployed using CREATE2 to allow addresses to be generated on demand, but only deployed upon first use.
- Wallets include a batch function to save on fees when sending multiple transactions.
- SequenceId is now simply a strictly increasing nonce.

### Deployment
The Wallet contract and forwarder contracts can each be deployed independently of each other, using the provided ForwarderFactory and WalletFactory.
These factories employ two features to minimize the cost associated with deploying a new contract:
- [Minimal proxy](https://eips.ethereum.org/EIPS/eip-1167) - Each deployed contract is simply a tiny contract which proxies calls to use the logic of a single implementation contract.
- [CREATE2](https://eips.ethereum.org/EIPS/eip-1014) - Contracts are deployed with the CREATE2 opcode to allow users to distribute contract addresses and only deploy them upon first use.

**Wallets**
To deploy wallets, follow these steps:
1. Deploy a wallet contract ([contracts/WalletSimple.sol](contracts/WalletSimple.sol)) with any address. Take note of the wallet's address.
2. Deploy a WalletFactory contract ([contracts/WalletFactory.sol](contracts/WalletFactory.sol)) with any address. Use the address of the contract deployed in step 1 as the `_implementationAddress` parameter.
3. Call the `createWallet` function on the factory deployed in step 2. Provide the list of signers on the wallet, and some "salt" which will be used to determine the wallet's address via [CREATE2](https://eips.ethereum.org/EIPS/eip-1014).
4. Check for the `WalletCreated` event from the above transaction. This will include your newly generated wallet address

**Forwarders**
To deploy forwarders, follow these steps:
1. Deploy a forwarder contract ([contracts/Forwarder.sol](contracts/Forwarder.sol)) with any address. Take note of the contract's address.
2. Deploy a ForwarderFactory contract ([contracts/ForwarderFactory.sol](contracts/ForwarderFactory.sol)) with any address. Use the address of the contract deployed in step 1 as the `_implementationAddress` parameter.
3. Call the `createForwarder` function on the factory deployed in step 2. Provide the parent address, and some "salt" which will be used to determine the forwarder's address via [CREATE2](https://eips.ethereum.org/EIPS/eip-1014).
4. Check for the `ForwarderCreated` event from the above transaction. This will include your newly generated forwarder address


## Contracts
Brief descriptions of the various contracts provided in this repository.

[**WalletSimple**](contracts/WalletSimple.sol)

The multi-sig wallet contract. Initializes with three signers and requires authorization from any two of them to send a transaction.

[**Forwarder**](contracts/Forwarder.sol)

Forwarder function. Initializes with a parent to which it will forward any ETH that it receives. Also has a function to forward ERC20 tokens.

[**WalletFactory**](contracts/WalletFactory.sol)

Factory to create wallets. Deploys a small proxy which utilizes the implementation of a single wallet contract.

[**ForwarderFactory**](contracts/ForwarderFactory.sol)

Factory to create forwarder. Deploys a small proxy which utilizes the implementation of a single forwarder contract.

[**Batcher**](contracts/Batcher.sol)

Transfer batcher. Takes a list of recipients and amounts, and distributes ETH to them in a single transaction.

## Installation

NodeJS 16 is required.

```shell
yarn
```

This installs hardhat.

## Wallet Solidity Contract

Find it at [contracts/WalletSimple.sol](contracts/WalletSimple.sol)

## Running tests

A test suite is included through the use of the hardhat framework, providing coverage for methods in the wallet.

On first run:
1. Create a file called `.env` in the root directory. 
2. Add the following variable:
   ```
   PRIVATE_KEY=<Your private key>
   ```
Note: `<your private key>` can be from a wallet like Metamask.

Once done, you can run the test with the following command:

```shell
npx hardhat test
```

## Running tests in IntelliJ

You need to add the following to the extra mocha options
```
--require hardhat/register
```

## Notes
- wallet creation salt should include [a hash of] the signers associated with the wallet. 
- forwarder creation salt should include [a hash of] the parentAddress.
