// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.7.0;
import "./Forwarder.sol";
import "./CloneFactory.sol";

contract ForwarderFactory is CloneFactory {

  address public implementationAddress;

  event ForwarderCreated(address newForwarderAddress, address parentAddress);

  constructor(address _implementationAddress) {
    implementationAddress = _implementationAddress;
  }

  function createForwarder(address parent, bytes32 salt) public {
    address payable clone = createClone(implementationAddress, salt);
    Forwarder(clone).init(parent);
    emit ForwarderCreated(clone, parent);
  }
}
