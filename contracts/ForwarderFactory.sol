// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;
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
    require(_implementationAddress != address(0), 'Invalid implementation address');
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

    address payable clone = createClone(implementationAddress, finalSalt);
    emit ForwarderCreated(
      clone,
      parent,
      shouldAutoFlushERC721,
      shouldAutoFlushERC1155
    );
    Forwarder(clone).init(
      parent,
      shouldAutoFlushERC721,
      shouldAutoFlushERC1155
    );
  }
}
