require('assert');
require('should');
const BigNumber = require('bignumber.js');

const helpers = require('./helpers');
const { privateKeyForAccount } = require('./helpers');

// Used to build the solidity tightly packed buffer to sha3, ecsign
const util = require('ethereumjs-util');
const hre = require('hardhat');

const WalletSimple = artifacts.require('./WalletSimple.sol');
const WalletFactory = artifacts.require('./WalletFactory.sol');

const createWalletFactory = async () => {
  const walletContract = await WalletSimple.new([], {});
  const walletFactory = await WalletFactory.new(walletContract.address);
  return {
    implementationAddress: walletContract.address,
    factory: walletFactory
  };
};

// gas used is not always deterministic
// use this value to ensure gas used is within some threshold of expected
const GAS_DIFF_THRESHOLD = 50;

const createWallet = async (creator, signers) => {
  // OK to be the same for all wallets since we are using a new factory for each
  const salt = '0x1234';
  const { factory, implementationAddress } = await createWalletFactory();

  const inputSalt = util.setLengthLeft(
    Buffer.from(util.stripHexPrefix(salt), 'hex'),
    32
  );
  return await factory.createWallet(signers, inputSalt, { from: creator });
};

const createAndGetWallet = async (creator, signers) => {
  const transaction = await createWallet(creator, signers);
  const walletAddress = transaction.logs[0].args.newWalletAddress;
  return WalletSimple.at(walletAddress);
};

const checkGasUsed = (expected, actual) => {
  const diff = Math.abs(actual - expected);
  if (diff >= GAS_DIFF_THRESHOLD) {
    // log so the user knows the values
    console.log(
      `Gas differs from expected. Expected: ${expected}, Actual: ${actual}`
    );
  }
  diff.should.be.lessThan(GAS_DIFF_THRESHOLD);
};

describe(`Wallet Operations Gas Usage`, function () {
  let accounts;
  before(async () => {
    await hre.network.provider.send('hardhat_reset');
    accounts = await web3.eth.getAccounts();
  });

  it('WalletSimple deployment [ @skip-on-coverage ]', async function () {
    const transaction = await createWallet(accounts[0], [
      accounts[0],
      accounts[1],
      accounts[2]
    ]);
    checkGasUsed(163180, transaction.receipt.gasUsed);
  });

  it('WalletSimple send [ @skip-on-coverage ]', async function () {
    const wallet = await createAndGetWallet(accounts[0], [
      accounts[0],
      accounts[1],
      accounts[2]
    ]);

    const destinationAccount = accounts[5];
    const amount = web3.utils.toWei('50', 'ether');
    const expireTime = Math.floor(new Date().getTime() / 1000) + 60;
    const data = '0x';
    const sequenceId = 1;

    // fill up the wallet
    await web3.eth.sendTransaction({
      from: accounts[1],
      to: wallet.address,
      value: amount
    });

    // By default the chain id of hardhat network is 31337
    const operationHash = helpers.getSha3ForConfirmationTx(
      '31337',
      destinationAccount,
      amount,
      data,
      expireTime,
      sequenceId
    );
    const sig = util.ecsign(
      Buffer.from(operationHash.replace('0x', ''), 'hex'),
      privateKeyForAccount(accounts[1])
    );

    const destinationStartBalance = await web3.eth.getBalance(
      destinationAccount
    );

    const transaction = await wallet.sendMultiSig.sendTransaction(
      destinationAccount,
      amount,
      data,
      expireTime,
      sequenceId,
      helpers.serializeSignature(sig),
      { from: accounts[0] }
    );

    const destinationEndBalance = await web3.eth.getBalance(destinationAccount);
    new BigNumber(destinationStartBalance)
      .plus(amount)
      .eq(destinationEndBalance)
      .should.be.true();
    checkGasUsed(96455, transaction.receipt.gasUsed);
  });

  const sendBatchHelper = async (batchSize) => {
    const wallet = await createAndGetWallet(accounts[0], [
      accounts[0],
      accounts[1],
      accounts[2]
    ]);

    const amount = web3.utils.toWei('1', 'ether');
    const expireTime = Math.floor(new Date().getTime() / 1000) + 60;
    const destination = accounts[3];
    const sequenceId = 1;
    const recipients = [];
    for (let i = 0; i < batchSize; i++) {
      recipients.push({ address: destination, amount: amount });
    }

    // fill up the wallet
    await web3.eth.sendTransaction({
      from: accounts[1],
      to: wallet.address,
      value: web3.utils.toWei('500', 'ether')
    });

    // Get the operation hash to be signed
    // By default the chain id of hardhat network is 31337
    const operationHash = helpers.getSha3ForBatchTx(
      '31337-Batch',
      recipients.map((recipient) => recipient.address.toLowerCase()),
      recipients.map((recipient) => recipient.amount),
      expireTime,
      sequenceId
    );
    const sig = util.ecsign(
      Buffer.from(operationHash.replace('0x', ''), 'hex'),
      privateKeyForAccount(accounts[1])
    );

    const destinationStartBalance = await web3.eth.getBalance(destination);

    const transaction = await wallet.sendMultiSigBatch.sendTransaction(
      recipients.map((r) => r.address),
      recipients.map((r) => r.amount),
      expireTime,
      sequenceId,
      helpers.serializeSignature(sig),
      { from: accounts[0] }
    );

    const destinationEndBalance = await web3.eth.getBalance(destination);
    new BigNumber(destinationStartBalance)
      .plus(web3.utils.toWei(batchSize.toString(), 'ether'))
      .eq(destinationEndBalance)
      .should.be.true();

    return transaction;
  };

  it('WalletSimple send batch [ @skip-on-coverage ]', async function () {
    const gasUsageByBatchSize = [
      98637, 108706, 118786, 128854, 138923, 148968, 159060, 169117, 179185,
      189255
    ];

    for (let batchSize = 1; batchSize <= 10; batchSize++) {
      const transaction = await sendBatchHelper(batchSize);
      checkGasUsed(
        gasUsageByBatchSize[batchSize - 1],
        transaction.receipt.gasUsed
      );
    }
  });
});
