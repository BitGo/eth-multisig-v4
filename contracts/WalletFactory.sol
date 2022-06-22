// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.10;
import './WalletSimple.sol';
import './CloneFactory.sol';

contract WalletFactory is CloneFactory {
  address public immutable implementationAddress;

  event WalletCreated(address newWalletAddress, address[] allowedSigners);

  constructor(address _implementationAddress) {
    implementationAddress = _implementationAddress;
  }

  function createWallet(address[] calldata allowedSigners, bytes32 salt)
    external
  {
    // include the signers in the salt so any contract deployed to a given address must have the same signers
    bytes32 finalSalt = keccak256(abi.encodePacked(allowedSigners, salt));

    address payable clone = clone(implementationAddress, finalSalt, abi.encodePacked(allowedSigners[0], allowedSigners[1], allowedSigners[2]));
    WalletSimple(clone).init();
    emit WalletCreated(clone, allowedSigners);
  }

  function computeWalletAddress(address[] calldata allowedSigners, bytes32 salt) external view returns (address) {
    bytes32 finalSalt = keccak256(abi.encodePacked(allowedSigners, salt));
    return computeCloneAddress(implementationAddress, finalSalt, abi.encodePacked(allowedSigners[0], allowedSigners[1], allowedSigners[2]));
  }
}
