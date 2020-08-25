// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.7.0;


import "../Forwarder.sol";

// This is a test target for a Forwarder.
// It contains a public function with a side-effect.
contract ForwarderTarget {
    uint public data;

    constructor() {
    }

    function setDataWithValue(uint d, bool b) payable public returns (bool) {
        data = d;
        return b;
    }

    function setData(uint d, bool b) public returns (bool) {
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
    }

    /**
     * Plain Receive function; Gets called when Ether is deposited with no data
     */
    receive() external payable {
        // accept unspendable balance
    }
}
