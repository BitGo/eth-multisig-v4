// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

contract GasHeavy {
  uint256 public x = 1;

  fallback() external payable {
    // will cost more than default 10000 gas to execute this
    for (uint8 i = 0; i < 15; i++) {
      x++;
    }
  }

  receive() external payable {
    // will cost more than default 10000 gas to execute this
    for (uint8 i = 0; i < 15; i++) {
      x++;
    }
  }
}
