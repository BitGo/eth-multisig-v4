// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.20;

contract GasGuzzler {
  uint256 public x = 1;

  fallback() external payable {
    while (true) {
      x++;
      x--;
    }
  }

  receive() external payable {
    while (true) {
      x++;
      x--;
    }
  }
}
