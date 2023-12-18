// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;
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
 * For ether transactions, `prefix` is chain id of the coin i.e. for arbitrum mainnet it is "42161"
 * For token transaction, `prefix` is "42161-ERC20" and `data` is the tokenContractAddress.
 *
 *
 */
contract ArbethWalletSimple is WalletSimple {
  /**
   * Get the network identifier that signers must sign over
   * This provides protection signatures being replayed on other chains
   */
  function getNetworkId() internal override view returns (string memory) {
    return Strings.toString(block.chainid);
  }

  /**
   * Get the network identifier that signers must sign over for token transfers
   * This provides protection signatures being replayed on other chains
   */
  function getTokenNetworkId() internal override view returns (string memory) {
    return string.concat(Strings.toString(block.chainid), '-ERC20');
  }

  /**
   * Get the network identifier that signers must sign over for batch transfers
   * This provides protection signatures being replayed on other chains
   */
  function getBatchNetworkId() internal override view returns (string memory) {
    return string.concat(Strings.toString(block.chainid), '-Batch');
  }
}
