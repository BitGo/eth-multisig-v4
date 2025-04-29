// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import '../Batcher.sol';

contract Reentry {
  Batcher private batcher;
  address[] public recipients;
  uint256[] public values;
  bool private hasReentered = false;
  uint256 public attackCount = 0;

  constructor(address payable _batcherAddr) {
    batcher = Batcher(_batcherAddr);
    // Set up for reentry attack
    recipients = new address[](1);
    recipients[0] = address(this);
    values = new uint256[](1);
    values[0] = 1; // Small value to allow multiple reentries
  }

  // Function to start the attack
  function attack() external payable {
    // Initial funds to start the attack
    require(msg.value > 0, "Need ETH to start attack");
  }

  fallback() external payable {
    attemptReentry();
  }

  receive() external payable {
    attemptReentry();
  }

  function attemptReentry() private {
    // Limit reentries to avoid infinite loops in testing
    if (!hasReentered && attackCount < 3) {
      hasReentered = true;
      attackCount++;
      // Try to reenter the batch function
      try batcher.batch{value: 1}(recipients, values) {
        // If this succeeds without ReentrancyGuard, the attack worked
      } catch Error(string memory reason) {
        // This should catch the ReentrancyGuard error
        // We can log or handle the error if needed
      }
      hasReentered = false; // Reset for next potential reentry
    }
  }
}
