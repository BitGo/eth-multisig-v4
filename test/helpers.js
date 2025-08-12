/**
 * @file helpers.js
 * @description Utility functions for creating operation hashes and signatures for multisig wallets.
 * Updated for Ethers.js v6 and aligned to contract encoding (keccak256 over abi.encode).
 */

const { ethers } = require('ethers');

// Original accounts array approach (from commit 67e66761c3092cc3a592b7ab8b673f6bd2801721)
const util = require('ethereumjs-util');

// Test accounts (kept in sync with hardhat.config.ts -> networks.hardhat.accounts)
exports.accounts = [
  '0xc8209c2200f920b11a460733c91687565c712b40c6f0350e9ad4138bf3193e47',
  '0x915334f048736c64127e91a1dc35dad86c91e59081cdc12cd060103050e2f3b1',
  '0x80bf357dd53e61db0e68acbb270e16fd42645903b51329c856cf3cb36f180a3e',
  '0xdf231d240ce40f844d56cea3a7663b4be8c373fdd6a4fe69cacaaa68c698c590',
  '0x71ce3f6c92d687ebbdc9b632744178707f39228ae1001a2de66f8b98de36ca07',
  '0xca4e687f97b8c64705cddb53c92454994c83abcb4218c7c62955bac292c3bc9e',
  '0x0755057fc0113fdc174e919622f237d30044a4c1c47f3663608b9ee9e8a1a58a',
  '0x1a4002a3e2d0c18c058265600838cff40ba24303f6e60cd1c74821e8251f84d5',
  '0x6d276292b8f5047b54db5b2179b5f7050636feaccf6c97a2978200d41d9d3374',
  '0xace7201611ba195f85fb2e25b53e0f9869e57e2267d1c5eef63144c75dee5142'
].map((privkeyHex) => {
  const privkey = Buffer.from(privkeyHex.replace(/^0x/i, ''), 'hex');

  // Ensure the private key is exactly 32 bytes
  if (privkey.length !== 32) {
    throw new Error(
      `Invalid private key length: ${privkey.length}, expected 32 bytes`
    );
  }

  const pubkey = util.privateToPublic(privkey);
  const address = util.pubToAddress(pubkey);
  return { privkey, pubkey, address };
});

// Create address-to-private-key mapping (from the original commit)
const mapAddrToAcct = exports.accounts.reduce(
  (obj, { address, privkey }) =>
    Object.assign(obj, { [address.toString('hex')]: privkey }),
  {}
);

/**
 * Serialize an ECDSA signature into the format expected by the contract.
 * This function recreates the behavior of the old serializeSignature function.
 * @param {Object} sig - Signature object with r, s, and v properties
 * @returns {string} The serialized signature as a hex string
 */
exports.serializeSignature = function (sig) {
  // Ensure v is in the correct range (27 or 28)
  let v = sig.v;
  if (v < 27) {
    v += 27;
  }

  // Convert Buffer objects to hex strings if needed
  let r = sig.r;
  let s = sig.s;

  if (Buffer.isBuffer(r)) {
    r = '0x' + r.toString('hex');
  }
  if (Buffer.isBuffer(s)) {
    s = '0x' + s.toString('hex');
  }

  // Ensure proper hex formatting and padding
  const rHex = r.toString().slice(2).padStart(64, '0'); // Remove 0x and pad to 64 chars
  const sHex = s.toString().slice(2).padStart(64, '0'); // Remove 0x and pad to 64 chars
  const vHex = v.toString(16).padStart(2, '0'); // Convert to hex and pad to 2 chars

  return '0x' + rHex + sHex + vHex;
};

/**
 * Get private key for account (hybrid approach - support both original and current addresses)
 * @param {string} account - The account address
 * @returns {Buffer} The private key as a Buffer
 */
exports.privateKeyForAccount = function (account) {
  // Direct mapping for known current environment addresses
  const currentEnvironmentMapping = {
    '0xB1b359CB06B3a40c53b2fa5Ec112214626bc187A':
      '0xc8209c2200f920b11a460733c91687565c712b40c6f0350e9ad4138bf3193e47', // deployer
    '0xbcBD7ec77f3f286BDaFcDE2A3720E39e93A726C6':
      '0x915334f048736c64127e91a1dc35dad86c91e59081cdc12cd060103050e2f3b1', // signer1
    '0x0BB0cB323c4DB61AA1f7d569dbDAa773A21daC58':
      '0x80bf357dd53e61db0e68acbb270e16fd42645903b51329c856cf3cb36f180a3e' // signer2
  };

  // First try the current environment mapping
  let privateKeyHex = currentEnvironmentMapping[account];

  // If not found, try the original address-to-private-key mapping
  if (!privateKeyHex) {
    const originalPrivKey =
      mapAddrToAcct[util.stripHexPrefix(account).toLowerCase()];
    if (originalPrivKey) {
      return originalPrivKey;
    }
  }

  if (!privateKeyHex) {
    throw new Error('no privkey for ' + account);
  }

  return Buffer.from(privateKeyHex.slice(2), 'hex');
};

/**
 * Helper to get the keccak256 hash for a standard single-destination multisig transaction.
 * This matches the format expected by the WalletSimple contract.
 * @param {string} prefix - The domain separator prefix (e.g., chainId).
 * @param {string} toAddress - The destination address.
 * @param {string} amount - The amount of Ether to send (as a string).
 * @param {string} data - The transaction data.
 * @param {number} expireTime - The expiration time of the signature.
 * @param {number} sequenceId - The wallet's sequence ID (nonce).
 * @returns {string} The keccak256 hash of the packed arguments.
 */
exports.getSha3ForConfirmationTx = function (
  prefix,
  toAddress,
  amount,
  data,
  expireTime,
  sequenceId
) {
  // Match Solidity: keccak256(abi.encode(prefix, toAddress, value, data, expireTime, sequenceId))
  const abi = ethers.AbiCoder.defaultAbiCoder();
  const encoded = abi.encode(
    ['string', 'address', 'uint256', 'bytes', 'uint256', 'uint256'],
    [prefix, toAddress, amount, data, expireTime, sequenceId]
  );
  return ethers.keccak256(encoded);
};

/**
 * Helper to get the keccak256 hash for a batch multisig transaction.
 * This matches the format expected by the WalletSimple contract.
 * @param {string} prefix - The domain separator prefix (e.g., chainId-Batch).
 * @param {string[]} recipients - An array of recipient addresses.
 * @param {string[]} values - An array of amounts to send (as strings).
 * @param {number} expireTime - The expiration time of the signature.
 * @param {number} sequenceId - The wallet's sequence ID (nonce).
 * @returns {string} The keccak256 hash of the packed arguments.
 */
exports.getSha3ForBatchTx = function (
  prefix,
  recipients,
  values,
  expireTime,
  sequenceId
) {
  // Match Solidity: keccak256(abi.encode(prefix, recipients, values, expireTime, sequenceId))
  const abi = ethers.AbiCoder.defaultAbiCoder();
  const encoded = abi.encode(
    ['string', 'address[]', 'uint256[]', 'uint256', 'uint256'],
    [prefix, recipients, values, expireTime, sequenceId]
  );
  return ethers.keccak256(encoded);
};

/**
 * Helper to get the keccak256 hash for an ERC20 multisig token transfer.
 * Matches WalletSimple: keccak256(abi.encodePacked(prefix, toAddress, value, tokenContractAddress, expireTime, sequenceId))
 */
exports.getSha3ForConfirmationTokenTx = function (
  prefix,
  toAddress,
  value,
  tokenContractAddress,
  expireTime,
  sequenceId
) {
  return ethers.solidityPackedKeccak256(
    ['string', 'address', 'uint256', 'address', 'uint256', 'uint256'],
    [prefix, toAddress, value, tokenContractAddress, expireTime, sequenceId]
  );
};
