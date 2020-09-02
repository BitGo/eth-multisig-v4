// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.7.0;

contract Fail {
    fallback() external payable {
        revert("Oops");
    }

    receive() external payable {
        revert("Oops");
    }
}
