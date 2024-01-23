// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;
import './RecoveryWalletSimple.sol';
import '../CloneFactory.sol';

contract RecoveryWalletFactory is CloneFactory {
  address public immutable implementationAddress;

  constructor(address _implementationAddress) {
    implementationAddress = _implementationAddress;
  }

  function createWallet(address[] calldata allowedSigners, bytes32 salt)
    external
  {
    // include the signers in the salt so any contract deployed to a given address must have the same signers
    bytes32 finalSalt = keccak256(abi.encodePacked(allowedSigners, salt));

    address payable clone = createClone(implementationAddress, finalSalt);
    RecoveryWalletSimple(clone).init(allowedSigners[2]);
  }
}
