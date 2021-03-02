require('assert');
const should = require('should');
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js');
const Promise = require('bluebird');
const _ = require('lodash');

const helpers = require('./helpers');
const { privateKeyForAccount } = require('../testrpc/accounts');

// Used to build the solidity tightly packed buffer to sha3, ecsign
const util = require('ethereumjs-util');
const abi = require('ethereumjs-abi');
const crypto = require('crypto');

const WalletSimple = artifacts.require('./WalletSimple.sol');
const WalletFactory = artifacts.require('./WalletFactory.sol');
const Forwarder = artifacts.require('./Forwarder.sol');

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
    diff.should.be.lessThan(GAS_DIFF_THRESHOLD);
}

contract(`Wallet Operations Gas Usage`, function (accounts) {
    let wallet;

    it('WalletSimple deployment [ @skip-on-coverage ]', async function () {
        const transaction = await createWallet(accounts[0], [accounts[0], accounts[1], accounts[2]]);
        checkGasUsed(156155, transaction.receipt.gasUsed);
    });

    it('WalletSimple send [ @skip-on-coverage ]', async function () {
        const wallet = await createAndGetWallet(accounts[0], [accounts[0], accounts[1], accounts[2]]);

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

        const operationHash = helpers.getSha3ForConfirmationTx(
            'ETHER',
            destinationAccount,
            amount,
            data,
            expireTime,
            sequenceId
        );
        const sig = util.ecsign(
            operationHash,
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

        const destinationEndBalance = await web3.eth.getBalance(
            destinationAccount
        );
        new BigNumber(destinationStartBalance)
            .plus(amount)
            .eq(destinationEndBalance)
            .should.be.true();

        checkGasUsed(92330, transaction.receipt.gasUsed);
    });

    const sendBatchHelper = async (batchSize) => {
        const wallet = await createAndGetWallet(accounts[0], [accounts[0], accounts[1], accounts[2]]);

        const amount = web3.utils.toWei('1', 'ether');
        const expireTime = Math.floor(new Date().getTime() / 1000) + 60;
        const destination = accounts[3];
        const data = '0x';
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
        const operationHash = helpers.getSha3ForBatchTx(
            'ETHER-Batch',
            recipients.map((recipient) =>
                recipient.address.toLowerCase()
            ),
            recipients.map((recipient) =>
                recipient.amount
            ),
            expireTime,
            sequenceId
        );
        const sig = util.ecsign(
            operationHash,
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
        const gasUsageByBatchSize = [78060, 88194, 98316, 108427, 118537, 128648, 138747, 148869, 158980, 169079];

        for (let batchSize = 1; batchSize <= 10; batchSize++) {
            const transaction = await sendBatchHelper(batchSize);
            checkGasUsed(gasUsageByBatchSize[batchSize - 1], transaction.receipt.gasUsed);
        }
    });
});
