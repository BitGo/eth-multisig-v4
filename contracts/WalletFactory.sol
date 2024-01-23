// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;
import './WalletSimple.sol';
import './CloneFactory.sol';

contract WalletFactory is CloneFactory {
  address public immutable implementationAddress;

  event WalletCreated(address newWalletAddress, address[] allowedSigners);

  constructor(address _implementationAddress) {
    require(
      _implementationAddress != address(0),
      'Invalid implementation address'
    );
    implementationAddress = _implementationAddress;
  }

  function createWallet(address[] calldata allowedSigners, bytes32 salt)
    external
  {
    // include the signers in the salt so any contract deployed to a given address must have the same signers
    bytes32 finalSalt = keccak256(abi.encodePacked(allowedSigners, salt));

    address payable clone = createClone(implementationAddress, finalSalt);
    emit WalletCreated(clone, allowedSigners);
    WalletSimple(clone).init(allowedSigners);
  }
}
