// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.10;

import '../Batcher.sol';

contract TestBatcherDriver {
  Batcher private batcher;
  bool public doSelfFail;
  bool public doSelfReentry;
  address[] public selfReentryAddress;
  uint256[] public selfReentryValue;

  constructor(
    address payable _batcherAddr,
    bool _doSelfFail,
    bool _doSelfReentry
  ) {
    batcher = Batcher(_batcherAddr);
    doSelfFail = _doSelfFail;
    doSelfReentry = _doSelfReentry;
    selfReentryAddress.push(address(this));
    selfReentryValue.push(1);
  }

  function driveTest(address[] memory recipients, uint256[] memory values)
    external
    payable
  {
    batcher.batch{ value: msg.value }(recipients, values);
  }

  fallback() external payable {
    if (doSelfFail) {
      revert('Oops');
    } else if (doSelfReentry) {
      batcher.batch{ value: msg.value }(selfReentryAddress, selfReentryValue);
    }
  }

  receive() external payable {
    if (doSelfFail) {
      revert('Oops');
    } else if (doSelfReentry) {
      batcher.batch{ value: msg.value }(selfReentryAddress, selfReentryValue);
    }
  }
}
