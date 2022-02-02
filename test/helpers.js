const abi = require('ethereumjs-abi');
const util = require('ethereumjs-util');
const BN = require('bn.js');
const Promise = require('bluebird');
const _ = require('lodash');

const Forwarder = artifacts.require('./Forwarder.sol');
const ForwarderFactory = artifacts.require('./ForwarderFactory.sol');
const WalletFactory = artifacts.require('./WalletFactory.sol');
const WalletSimple = artifacts.require('./WalletSimple.sol');

const abis = [
  Forwarder.abi,
  ForwarderFactory.abi,
  WalletSimple.abi,
  WalletFactory.abi
];

exports.showBalances = async function () {
  const accounts = await web3.eth.getAccounts();
  for (let i = 0; i < accounts.length; i++) {
    console.log(
      accounts[i] +
        ': ' +
        web3.utils.fromWei(web3.eth.getBalance(accounts[i]), 'ether'),
      'ether'
    );
  }
};

// Polls an array for changes
exports.waitForEvents = function (eventsArray, numEvents) {
  if (numEvents === 0) {
    return Promise.delay(1000); // Wait a reasonable amount so the caller can know no events fired
  }
  numEvents = numEvents || 1;
  const oldLength = eventsArray.length;
  let numTries = 0;
  const pollForEvents = function () {
    numTries++;
    if (eventsArray.length >= oldLength + numEvents) {
      return;
    }
    if (numTries >= 100) {
      if (eventsArray.length == 0) {
        console.log('Timed out waiting for events!');
      }
      return;
    }
    return Promise.delay(50).then(pollForEvents);
  };
  return pollForEvents();
};

// Helper to get sha3 for solidity tightly-packed arguments
exports.getSha3ForConfirmationTx = function (
  prefix,
  toAddress,
  amount,
  data,
  expireTime,
  sequenceId
) {
  return abi.soliditySHA3(
    ['string', 'address', 'uint', 'bytes', 'uint', 'uint'],
    [
      prefix,
      new BN(toAddress.replace('0x', ''), 16),
      amount,
      Buffer.from(data.replace('0x', ''), 'hex'),
      expireTime,
      sequenceId
    ]
  );
};

// Helper to get sha3 for solidity tightly-packed arguments
exports.getSha3ForBatchTx = function (
  prefix,
  recipients,
  values,
  expireTime,
  sequenceId
) {
  return abi.soliditySHA3(
    ['string', 'address[]', 'uint[]', 'uint', 'uint'],
    [prefix, recipients, values, expireTime, sequenceId]
  );
};

// Helper to get token transactions sha3 for solidity tightly-packed arguments
exports.getSha3ForConfirmationTokenTx = function (
  prefix,
  toAddress,
  value,
  tokenContractAddress,
  expireTime,
  sequenceId
) {
  return abi.soliditySHA3(
    ['string', 'address', 'uint', 'address', 'uint', 'uint'],
    [
      prefix,
      new BN(toAddress.replace('0x', ''), 16),
      value,
      new BN(tokenContractAddress.replace('0x', ''), 16),
      expireTime,
      sequenceId
    ]
  );
};

// Serialize signature into format understood by our recoverAddress function
exports.serializeSignature = ({ r, s, v }) =>
  '0x' + Buffer.concat([r, s, Buffer.from([v])]).toString('hex');

/**
 * Returns the address a contract will have when created from the provided address
 * @param address
 * @return address
 */
exports.getNextContractAddress = async (address) => {
  const addressBuffer = Buffer.from(util.stripHexPrefix(address), 'hex');
  const nonce = await web3.eth.getTransactionCount(address);
  return util.toChecksumAddress(
    util.bufferToHex(util.generateAddress(addressBuffer, util.toBuffer(nonce)))
  );
};

exports.getNextContractAddressCreate2 = (address, salt, initCode) => {
  const addressBuffer = Buffer.from(util.stripHexPrefix(address), 'hex');
  const initCodeBuffer = Buffer.from(util.stripHexPrefix(initCode), 'hex');
  return util.toChecksumAddress(
    util.bufferToHex(util.generateAddress2(addressBuffer, salt, initCodeBuffer))
  );
};

exports.assertVMException = async (fn) => {
  let failed = false;
  try {
    await fn();
  } catch (err) {
    err.message.toString().should.containEql('Transaction reverted:');
    failed = true;
  }

  failed.should.equal(true);
};

exports.getInitCode = (targetAddress) => {
  const target = util
    .stripHexPrefix(targetAddress.toLowerCase())
    .padStart(40, '0');
  return `0x3d602d80600a3d3981f3363d3d373d3d3d363d73${target}5af43d82803e903d91602b57fd5bf3`;
};

getEventDetails = (abis, eventName) => {
  let foundAbi;
  for (const abi of abis) {
    foundAbi = _.find(abi, ({ name }) => name === eventName);
    if (foundAbi) {
      break;
    }
  }

  if (!foundAbi) {
    throw new Error(`Unknown event ${eventName}`);
  }

  const hash = web3.eth.abi.encodeEventSignature(foundAbi);
  return { abi: foundAbi, hash };
};

exports.getEventFromTransaction = async (txHash, eventName) => {
  const { abi, hash } = getEventDetails(abis, eventName);
  const receipt = await web3.eth.getTransactionReceipt(txHash);

  if (!receipt) {
    return undefined;
  }

  const eventData = _.find(receipt.logs, function (log) {
    return log.topics && log.topics.length > 0 && log.topics[0] === hash;
  });

  if (!eventData) {
    return undefined;
  }

  return web3.eth.abi.decodeLog(abi.inputs, eventData.data);
};
