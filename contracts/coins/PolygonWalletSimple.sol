// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.10;
import '../Forwarder.sol';
import '../ERC20Interface.sol';
import '../WalletSimple.sol';

/**
 *
 * WalletSimple
 * ============
 *
 * Basic multi-signer wallet designed for use in a co-signing environment where 2 signatures are required to move funds.
 * Typically used in a 2-of-3 signing configuration. Uses ecrecover to allow for 2 signatures in a single transaction.
 *
 * The first signature is created on the operation hash (see Data Formats) and passed to sendMultiSig/sendMultiSigToken
 * The signer is determined by verifyMultiSig().
 *
 * The second signature is created by the submitter of the transaction and determined by msg.signer.
 *
 * Data Formats
 * ============
 *
 * The signature is created with ethereumjs-util.ecsign(operationHash).
 * Like the eth_sign RPC call, it packs the values as a 65-byte array of [r, s, v].
 * Unlike eth_sign, the message is not prefixed.
 *
 * The operationHash the result of keccak256(prefix, toAddress, value, data, expireTime).
 * For ether transactions, `prefix` is "ETHER".
 * For token transaction, `prefix` is "ERC20" and `data` is the tokenContractAddress.
 *
 *
 */
contract PolygonWalletSimple is WalletSimple {
  /**
   * Get the network identifier that signers must sign over
   * This provides protection signatures being replayed on other chains
   */
  function getNetworkId() internal override pure returns (string memory) {
    return 'POLYGON';
  }

  /**
   * Get the network identifier that signers must sign over for token transfers
   * This provides protection signatures being replayed on other chains
   */
  function getTokenNetworkId() internal override pure returns (string memory) {
    return 'POLYGON-ERC20';
  }

  /**
   * Get the network identifier that signers must sign over for batch transfers
   * This provides protection signatures being replayed on other chains
   */
  function getBatchNetworkId() internal override pure returns (string memory) {
    return 'POLYGON-Batch';
  }
}
