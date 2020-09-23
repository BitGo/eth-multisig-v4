// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.7.0;
import "./Forwarder.sol";
import "./ERC20Interface.sol";

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
contract WalletSimple {
  // Events
  event Deposited(address from, uint value, bytes data);
  event SafeModeActivated(address msgSender);
  event Transacted(
    address msgSender, // Address of the sender of the message initiating the transaction
    address otherSigner, // Address of the signer (second signature) used to initiate the transaction
    bytes32 operation, // Operation hash (see Data Formats)
    address toAddress, // The address the transaction was sent to
    uint value, // Amount of Wei sent to the address
    bytes data // Data sent when invoking the transaction
  );

  // Public fields
  mapping(address => bool) public signers; // The addresses that can co-sign transactions on the wallet
  bool public safeMode = false; // When active, wallet may only send to signer addresses
  bool public initialized = false; // True if the contract has been initialized

  // Internal fields
  uint private lastSequenceId;
  uint private constant MAX_SEQUENCE_ID_INCREASE = 10000;

  /**
   * Set up a simple multi-sig wallet by specifying the signers allowed to be used on this wallet.
   * 2 signers will be required to send a transaction from this wallet.
   * Note: The sender is NOT automatically added to the list of signers.
   * Signers CANNOT be changed once they are set
   *
   * @param allowedSigners An array of signers on the wallet
   */
  function init(address[] calldata allowedSigners) external onlyUninitialized {
    if (allowedSigners.length != 3) {
      // Invalid number of signers
      revert("Invalid number of signers");
    }

    for (uint i = 0; i < allowedSigners.length; i++) {
        signers[allowedSigners[i]] = true;
    }
    initialized = true;
  }

  /**
   * Determine if an address is a signer on this wallet
   * @param signer address to check
   * returns boolean indicating whether address is signer or not
   */
  function isSigner(address signer) public view returns (bool) {
      return signers[signer];
  }

  /**
   * Modifier that will execute internal code block only if the sender is an authorized signer on this wallet
   */
  modifier onlySigner {
    if (!isSigner(msg.sender)) {
      revert("Non-signer in onlySigner method");
    }
    _;
  }
  
  /**
   * Modifier that will execute internal code block only if the contract has not been initialized yet
   */
  modifier onlyUninitialized {
    if (initialized) {
      revert("Contract already initialized");
    }
    _;
  }

 /**
   * Gets called when a transaction is received with data that does not match any other method
   */
  fallback() external payable {
    if (msg.value > 0) {
      // Fire deposited event if we are receiving funds
      Deposited(msg.sender, msg.value, msg.data);
    }
  }
  
  /**
   * Gets called when a transaction is received with ether and no data
   */
  receive() external payable {
    if (msg.value > 0) {
      // Fire deposited event if we are receiving funds
      Deposited(msg.sender, msg.value, msg.data);
    }
  }


  /**
   * Execute a multi-signature transaction from this wallet using 2 signers: one from msg.sender and the other from ecrecover.
   * Sequence IDs are numbers starting from 1. They are used to prevent replay attacks and may not be repeated.
   *
   * @param toAddress the destination address to send an outgoing transaction
   * @param value the amount in Wei to be sent
   * @param data the data to send to the toAddress when invoking the transaction
   * @param expireTime the number of seconds since 1970 for which this transaction is valid
   * @param sequenceId the unique sequence id obtainable from getNextSequenceId
   * @param signature see Data Formats
   */
  function sendMultiSig(
      address toAddress,
      uint value,
      bytes calldata data,
      uint expireTime,
      uint sequenceId,
      bytes calldata signature
  ) external onlySigner {
    // Verify the other signer
    bytes32 operationHash = keccak256(abi.encodePacked("ETHER", toAddress, value, data, expireTime, sequenceId));
    
    address otherSigner = verifyMultiSig(toAddress, operationHash, signature, expireTime, sequenceId);

    // Success, send the transaction
    (bool success,  ) = toAddress.call{value: value}(data);
    if (!success) {
      // Failed executing transaction
        revert("Call execution failed");
    }
    
    Transacted(msg.sender, otherSigner, operationHash, toAddress, value, data);
  }
  
  /**
   * Execute a multi-signature token transfer from this wallet using 2 signers: one from msg.sender and the other from ecrecover.
   * Sequence IDs are numbers starting from 1. They are used to prevent replay attacks and may not be repeated.
   *
   * @param toAddress the destination address to send an outgoing transaction
   * @param value the amount in tokens to be sent
   * @param tokenContractAddress the address of the erc20 token contract
   * @param expireTime the number of seconds since 1970 for which this transaction is valid
   * @param sequenceId the unique sequence id obtainable from getNextSequenceId
   * @param signature see Data Formats
   */
  function sendMultiSigToken(
      address toAddress,
      uint value,
      address tokenContractAddress,
      uint expireTime,
      uint sequenceId,
      bytes calldata signature
  ) external onlySigner {
    // Verify the other signer
    bytes32 operationHash = keccak256(abi.encodePacked("ERC20", toAddress, value, tokenContractAddress, expireTime, sequenceId));
    
    verifyMultiSig(toAddress, operationHash, signature, expireTime, sequenceId);
    
    ERC20Interface instance = ERC20Interface(tokenContractAddress);
    if (!instance.transfer(toAddress, value)) {
        revert("ERC20 Transfer call failed");
    }
  }
  
  /**
   * Execute a token flush from one of the forwarder addresses. This transfer needs only a single signature and can be done by any signer
   *
   * @param forwarderAddress the address of the forwarder address to flush the tokens from
   * @param tokenContractAddress the address of the erc20 token contract
   */
  function flushForwarderTokens(
    address payable forwarderAddress, 
    address tokenContractAddress
  ) public onlySigner {
    Forwarder forwarder = Forwarder(forwarderAddress);
    forwarder.flushTokens(tokenContractAddress);
  }

  /**
   * Do common multisig verification for both eth sends and erc20token transfers
   *
   * @param toAddress the destination address to send an outgoing transaction
   * @param operationHash see Data Formats
   * @param signature see Data Formats
   * @param expireTime the number of seconds since 1970 for which this transaction is valid
   * @param sequenceId the unique sequence id obtainable from getNextSequenceId
   * returns address that has created the signature
   */
  function verifyMultiSig(
      address toAddress,
      bytes32 operationHash,
      bytes calldata signature,
      uint expireTime,
      uint sequenceId
  ) private returns (address) {

    address otherSigner = recoverAddressFromSignature(operationHash, signature);

    // Verify if we are in safe mode. In safe mode, the wallet can only send to signers
    if (safeMode && !isSigner(toAddress)) {
      revert("External transfer in safe mode");
    }
    // Verify that the transaction has not expired
    if (expireTime < block.timestamp) {
      revert("Transaction expired");
    }

    // Try to insert the sequence ID. Will revert if the sequence id was invalid
    tryUpdateSequenceId(sequenceId);

    if (!isSigner(otherSigner)) {
      revert("Invalid signer");
    }

    if (otherSigner == msg.sender) {
      revert("Confirming own transfer");
    }

    return otherSigner;
  }

  /**
   * Irrevocably puts contract into safe mode. When in this mode, transactions may only be sent to signing addresses.
   */
  function activateSafeMode() external onlySigner {
    safeMode = true;
    SafeModeActivated(msg.sender);
  }

  /**
   * Gets signer's address using ecrecover
   * @param operationHash see Data Formats
   * @param signature see Data Formats
   * returns address recovered from the signature
   */
  function recoverAddressFromSignature(
    bytes32 operationHash,
    bytes memory signature
  ) private pure returns (address) {
    if (signature.length != 65) {
      revert("Invalid signature - wrong length");
    }
    // We need to unpack the signature, which is given as an array of 65 bytes (like eth.sign)
    bytes32 r;
    bytes32 s;
    uint8 v;

    // solhint-disable-next-line
    assembly {
      r := mload(add(signature, 32))
      s := mload(add(signature, 64))
      v := and(mload(add(signature, 65)), 255)
    }
    if (v < 27) {
      v += 27; // Ethereum versions are 27 or 28 as opposed to 0 or 1 which is submitted by some signing libs
    }
    return ecrecover(operationHash, v, r, s);
  }

  /**
   * Verify that the sequence id is greater than the currently stored value and updates the stored value.
   * By requiring sequence IDs to always increase, we ensure that the same signature can't be used twice.
   * @param sequenceId The new sequenceId to use
   */
  function tryUpdateSequenceId(uint sequenceId) private onlySigner {
    if (sequenceId <= lastSequenceId) {
        revert("sequenceId is too low");
    }

    if (sequenceId > lastSequenceId + MAX_SEQUENCE_ID_INCREASE) {
        // Block sequence IDs which are much higher than the current
        // This prevents people blocking the contract by using very large sequence IDs quickly
        revert("sequenceId is too high");
    }

    lastSequenceId = sequenceId;
  }

  /**
   * Gets the next available sequence ID for signing when using executeAndConfirm
   * returns the sequenceId one higher than the one currently stored
   */
  function getNextSequenceId() external view returns (uint) {
    return lastSequenceId + 1;
  }
}
