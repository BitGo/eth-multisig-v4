// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.10;
import './Forwarder.sol';
import './CloneFactory.sol';

contract ForwarderFactory is CloneFactory {
  address public immutable implementationAddress;

  event ForwarderCreated(
    address newForwarderAddress,
    address parentAddress,
    bool shouldAutoFlushERC721,
    bool shouldAutoFlushERC1155
  );

  constructor(address _implementationAddress) {
    implementationAddress = _implementationAddress;
  }

  function createForwarder(address parent, bytes32 salt) external {
    this.createForwarder(parent, salt, true, true);
  }

  function createForwarder(
    address parent,
    bytes32 salt,
    bool shouldAutoFlushERC721,
    bool shouldAutoFlushERC1155
  ) external {
    // include the signers in the salt so any contract deployed to a given address must have the same signers
    bytes32 finalSalt = keccak256(abi.encodePacked(parent, salt));

    address payable clone = clone(implementationAddress, finalSalt, abi.encodePacked(parent));
    Forwarder(clone).init(
      shouldAutoFlushERC721,
      shouldAutoFlushERC1155
    );
    emit ForwarderCreated(
      clone,
      parent,
      shouldAutoFlushERC721,
      shouldAutoFlushERC1155
    );
  }

  function computeForwarderAddress(address parent, bytes32 salt) external view returns (address) {
    bytes32 finalSalt = keccak256(abi.encodePacked(parent, salt));
    return computeCloneAddress(implementationAddress, finalSalt, abi.encodePacked(parent));
  }
}
