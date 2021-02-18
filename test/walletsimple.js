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

const WalletFactory = artifacts.require('./WalletFactory.sol');
const EthWalletSimple = artifacts.require('./WalletSimple.sol');
const RskWalletSimple = artifacts.require('./RskWalletSimple.sol');
const EtcWalletSimple = artifacts.require('./EtcWalletSimple.sol');
const CeloWalletSimple = artifacts.require('./CeloWalletSimple.sol');
const Fail = artifacts.require('./Fail.sol');
const GasGuzzler = artifacts.require('./GasGuzzler.sol');
const GasHeavy = artifacts.require('./GasHeavy.sol');
const Forwarder = artifacts.require('./Forwarder.sol');
const ForwarderTarget = artifacts.require('./ForwarderTarget.sol');
const ForwarderFactory = artifacts.require('./ForwarderFactory.sol');
const FixedSupplyToken = artifacts.require('./FixedSupplyToken.sol');
const Tether = artifacts.require('./TetherToken.sol');

const assertVMException = (err, expectedErrMsg) => {
  err.message.toString().should.containEql('VM Exception');
  if (expectedErrMsg) {
    err.message.toString().should.containEql(expectedErrMsg);
  }
};

const createForwarderFromWallet = async (wallet) => {
  const parent = wallet.address;
  const salt = util.bufferToHex(crypto.randomBytes(20));
  const inputSalt = util.setLengthLeft(
    Buffer.from(util.stripHexPrefix(salt), 'hex'),
    32
  );
  const calculationSalt = abi.soliditySHA3(
    ['address', 'bytes32'],
    [parent, inputSalt]
  );
  const forwarderContract = await Forwarder.new([], {});
  const forwarderFactory = await ForwarderFactory.new(
    forwarderContract.address
  );
  const initCode = helpers.getInitCode(
    util.stripHexPrefix(forwarderContract.address)
  );
  const forwarderAddress = helpers.getNextContractAddressCreate2(
    forwarderFactory.address,
    calculationSalt,
    initCode
  );

  return {
    forwarderAddress,
    create: async () =>
      executeCreateForwarder(
        forwarderFactory,
        calculationSalt,
        inputSalt,
        initCode,
        parent
      )
  };
};

const executeCreateForwarder = async (
  factory,
  calculationSalt,
  inputSalt,
  initCode,
  parent
) => {
  const forwarderAddress = helpers.getNextContractAddressCreate2(
    factory.address,
    calculationSalt,
    initCode
  );

  await factory.createForwarder(parent, inputSalt);
  return Forwarder.at(forwarderAddress);
};

const coins = [
  {
    name: 'Eth',
    nativePrefix: 'ETHER',
    nativeBatchPrefix: 'ETHER-Batch',
    tokenPrefix: 'ERC20',
    WalletSimple: EthWalletSimple
  },
  {
    name: 'Rsk',
    nativePrefix: 'RSK',
    nativeBatchPrefix: 'RSK-Batch',
    tokenPrefix: 'RSK-ERC20',
    WalletSimple: RskWalletSimple
  },
  {
    name: 'Etc',
    nativePrefix: 'ETC',
    nativeBatchPrefix: 'ETC-Batch',
    tokenPrefix: 'ETC-ERC20',
    WalletSimple: EtcWalletSimple
  },
  {
    name: 'Celo',
    nativePrefix: 'CELO',
    nativeBatchPrefix: 'CELO-Batch',
    tokenPrefix: 'CELO-ERC20',
    WalletSimple: CeloWalletSimple
  }
];

coins.forEach(
  ({
    name: coinName,
    nativePrefix,
    nativeBatchPrefix,
    tokenPrefix,
    WalletSimple
  }) => {
    const DEPOSITED_EVENT = 'Deposited';
    const FORWARDER_DEPOSITED_EVENT = 'ForwarderDeposited';
    const TRANSACTED_EVENT = 'Transacted';
    const SAFE_MODE_ACTIVATE_EVENT = 'SafeModeActivated';

    const createWallet = async (creator, signers) => {
      // OK to be the same for all wallets since we are using a new factory for each
      const salt = '0x1234';
      const { factory, implementationAddress } = await createWalletFactory();

      const inputSalt = util.setLengthLeft(
        Buffer.from(util.stripHexPrefix(salt), 'hex'),
        32
      );
      const calculationSalt = abi.soliditySHA3(
        ['address[]', 'bytes32'],
        [signers, inputSalt]
      );
      const initCode = helpers.getInitCode(
        util.stripHexPrefix(implementationAddress)
      );
      const walletAddress = helpers.getNextContractAddressCreate2(
        factory.address,
        calculationSalt,
        initCode
      );
      await factory.createWallet(signers, inputSalt, { from: creator });
      return WalletSimple.at(walletAddress);
    };

    const createWalletFactory = async () => {
      const walletContract = await WalletSimple.new([], {});
      const walletFactory = await WalletFactory.new(walletContract.address);
      return {
        implementationAddress: walletContract.address,
        factory: walletFactory
      };
    };

    const getBalanceInWei = async (address) => {
      return web3.utils.toBN(await web3.eth.getBalance(address));
    };

    contract(`${coinName}WalletSimple`, function (accounts) {
      let wallet;
      let watcher;

      // Taken from http://solidity.readthedocs.io/en/latest/frequently-asked-questions.html -
      // The automatic accessor function for a public state variable of array type only returns individual elements.
      // If you want to return the complete array, you have to manually write a function to do that.
      const isSigner = async function getSigners(wallet, signer) {
        const signers = [];
        const i = 0;
        return await wallet.signers.call(signer);
      };

      describe('Wallet creation', function () {
        it('2 of 3 multisig wallet', async function () {
          const wallet = await createWallet(accounts[0], [
            accounts[0],
            accounts[1],
            accounts[2]
          ]);

          for (const signer of [accounts[0], accounts[1], accounts[2]]) {
            (await isSigner(wallet, signer)).should.eql(true);
          }

          const isSafeMode = await wallet.safeMode.call();
          isSafeMode.should.eql(false);

          const isSignerArray = await Promise.all([
            wallet.isSigner.call(accounts[0]),
            wallet.isSigner.call(accounts[1]),
            wallet.isSigner.call(accounts[2]),
            wallet.isSigner.call(accounts[3])
          ]);

          isSignerArray.length.should.eql(4);
          isSignerArray[0].should.eql(true);
          isSignerArray[1].should.eql(true);
          isSignerArray[2].should.eql(true);
          isSignerArray[3].should.eql(false);
        });

        it('Not enough signer addresses', async function () {
          try {
            await createWallet(accounts[0], [accounts[0]]);
            throw new Error('should not be here');
          } catch (e) {
            e.message.should.not.containEql('should not be here');
          }
        });

        it('0 address signer', async function () {
          let threw = false;
          try {
            const walletContract = await WalletSimple.new([], {
              from: accounts[1]
            });
            await walletContract.init([
              accounts[1],
              accounts[2],
              '0x0000000000000000000000000000000000000000'
            ]);
          } catch (e) {
            threw = true;
            assertVMException(e, 'Invalid signer');
          }
          threw.should.be.true();
        });
      });

      describe('Deposits', function () {
        before(async function () {
          wallet = await createWallet(accounts[0], [
            accounts[0],
            accounts[1],
            accounts[2]
          ]);
        });

        it('Should emit event on deposit', async function () {
          const tx = await web3.eth.sendTransaction({
            from: accounts[0],
            to: wallet.address,
            value: web3.utils.toWei('20', 'ether')
          });

          const depositEvent = await helpers.getEventFromTransaction(
            tx.transactionHash,
            DEPOSITED_EVENT
          );

          // should.exist(depositEvent);
          depositEvent.from.should.eql(accounts[0]);
          depositEvent.value.should.eql(web3.utils.toWei('20', 'ether'));
        });

        it('Should emit event with data on deposit', async function () {
          const tx = await web3.eth.sendTransaction({
            from: accounts[0],
            to: wallet.address,
            value: web3.utils.toWei('30', 'ether'),
            data: '0xabcd'
          });
          const depositEvent = await helpers.getEventFromTransaction(
            tx.transactionHash,
            DEPOSITED_EVENT
          );

          should.exist(depositEvent);
          depositEvent.from.should.eql(accounts[0]);
          depositEvent.value.should.eql(web3.utils.toWei('30', 'ether'));
          depositEvent.data.should.eql('0xabcd');
        });
      });

      /*
  Commented out because tryUpdateSequenceId and recoverAddressFromSignature is private. Uncomment the private and tests to test this.
  Functionality is also tested in the sendMultiSig tests.

  describe('Recover address from signature', function() {
    before(async function() {
        wallet = await createWallet(accounts[0], [
            accounts[0],
            accounts[1],
            accounts[2]
        ]);
    });

    it('Check for matching implementation with util.ecsign (50 iterations)', async function() {
      for (let i=0; i<50; i++) {
        // Get a random operation hash to sign
        const signerAddress = accounts[Math.floor(Math.random() * 10)];
        const sequenceId = Math.floor(Math.random() * 1000);
        const operationHash = helpers.getSha3ForConfirmationTx(nativePrefix,
          accounts[9], 10, '', Math.floor((new Date().getTime()) / 1000), sequenceId
        );
        const sig = util.ecsign(operationHash, privateKeyForAccount(signerAddress));
        console.log(
          (i+1) + ': Operation hash: ' + operationHash.toString('hex') +
          ', Signer: ' + signerAddress + ', Sig: ' + helpers.serializeSignature(sig)
        );
        const recoveredAddress = await wallet.recoverAddressFromSignature.call(
          util.addHexPrefix(operationHash.toString('hex')), helpers.serializeSignature(sig)
        );
        recoveredAddress.should.eql(signerAddress);
      }
    });
  });

  describe('Sequence ID anti-replay protection', function() {
    before(async function() {
        wallet = await createWallet(accounts[0], [
            accounts[0],
            accounts[1],
            accounts[2]
        ]);
    });

    const getSequenceId = async function() {
      const sequenceIdString = await wallet.getNextSequenceId.call();
      return parseInt(sequenceIdString);
    };

    it('Authorized signer can request and insert an id', async function() {
      let sequenceId = await getSequenceId();
      sequenceId.should.eql(1);
      await wallet.tryUpdateSequenceId(sequenceId, { from: accounts[0] });
      sequenceId = await getSequenceId();
      sequenceId.should.eql(2);
    });

    it('Non-signer cannot insert an id', async function() {
      const sequenceId = await getSequenceId();

      try {
        await wallet.tryUpdateSequenceId(sequenceId, { from: accounts[8] });
        throw new Error('should not have inserted successfully');
      } catch(err) {
        assertVMException(err);
      }

        // should be unchanged
      const newSequenceId = await getSequenceId();
      sequenceId.should.eql(newSequenceId);
    });

    it('Can request large sequence ids', async function() {
      for (let i=0; i<30; i++) {
        let sequenceId = await getSequenceId();
        // Increase by 100 each time to test for big numbers (there will be holes, this is ok)
        sequenceId += 100;
        await wallet.tryUpdateSequenceId(sequenceId, { from: accounts[0] });
        const newSequenceId = await getSequenceId();
        newSequenceId.should.eql(sequenceId + 1);
      }
    });

    it('Cannot request lower than the current', async function() {
      let sequenceId = await getSequenceId();
      sequenceId -= 50; // we used this in the previous test
      try {
        await wallet.tryUpdateSequenceId(sequenceId, { from: accounts[8] });
        throw new Error('should not have inserted successfully');
      } catch(err) {
        assertVMException(err);
      }
    });

    it('Cannot request lower used sequence id outside the window', async function() {
      try {
        await wallet.tryUpdateSequenceId(1, { from: accounts[8] });
        throw new Error('should not have inserted successfully');
      } catch(err) {
        assertVMException(err);
      }
    });
  });

  */
      // Helper to get the operation hash, sign it, and then send it using sendMultiSig
      const sendMultiSigTestHelper = async function (params) {
        assert(params.msgSenderAddress);
        assert(params.otherSignerAddress);
        assert(params.wallet);

        assert(params.toAddress);
        assert(params.amount);
        assert(params.data === '' || params.data);
        assert(params.expireTime);
        assert(params.sequenceId);

        // For testing, allow arguments to override the parameters above,
        // as if the other signer or message sender were changing them
        const otherSignerArgs = _.extend({}, params, params.otherSignerArgs);
        const msgSenderArgs = _.extend({}, params, params.msgSenderArgs);

        // Get the operation hash to be signed
        const operationHash = helpers.getSha3ForConfirmationTx(
          params.prefix || nativePrefix,
          otherSignerArgs.toAddress.toLowerCase(),
          web3.utils.toWei(otherSignerArgs.amount.toString(), 'ether'),
          otherSignerArgs.data,
          otherSignerArgs.expireTime,
          otherSignerArgs.sequenceId
        );
        const sig = util.ecsign(
          operationHash,
          privateKeyForAccount(params.otherSignerAddress)
        );

        await params.wallet.sendMultiSig(
          msgSenderArgs.toAddress.toLowerCase(),
          web3.utils.toWei(web3.utils.toBN(msgSenderArgs.amount), 'ether'),
          util.addHexPrefix(msgSenderArgs.data),
          msgSenderArgs.expireTime,
          msgSenderArgs.sequenceId,
          helpers.serializeSignature(sig),
          { from: params.msgSenderAddress }
        );
      };

      // Helper to expect successful execute and confirm
      const expectSuccessfulSendMultiSig = async function (params) {
        const destinationStartBalance = await web3.eth.getBalance(
          params.toAddress
        );
        const walletStartBalance = await web3.eth.getBalance(
          params.wallet.address
        );

        const result = await sendMultiSigTestHelper(params);

        // Check the post-transaction balances
        const destinationEndBalance = await web3.eth.getBalance(
          params.toAddress
        );
        const weiAmount = web3.utils.toWei(params.amount.toString(), 'ether');
        new BigNumber(destinationStartBalance)
          .plus(weiAmount)
          .eq(destinationEndBalance)
          .should.be.true();
        const walletEndBalance = await web3.eth.getBalance(
          params.wallet.address
        );
        new BigNumber(walletStartBalance)
          .minus(weiAmount)
          .eq(walletEndBalance)
          .should.be.true();

        return result;
      };

      // Helper to expect failed execute and confirm
      const expectFailSendMultiSig = async function (params) {
        const destinationStartBalance = await web3.eth.getBalance(
          params.toAddress
        );
        const walletStartBalance = await web3.eth.getBalance(
          params.wallet.address
        );

        try {
          await sendMultiSigTestHelper(params);
          throw new Error('should not have sent successfully');
        } catch (err) {
          assertVMException(err);
        }

        // Check the balances after the transaction
        const destinationEndBalance = await web3.eth.getBalance(
          params.toAddress
        );
        destinationStartBalance.should.eql(destinationEndBalance);
        const walletEndBalance = await web3.eth.getBalance(
          params.wallet.address
        );
        walletStartBalance.should.eql(walletEndBalance);
      };

      describe('Transaction sending using sendMultiSig', function () {
        before(async function () {
          // Create and fund the wallet
          wallet = await createWallet(accounts[0], [
            accounts[0],
            accounts[1],
            accounts[2]
          ]);
          const amount = web3.utils.toWei('200000', 'ether');
          await web3.eth.sendTransaction({
            from: accounts[0],
            to: wallet.address,
            value: amount
          });

          const balance = await getBalanceInWei(wallet.address);
          balance.toString().should.eql(amount);
        });

        let sequenceId;
        beforeEach(async function () {
          // Run before each test. Sets the sequence ID up to be used in the tests
          const sequenceIdString = await wallet.getNextSequenceId.call();
          sequenceId = parseInt(sequenceIdString);
        });

        it('Send out 50 ether with sendMultiSig', async function () {
          // We are not using the helper here because we want to check the operation hash in events
          const destinationAccount = accounts[5];
          const amount = web3.utils.toWei('50', 'ether');
          const expireTime = Math.floor(new Date().getTime() / 1000) + 60; // 60 seconds
          const data = '0xabcde35f1234';

          const destinationStartBalance = await web3.eth.getBalance(
            destinationAccount
          );
          const walletStartBalance = await web3.eth.getBalance(wallet.address);

          const operationHash = helpers.getSha3ForConfirmationTx(
            nativePrefix,
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

          const tx = await wallet.sendMultiSig.sendTransaction(
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

          // Check wallet balance
          const walletEndBalance = await web3.eth.getBalance(wallet.address);
          new BigNumber(walletStartBalance)
            .minus(amount)
            .eq(walletEndBalance)
            .should.be.true();

          const transactedEvent = await helpers.getEventFromTransaction(
            tx.receipt.transactionHash,
            TRANSACTED_EVENT
          );
          transactedEvent.msgSender.should.eql(accounts[0]);
          transactedEvent.otherSigner.should.eql(accounts[1]);
          transactedEvent.operation.should.eql(
            util.addHexPrefix(operationHash.toString('hex'))
          );
          transactedEvent.value.should.eql(amount);
          transactedEvent.toAddress.should.eql(destinationAccount);
          transactedEvent.data.should.eql(data);
        });

        it('Stress test: 20 rounds of sendMultiSig', async function () {
          for (let round = 0; round < 20; round++) {
            const destinationAccount = accounts[2];
            const amount = web3.utils.toWei(
              web3.utils.toBN(_.random(1, 9)),
              'ether'
            );
            const expireTime = Math.floor(new Date().getTime() / 1000) + 60; // 60 seconds
            const data = util.addHexPrefix(
              crypto.randomBytes(20).toString('hex')
            );

            const operationHash = helpers.getSha3ForConfirmationTx(
              nativePrefix,
              destinationAccount,
              amount,
              data,
              expireTime,
              sequenceId
            );
            const sig = util.ecsign(
              operationHash,
              privateKeyForAccount(accounts[0])
            );

            console.log(
              'ExpectSuccess ' +
                round +
                ': ' +
                amount +
                'ETH, seqId: ' +
                sequenceId +
                ', operationHash: ' +
                operationHash.toString('hex') +
                ', sig: ' +
                helpers.serializeSignature(sig)
            );

            const destinationStartBalance = await web3.eth.getBalance(
              destinationAccount
            );
            const walletStartBalance = await web3.eth.getBalance(
              wallet.address
            );
            await wallet.sendMultiSig(
              destinationAccount,
              amount,
              data,
              expireTime,
              sequenceId,
              helpers.serializeSignature(sig),
              { from: accounts[1] }
            );

            // Check other account balance
            const destinationEndBalance = await web3.eth.getBalance(
              destinationAccount
            );

            new BigNumber(destinationStartBalance)
              .plus(amount)
              .eq(destinationEndBalance)
              .should.be.true();

            // Check wallet balance
            const walletEndBalance = await web3.eth.getBalance(wallet.address);
            new BigNumber(walletStartBalance)
              .minus(amount)
              .eq(walletEndBalance)
              .should.be.true();

            // Increment sequence id
            sequenceId++;
          }
        });

        it('Stress test: 10 rounds of attempting to reuse sequence ids - should fail', async function () {
          sequenceId -= 10; // these sequence ids already used
          for (let round = 0; round < 10; round++) {
            const destinationAccount = accounts[2];
            const amount = _.random(1, 9);
            const expireTime = Math.floor(new Date().getTime() / 1000) + 60; // 60 seconds
            const data = util.bufferToHex(crypto.randomBytes(20));

            const operationHash = helpers.getSha3ForConfirmationTx(
              nativePrefix,
              destinationAccount,
              amount,
              data,
              expireTime,
              sequenceId
            );
            const sig = util.ecsign(
              operationHash,
              privateKeyForAccount(accounts[0])
            );

            console.log(
              'ExpectFail ' +
                round +
                ': ' +
                amount +
                'ETH, seqId: ' +
                sequenceId +
                ', operationHash: ' +
                operationHash.toString('hex') +
                ', sig: ' +
                helpers.serializeSignature(sig)
            );

            const destinationStartBalance = await web3.eth.getBalance(
              destinationAccount
            );
            const walletStartBalance = await web3.eth.getBalance(
              wallet.address
            );

            await truffleAssert.reverts(
              wallet.sendMultiSig(
                destinationAccount,
                amount,
                data,
                expireTime,
                sequenceId,
                helpers.serializeSignature(sig),
                { from: accounts[1] }
              )
            );

            // Check other account balance
            const destinationEndBalance = await web3.eth.getBalance(
              destinationAccount
            );
            destinationStartBalance.should.eql(destinationEndBalance);

            // Check wallet balance
            const walletEndBalance = await web3.eth.getBalance(wallet.address);
            walletStartBalance.should.eql(walletEndBalance);

            // Increment sequence id
            sequenceId++;
          }
        });

        it('Stress test: 20 rounds of confirming in a single tx from an incorrect sender - should fail', async function () {
          const sequenceIdString = await wallet.getNextSequenceId.call();
          sequenceId = parseInt(sequenceIdString);

          for (let round = 0; round < 20; round++) {
            const destinationAccount = accounts[2];
            const amount = _.random(1, 9);
            const expireTime = Math.floor(new Date().getTime() / 1000) + 60; // 60 seconds
            const data = util.bufferToHex(crypto.randomBytes(20));

            const operationHash = helpers.getSha3ForConfirmationTx(
              nativePrefix,
              destinationAccount,
              amount,
              data,
              expireTime,
              sequenceId
            );
            const sig = util.ecsign(
              operationHash,
              privateKeyForAccount(accounts[5 + (round % 5)])
            );

            console.log(
              'ExpectFail ' +
                round +
                ': ' +
                amount +
                'ETH, seqId: ' +
                sequenceId +
                ', operationHash: ' +
                operationHash.toString('hex') +
                ', sig: ' +
                helpers.serializeSignature(sig)
            );
            const destinationStartBalance = await web3.eth.getBalance(
              destinationAccount
            );
            const walletStartBalance = await web3.eth.getBalance(
              wallet.address
            );

            try {
              await wallet.sendMultiSig(
                destinationAccount,
                amount,
                data,
                expireTime,
                sequenceId,
                helpers.serializeSignature(sig),
                { from: accounts[1] }
              );
              throw new Error('should not be here');
            } catch (err) {
              assertVMException(err);
            }

            // Check other account balance
            const destinationEndBalance = await web3.eth.getBalance(
              destinationAccount
            );
            new BigNumber(destinationStartBalance)
              .eq(destinationEndBalance)
              .should.be.true();

            // Check wallet balance
            const walletEndBalance = await web3.eth.getBalance(wallet.address);
            new BigNumber(walletStartBalance)
              .eq(walletEndBalance)
              .should.be.true();

            // Increment sequence id
            sequenceId++;
          }
        });

        it('Msg sender changing the amount should fail', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            toAddress: accounts[8],
            amount: 15,
            data: '',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          // override with different amount
          params.msgSenderArgs = {
            amount: 20
          };

          await expectFailSendMultiSig(params);
        });

        it('Msg sender changing the destination account should fail', async function () {
          const params = {
            msgSenderAddress: accounts[1],
            otherSignerAddress: accounts[0],
            wallet: wallet,
            toAddress: accounts[5],
            amount: 25,
            data: '001122ee',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          // override with different amount
          params.msgSenderArgs = {
            toAddress: accounts[6]
          };

          await expectFailSendMultiSig(params);
        });

        it('Msg sender changing the data should fail', async function () {
          const params = {
            msgSenderAddress: accounts[1],
            otherSignerAddress: accounts[2],
            wallet: wallet,
            toAddress: accounts[0],
            amount: 30,
            data: 'abcdef',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          // override with different amount
          params.msgSenderArgs = {
            data: '12bcde'
          };

          await expectFailSendMultiSig(params);
        });

        it('Msg sender changing the expire time should fail', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            toAddress: accounts[2],
            amount: 50,
            data: 'abcdef',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          // override with different amount
          params.msgSenderArgs = {
            expireTime: Math.floor(new Date().getTime() / 1000) + 1000
          };

          await expectFailSendMultiSig(params);
        });

        it('Same owner signing twice should fail', async function () {
          const params = {
            msgSenderAddress: accounts[2],
            otherSignerAddress: accounts[2],
            wallet: wallet,
            toAddress: accounts[9],
            amount: 51,
            data: 'abcdef',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSig(params);
        });

        it('Sending from an unauthorized signer (but valid other signature) should fail', async function () {
          const params = {
            msgSenderAddress: accounts[7],
            otherSignerAddress: accounts[2],
            wallet: wallet,
            toAddress: accounts[1],
            amount: 52,
            data: '',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSig(params);
        });

        it('Sending from an authorized signer (but unauthorized other signer) should fail', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[6],
            wallet: wallet,
            toAddress: accounts[6],
            amount: 53,
            data: 'ab1234',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSig(params);
        });

        let usedSequenceId;
        it('Sending with expireTime very far out should work', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            toAddress: accounts[5],
            amount: 60,
            data: '',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectSuccessfulSendMultiSig(params);
          usedSequenceId = sequenceId;
        });

        it('Sending with expireTime in the past should fail', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[2],
            wallet: wallet,
            toAddress: accounts[2],
            amount: 55,
            data: 'aa',
            expireTime: Math.floor(new Date().getTime() / 1000) - 100,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSig(params);
        });

        it('Can send with a sequence ID that is not sequential but higher than previous', async function () {
          sequenceId = 1000;
          const params = {
            msgSenderAddress: accounts[1],
            otherSignerAddress: accounts[2],
            wallet: wallet,
            toAddress: accounts[5],
            amount: 60,
            data: 'abcde35f1230',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectSuccessfulSendMultiSig(params);
        });

        it('Can not send with a sequence ID that is unused but lower than the previous (not strictly monotonic increase)', async function () {
          sequenceId = 200;
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            toAddress: accounts[5],
            amount: 61,
            data: '100135f123',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSig(params);
        });

        it('Should fail with an invalid signature', async function () {
          sequenceId = sequenceId + 1;
          const msgSenderAddress = accounts[0];
          const otherSignerAddress = accounts[5];
          const toAddress = accounts[6];
          const amount = '60';
          const data = '';
          const expireTime = Math.floor(new Date().getTime() / 1000) + 60;

          const destinationStartBalance = await web3.eth.getBalance(toAddress);
          const walletStartBalance = await web3.eth.getBalance(wallet.address);

          // Get the operation hash to be signed
          const operationHash = helpers.getSha3ForConfirmationTx(
            nativePrefix,
            toAddress.toLowerCase(),
            web3.utils.toWei(amount, 'ether'),
            data,
            expireTime,
            sequenceId
          );

          // 2) sign tx with another account and modify the signature to make it invalid
          const sig = util.ecsign(
            operationHash,
            privateKeyForAccount(otherSignerAddress)
          );
          sig.v = 0x666;

          try {
            await wallet.sendMultiSig(
              toAddress.toLowerCase(),
              web3.utils.toWei(web3.utils.toBN(amount), 'ether'),
              '0x' + data,
              expireTime,
              sequenceId,
              helpers.serializeSignature(sig),
              { from: msgSenderAddress }
            );
          } catch (e) {
            assertVMException(e, 'Invalid signer');
          }
        });

        it('Send with a sequence ID that has been previously used should fail', async function () {
          sequenceId = usedSequenceId || sequenceId - 1;
          const params = {
            msgSenderAddress: accounts[2],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            toAddress: accounts[5],
            amount: 62,
            data: '',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSig(params);
        });

        it('Send with a sequence ID that is used many transactions ago (lower than previous 10) should fail', async function () {
          sequenceId = 1;
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            toAddress: accounts[5],
            amount: 63,
            data: '5566abfe',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSig(params);
        });

        it('Sign with incorrect operation hash prefix should fail', async function () {
          sequenceId = 1001;
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            toAddress: accounts[5],
            amount: 63,
            data: '5566abfe',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId,
            prefix: 'Invalid'
          };

          await expectFailSendMultiSig(params);
        });
      });

      const sendMultiSigBatchTestHelper = async function (params) {
        assert(params.msgSenderAddress);
        assert(params.otherSignerAddress);
        assert(params.wallet);

        assert(params.recipients);
        assert(params.values);
        assert(params.expireTime);
        assert(params.sequenceId);

        // For testing, allow arguments to override the parameters above,
        // as if the other signer or message sender were changing them
        const otherSignerArgs = _.extend({}, params, params.otherSignerArgs);
        const msgSenderArgs = _.extend({}, params, params.msgSenderArgs);

        // Get the operation hash to be signed
        const operationHash = helpers.getSha3ForBatchTx(
          params.prefix || nativeBatchPrefix,
          otherSignerArgs.recipients.map((recipient) =>
            recipient.toLowerCase()
          ),
          otherSignerArgs.values.map((value) =>
            web3.utils.toWei(value.toString(), 'ether')
          ),
          otherSignerArgs.expireTime,
          otherSignerArgs.sequenceId
        );
        const sig = util.ecsign(
          operationHash,
          privateKeyForAccount(params.otherSignerAddress)
        );

        await params.wallet.sendMultiSigBatch(
          msgSenderArgs.recipients,
          msgSenderArgs.values.map((value) =>
            web3.utils.toWei(value.toString(), 'ether')
          ),
          msgSenderArgs.expireTime,
          msgSenderArgs.sequenceId,
          helpers.serializeSignature(sig),
          { from: params.msgSenderAddress }
        );
      };

      // Helper to expect successful batch execute and confirm
      const expectSuccessfulSendMultiSigBatch = async function (params) {
        const uniqueRecipients = Array.from(new Set(params.recipients));
        const recipientStartBalanceMap = {};
        const recipientValueMap = {};
        for (let i = 0; i < params.recipients.length; i++) {
          const recipient = params.recipients[i];
          if (recipientValueMap[recipient] === undefined) {
            recipientValueMap[recipient] = new BigNumber(0);
          }
          recipientValueMap[recipient] = recipientValueMap[recipient].plus(
            web3.utils.toWei(params.values[i].toString(), 'ether')
          );
        }

        for (const recipient of uniqueRecipients) {
          recipientStartBalanceMap[recipient] = await web3.eth.getBalance(
            recipient
          );
        }

        const walletStartBalance = await web3.eth.getBalance(
          params.wallet.address
        );

        const result = await sendMultiSigBatchTestHelper(params);

        // Check the post-transaction balances
        const weiValues = params.values.map((value) =>
          web3.utils.toWei(value.toString(), 'ether')
        );
        let totalValue = new BigNumber(0);
        for (const recipient of uniqueRecipients) {
          const startBalance = recipientStartBalanceMap[recipient];
          const endBalance = await web3.eth.getBalance(recipient);
          const value = recipientValueMap[recipient];
          new BigNumber(startBalance)
            .plus(value)
            .eq(endBalance)
            .should.be.true();

          totalValue = totalValue.plus(value);
        }

        const walletEndBalance = await web3.eth.getBalance(
          params.wallet.address
        );
        new BigNumber(walletStartBalance)
          .minus(totalValue)
          .eq(walletEndBalance)
          .should.be.true();

        return result;
      };

      // Helper to expect failed execute and confirm
      const expectFailSendMultiSigBatch = async function (
        params,
        expectedErrMsg
      ) {
        const destinationStartBalances = await params.recipients.map(
          async (address) => await web3.eth.getBalance(address)
        );
        const walletStartBalance = await web3.eth.getBalance(
          params.wallet.address
        );

        try {
          await sendMultiSigBatchTestHelper(params);
          throw new Error('should not have sent successfully');
        } catch (err) {
          assertVMException(err, expectedErrMsg);
        }

        // Check the balances after the transaction
        const destinationEndBalances = await params.recipients.map(
          async (address) => await web3.eth.getBalance(address)
        );
        for (let i = 0; i < destinationStartBalances.length; i++) {
          const startBalance = await destinationStartBalances[i];
          const endBalance = await destinationEndBalances[i];
          startBalance.should.eql(endBalance);
        }
        const walletEndBalance = await web3.eth.getBalance(
          params.wallet.address
        );
        walletStartBalance.should.eql(walletEndBalance);
      };

      describe('Batch Transaction sending using sendMultiSigBatch', function () {
        let gasGuzzlerInstance;
        let failInstance;
        let gasHeavyInstance;

        before(async function () {
          // Create and fund the wallet
          wallet = await createWallet(accounts[0], [
            accounts[0],
            accounts[1],
            accounts[2]
          ]);
          const amount = web3.utils.toWei('200000', 'ether');
          await web3.eth.sendTransaction({
            from: accounts[0],
            to: wallet.address,
            value: amount
          });

          const balance = await getBalanceInWei(wallet.address);
          balance.toString().should.eql(amount);
          failInstance = await Fail.new();
          gasGuzzlerInstance = await GasGuzzler.new();
          gasHeavyInstance = await GasHeavy.new();
        });

        let sequenceId;
        beforeEach(async function () {
          // Run before each test. Sets the sequence ID up to be used in the tests
          const sequenceIdString = await wallet.getNextSequenceId.call();
          sequenceId = parseInt(sequenceIdString);
        });

        it('Batch to two recipients', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [accounts[5], accounts[7]],
            values: [60, 25],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectSuccessfulSendMultiSigBatch(params);
        });

        it('Batch to ten recipients, all the same', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: Array(10).fill(accounts[5]),
            values: Array(10).fill(10),
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectSuccessfulSendMultiSigBatch(params);
        });

        it('Batch with sum greater than balance should fail', async function () {
          const walletBalance = await web3.eth.getBalance(accounts[0]);
          const halfBalance = new BigNumber(walletBalance).div(2).toFixed();

          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [accounts[5], accounts[6], accounts[7]],
            values: [halfBalance, halfBalance, halfBalance],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSigBatch(params, 'Insufficient funds');
        });

        it('Sending to 0 recipients should fail', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [],
            values: [],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSigBatch(params, 'Not enough recipients');
        });

        it('Sending with differing number of recipients and values should fail', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [accounts[5], accounts[6], accounts[7]],
            values: [15, 12],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSigBatch(
            params,
            'Unequal recipients and values'
          );
        });

        it('Sending to too many recipients', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: Array(256).fill(accounts[5]),
            values: Array(256).fill(10),
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSigBatch(params, 'Too many recipients');
        });

        it('Msg sender changing the amount should fail', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [accounts[8]],
            values: [15],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          // override with different amount
          params.msgSenderArgs = {
            values: [20]
          };

          await expectFailSendMultiSigBatch(params, 'Invalid signer');
        });

        it('Msg sender changing the destination account should fail', async function () {
          const params = {
            msgSenderAddress: accounts[1],
            otherSignerAddress: accounts[0],
            wallet: wallet,
            recipients: [accounts[5]],
            values: [25],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          // override with different amount
          params.msgSenderArgs = {
            recipients: [accounts[6]]
          };

          await expectFailSendMultiSigBatch(params, 'Invalid signer');
        });

        it('Msg sender changing the expire time should fail', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [accounts[2]],
            values: [50],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          // override with different amount
          params.msgSenderArgs = {
            expireTime: Math.floor(new Date().getTime() / 1000) + 1000
          };

          await expectFailSendMultiSigBatch(params, 'Invalid signer');
        });

        it('Same owner signing twice should fail', async function () {
          const params = {
            msgSenderAddress: accounts[2],
            otherSignerAddress: accounts[2],
            wallet: wallet,
            recipients: [accounts[9]],
            values: [51],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSigBatch(params, 'Signers cannot be equal.');
        });

        it('Sending from an unauthorized signer (but valid other signature) should fail', async function () {
          const params = {
            msgSenderAddress: accounts[7],
            otherSignerAddress: accounts[2],
            wallet: wallet,
            recipients: [accounts[1]],
            values: [52],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSigBatch(
            params,
            'Non-signer in onlySigner method.'
          );
        });

        it('Sending from an authorized signer (but unauthorized other signer) should fail', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[6],
            wallet: wallet,
            recipients: [accounts[6]],
            values: [53],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSigBatch(params, 'Invalid signer');
        });

        let usedSequenceId;
        it('Sending with expireTime very far out should work', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [accounts[5]],
            values: [60],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectSuccessfulSendMultiSigBatch(params);
          usedSequenceId = sequenceId;
        });

        it('Sending with expireTime in the past should fail', async function () {
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[2],
            wallet: wallet,
            recipients: [accounts[2]],
            values: [55],
            expireTime: Math.floor(new Date().getTime() / 1000) - 100,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSigBatch(params, 'Transaction expired.');
        });

        it('Can send with a sequence ID that is not sequential but higher than previous', async function () {
          sequenceId = 1000;
          const params = {
            msgSenderAddress: accounts[1],
            otherSignerAddress: accounts[2],
            wallet: wallet,
            recipients: [accounts[5]],
            values: [60],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectSuccessfulSendMultiSigBatch(params);
        });

        it('Can not send with a sequence ID that is unused but lower than the previous (not strictly monotonic increase)', async function () {
          sequenceId = 200;
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [accounts[5]],
            values: [61],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSigBatch(params, 'sequenceId is too low');
        });

        it('Send with a sequence ID that has been previously used should fail', async function () {
          sequenceId = usedSequenceId || sequenceId - 1;
          const params = {
            msgSenderAddress: accounts[2],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [accounts[5]],
            values: [62],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSigBatch(params, 'sequenceId is too low');
        });

        it('Send with a sequence ID that is used many transactions ago (lower than previous 10) should fail', async function () {
          sequenceId = 1;
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [accounts[5]],
            values: [63],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSigBatch(params, 'sequenceId is too low');
        });

        it('Sign with incorrect operation hash prefix should fail', async function () {
          sequenceId = 1001;
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [accounts[5]],
            values: [63],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId,
            prefix: 'Invalid'
          };

          await expectFailSendMultiSigBatch(params, 'Invalid signer');
        });

        it('Fails all transfers when one recipient eats all of the gas', async function () {
          sequenceId = 1001;
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [gasGuzzlerInstance.address, accounts[5]],
            values: [63, 20],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSigBatch(params, 'Call failed');
        });

        it('Fails all transfers when one recipient fails', async function () {
          sequenceId = 1001;
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [failInstance.address, accounts[5]],
            values: [63, 20],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectFailSendMultiSigBatch(params, 'Call failed');
        });

        it("Doesn't fail if one contract uses a lot of gas but doesn't run out", async function () {
          sequenceId = 1001;
          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            recipients: [gasHeavyInstance.address, accounts[5]],
            values: [63, 20],
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: sequenceId
          };

          await expectSuccessfulSendMultiSigBatch(params, 'Call failed');
        });
      });

      describe('Safe mode', function () {
        before(async function () {
          // Create and fund the wallet
          wallet = await createWallet(accounts[0], [
            accounts[0],
            accounts[1],
            accounts[2]
          ]);
          await web3.eth.sendTransaction({
            from: accounts[0],
            to: wallet.address,
            value: web3.utils.toWei('50000', 'ether')
          });
        });

        it('Cannot be activated by unauthorized user', async function () {
          await truffleAssert.reverts(
            wallet.activateSafeMode({ from: accounts[5] })
          );
          const isSafeMode = await wallet.safeMode.call();
          isSafeMode.should.eql(false);
        });

        it('Can be activated by any authorized signer', async function () {
          for (let i = 0; i < 3; i++) {
            const wallet = await createWallet(accounts[0], [
              accounts[0],
              accounts[1],
              accounts[2]
            ]);
            await wallet.activateSafeMode({ from: accounts[i] });
            const isSafeMode = await wallet.safeMode.call();
            isSafeMode.should.eql(true);
          }
        });

        it('Cannot send transactions to external addresses in safe mode', async function () {
          let isSafeMode = await wallet.safeMode.call();
          isSafeMode.should.eql(false);
          const tx = await wallet.activateSafeMode.sendTransaction({
            from: accounts[1]
          });
          isSafeMode = await wallet.safeMode.call();
          isSafeMode.should.eql(true);
          const safeModeEvent = await helpers.getEventFromTransaction(
            tx.receipt.transactionHash,
            SAFE_MODE_ACTIVATE_EVENT
          );

          should.exist(safeModeEvent);
          safeModeEvent.msgSender.should.eql(accounts[1]);

          const params = {
            msgSenderAddress: accounts[0],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            toAddress: accounts[8],
            amount: 22,
            data: '100135f123',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: 10001
          };

          await expectFailSendMultiSig(params);
        });

        it('Can send transactions to signer addresses in safe mode', async function () {
          const params = {
            msgSenderAddress: accounts[2],
            otherSignerAddress: accounts[1],
            wallet: wallet,
            toAddress: accounts[0],
            amount: 28,
            data: '100135f123',
            expireTime: Math.floor(new Date().getTime() / 1000) + 60,
            sequenceId: 9000
          };

          await expectSuccessfulSendMultiSig(params);
        });
      });

      describe('Forwarder addresses', function () {
        const forwardAbi = [
          {
            constant: false,
            inputs: [],
            name: 'flush',
            outputs: [],
            type: 'function'
          },
          {
            constant: true,
            inputs: [],
            name: 'destinationAddress',
            outputs: [{ name: '', type: 'address' }],
            type: 'function'
          },
          { inputs: [], type: 'constructor' }
        ];
        const forwardContract = new web3.eth.Contract(forwardAbi);

        it('Create and forward', async function () {
          const wallet = await createWallet(accounts[0], [
            accounts[0],
            accounts[1],
            accounts[2]
          ]);
          const forwarder = await (
            await createForwarderFromWallet(wallet)
          ).create();
          const forwarderBalance = await web3.eth.getBalance(forwarder.address);
          web3.utils.fromWei(forwarderBalance, 'ether').should.eql('0');

          await web3.eth.sendTransaction({
            from: accounts[1],
            to: forwarder.address,
            value: web3.utils.toWei('200', 'ether')
          });

          // Verify funds forwarded
          const endForwarderBalance = await web3.eth.getBalance(
            forwarder.address
          );
          web3.utils.fromWei(endForwarderBalance, 'ether').should.eql('0');

          const endWalletBalance = await web3.eth.getBalance(wallet.address);
          web3.utils.fromWei(endWalletBalance, 'ether').should.eql('200');
        });

        it('Forwards value, not call data', async function () {
          // When calling a nonexistent method on forwarder, transfer call value to target address and emit event on success.
          // Don't call a method on target contract.
          //
          // While the WalletSimple contract has no side-effect methods that can be called from arbitrary msg.sender,
          // this could change in the future.
          // Simulate this with a ForwarderContract that has a side effect.

          const forwarderTarget = await ForwarderTarget.new();
          // can be passed for wallet since it has the same interface
          const forwarder = await (
            await createForwarderFromWallet(forwarderTarget)
          ).create();
          const events = [];
          forwarder.allEvents({}, (err, event) => {
            if (err) {
              throw err;
            }
            events.push(event);
          });
          const forwarderAsTarget = await ForwarderTarget.at(forwarder.address);

          const newData = 0xc0fefe;

          for (const setDataReturn of [true, false]) {
            // clear events
            events.length = 0;

            // calls without value do not emit deposited event and don't get forwarded
            const tx = await forwarderAsTarget.setData(newData, setDataReturn);
            (await forwarderTarget.data.call()).toString().should.eql('0');

            const depositedEvent = await helpers.getEventFromTransaction(
              tx.receipt.transactionHash,
              FORWARDER_DEPOSITED_EVENT
            );
            // since no value was sent, it should not emit the deposited event
            should.not.exist(depositedEvent);

            // Same for setDataWithValue()
            const oldBalance = await web3.eth.getBalance(
              forwarderTarget.address
            );
            const setDataTx = await forwarderAsTarget.setDataWithValue(
              newData + 1,
              setDataReturn,
              {
                value: 100
              }
            );
            (await forwarderTarget.data.call()).toString().should.eql('0');
            const newBalance = await web3.eth.getBalance(
              forwarderTarget.address
            );
            new BigNumber(oldBalance).plus(100).eq(newBalance).should.be.true();

            const depositedEvent2 = await helpers.getEventFromTransaction(
              setDataTx.receipt.transactionHash,
              FORWARDER_DEPOSITED_EVENT
            );
            should.exist(depositedEvent2);
          }
        });

        it('Multiple forward contracts', async function () {
          const numForwardAddresses = 10;
          const etherEachSend = 4;
          const wallet = await createWallet(accounts[2], [
            accounts[2],
            accounts[3],
            accounts[4]
          ]);

          // Create forwarders and send 4 ether to each of the addresses
          for (let i = 0; i < numForwardAddresses; i++) {
            const forwarder = await (
              await createForwarderFromWallet(wallet)
            ).create();
            await web3.eth.sendTransaction({
              from: accounts[1],
              to: forwarder.address,
              value: web3.utils.toWei(web3.utils.toBN(etherEachSend), 'ether')
            });
          }

          // Verify all the forwarding is complete
          const balance = await web3.eth.getBalance(wallet.address);
          web3.utils
            .fromWei(balance, 'ether')
            .should.eql(
              web3.utils.toBN(etherEachSend * numForwardAddresses).toString()
            );
        });

        it('Send before create, then flush', async function () {
          const wallet = await createWallet(accounts[3], [
            accounts[3],
            accounts[4],
            accounts[5]
          ]);
          const {
            forwarderAddress: forwarderContractAddress,
            create
          } = await createForwarderFromWallet(wallet);

          await web3.eth.sendTransaction({
            from: accounts[1],
            to: forwarderContractAddress,
            value: web3.utils.toWei('300', 'ether')
          });
          const forwarderBalance = await web3.eth.getBalance(
            forwarderContractAddress
          );
          web3.utils
            .fromWei(forwarderBalance, 'ether')
            .should.eql(web3.utils.toBN(300).toString());
          const walletBalance = await web3.eth.getBalance(wallet.address);
          web3.utils
            .fromWei(walletBalance, 'ether')
            .should.eql(web3.utils.toBN(0).toString());

          const forwarder = await create();
          forwarder.address.should.eql(forwarderContractAddress);

          // Verify that funds were automatically flushed to the base wallet
          const endForwarderBalance = await web3.eth.getBalance(
            forwarderContractAddress
          );
          web3.utils
            .fromWei(endForwarderBalance, 'ether')
            .should.eql(web3.utils.toBN(0).toString());
          const endWalletBalance = await web3.eth.getBalance(wallet.address);
          web3.utils
            .fromWei(endWalletBalance, 'ether')
            .should.eql(web3.utils.toBN(300).toString());
        });

        it('Flush sent from external account', async function () {
          const wallet = await createWallet(accounts[4], [
            accounts[4],
            accounts[5],
            accounts[6]
          ]);
          const {
            forwarderAddress: forwarderContractAddress,
            create
          } = await createForwarderFromWallet(wallet);

          await web3.eth.sendTransaction({
            from: accounts[1],
            to: forwarderContractAddress,
            value: web3.utils.toWei('300', 'ether')
          });
          const forwarderBalance = await web3.eth.getBalance(
            forwarderContractAddress
          );
          web3.utils
            .fromWei(forwarderBalance, 'ether')
            .should.eql(web3.utils.toBN(300).toString());
          const walletBalance = await web3.eth.getBalance(wallet.address);
          web3.utils
            .fromWei(walletBalance, 'ether')
            .should.eql(web3.utils.toBN(0).toString());

          const forwarder = await create();
          forwarder.address.should.eql(forwarderContractAddress);

          // Verify that funds were flushed automatically
          const endForwarderBalance = await web3.eth.getBalance(
            forwarderContractAddress
          );
          web3.utils
            .fromWei(endForwarderBalance, 'ether')
            .should.eql(web3.utils.toBN(0).toString());
          const endWalletBalance = await web3.eth.getBalance(wallet.address);
          web3.utils
            .fromWei(endWalletBalance, 'ether')
            .should.eql(web3.utils.toBN(300).toString());
        });
      });

      describe('ERC20 token transfers', function () {
        let fixedSupplyTokenContract;
        let tetherTokenContract;
        before(async function () {
          // Create and fund the wallet
          wallet = await createWallet(accounts[4], [
            accounts[4],
            accounts[5],
            accounts[6]
          ]);
          fixedSupplyTokenContract = await FixedSupplyToken.new({
            from: accounts[0]
          });
          const balance = await fixedSupplyTokenContract.balanceOf.call(
            accounts[0]
          );
          balance.toString().should.eql('1000000');
          tetherTokenContract = await Tether.new('1000000', 'USDT', 'USDT', 6, {
            from: accounts[0]
          });
          const tetherBalance = await tetherTokenContract.balanceOf.call(
            accounts[0]
          );
          tetherBalance.toString().should.eql('1000000');
        });

        it('Receive and Send tokens from main wallet contract', async function () {
          await fixedSupplyTokenContract.transfer(wallet.address, 100, {
            from: accounts[0]
          });
          const balance = await fixedSupplyTokenContract.balanceOf.call(
            accounts[0]
          );
          balance.should.eql(web3.utils.toBN(1000000 - 100));
          const msigWalletStartTokens = await fixedSupplyTokenContract.balanceOf.call(
            wallet.address
          );
          msigWalletStartTokens.should.eql(web3.utils.toBN(100));

          const sequenceIdString = await wallet.getNextSequenceId.call();
          const sequenceId = parseInt(sequenceIdString);

          const destinationAccount = accounts[5];
          const amount = 50;
          const expireTime = Math.floor(new Date().getTime() / 1000) + 60; // 60 seconds

          const destinationAccountStartTokens = await fixedSupplyTokenContract.balanceOf.call(
            accounts[5]
          );
          destinationAccountStartTokens.should.eql(web3.utils.toBN(0));

          const operationHash = helpers.getSha3ForConfirmationTokenTx(
            tokenPrefix,
            destinationAccount,
            amount,
            fixedSupplyTokenContract.address,
            expireTime,
            sequenceId
          );
          const sig = util.ecsign(
            operationHash,
            privateKeyForAccount(accounts[4])
          );

          await wallet.sendMultiSigToken(
            destinationAccount,
            amount,
            fixedSupplyTokenContract.address,
            expireTime,
            sequenceId,
            helpers.serializeSignature(sig),
            { from: accounts[5] }
          );

          const destinationAccountEndTokens = await fixedSupplyTokenContract.balanceOf.call(
            destinationAccount
          );
          destinationAccountStartTokens
            .add(web3.utils.toBN(amount))
            .eq(destinationAccountEndTokens)
            .should.be.true();

          // Check wallet balance
          const msigWalletEndTokens = await fixedSupplyTokenContract.balanceOf.call(
            wallet.address
          );
          web3.utils
            .toBN(msigWalletStartTokens)
            .sub(web3.utils.toBN(amount))
            .eq(msigWalletEndTokens)
            .should.be.true();
        });

        it('Flush from Forwarder contract', async function () {
          const forwarder = await (
            await createForwarderFromWallet(wallet)
          ).create();
          await fixedSupplyTokenContract.transfer(forwarder.address, 100, {
            from: accounts[0]
          });
          const balance = await fixedSupplyTokenContract.balanceOf.call(
            accounts[0]
          );
          balance.should.eql(web3.utils.toBN(1000000 - 100 - 100));

          const forwarderContractStartTokens = await fixedSupplyTokenContract.balanceOf.call(
            forwarder.address
          );
          forwarderContractStartTokens.should.eql(web3.utils.toBN(100));
          const walletContractStartTokens = await fixedSupplyTokenContract.balanceOf.call(
            wallet.address
          );

          await wallet.flushForwarderTokens(
            forwarder.address,
            fixedSupplyTokenContract.address,
            { from: accounts[5] }
          );

          const forwarderAccountEndTokens = await fixedSupplyTokenContract.balanceOf.call(
            forwarder.address
          );
          forwarderAccountEndTokens.should.eql(web3.utils.toBN(0));

          // Check wallet balance
          const walletContractEndTokens = await fixedSupplyTokenContract.balanceOf.call(
            wallet.address
          );
          walletContractStartTokens
            .add(web3.utils.toBN(100))
            .eq(walletContractEndTokens)
            .should.be.true();
          /* TODO Barath - Get event testing for forwarder contract token send to work
           */
        });

        it('Flush Tether from Forwarder contract', async function () {
          const forwarder = await (
            await createForwarderFromWallet(wallet)
          ).create();
          await tetherTokenContract.transfer(forwarder.address, 100, {
            from: accounts[0]
          });
          const balance = await tetherTokenContract.balanceOf.call(accounts[0]);
          balance.should.eql(web3.utils.toBN(1000000 - 100));

          const forwarderContractStartTokens = await tetherTokenContract.balanceOf.call(
            forwarder.address
          );
          forwarderContractStartTokens.should.eql(web3.utils.toBN(100));
          const walletContractStartTokens = await tetherTokenContract.balanceOf.call(
            wallet.address
          );

          await wallet.flushForwarderTokens(
            forwarder.address,
            tetherTokenContract.address,
            { from: accounts[5] }
          );

          const forwarderAccountEndTokens = await tetherTokenContract.balanceOf.call(
            forwarder.address
          );
          forwarderAccountEndTokens.should.eql(web3.utils.toBN(0));

          // Check wallet balance
          const walletContractEndTokens = await tetherTokenContract.balanceOf.call(
            wallet.address
          );
          walletContractStartTokens
            .add(web3.utils.toBN(100))
            .eq(walletContractEndTokens)
            .should.be.true();
          /* TODO Barath - Get event testing for forwarder contract token send to work
           */
        });
      });
    });
  }
);
