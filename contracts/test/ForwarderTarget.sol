// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import '../Forwarder.sol';

// This is a test target for a Forwarder.
// It contains a public function with a side-effect.
contract ForwarderTarget {
  uint256 public data;
  event Received();

  function setDataWithValue(uint256 d, bool b) external payable returns (bool) {
    data = d;
    return b;
  }

  function setData(uint256 d, bool b) external returns (bool) {
    data = d;
    return b;
  }

  function createForwarder() public {
    new Forwarder();
  }

  /**
   * Default function; Gets called when Ether is deposited or no function matches
   */
  fallback() external payable {
    // accept unspendable balance
    emit Received();
  }

  /**
   * Plain Receive function; Gets called when Ether is deposited with no data
   */
  receive() external payable {
    // accept unspendable balance
    emit Received();
  }
}
