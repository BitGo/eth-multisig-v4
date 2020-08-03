// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.7.0;
import "./WalletSimple.sol";
import "./CloneFactory.sol";

contract WalletFactory is CloneFactory {

  address public implementationAddress;

  event WalletCreated(address newWalletAddress);

  constructor(address _implementationAddress) {
    implementationAddress = _implementationAddress;
  }

  function createWallet(address[] calldata allowedSigners, bytes32 salt) public {
    address payable clone = createClone(implementationAddress, salt);
    WalletSimple(clone).init(allowedSigners);
    emit WalletCreated(clone);
  }
}
