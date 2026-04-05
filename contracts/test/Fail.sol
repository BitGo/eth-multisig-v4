// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.20;

contract Fail {
  fallback() external payable {
    revert('Oops');
  }

  receive() external payable {
    revert('Oops');
  }
}
