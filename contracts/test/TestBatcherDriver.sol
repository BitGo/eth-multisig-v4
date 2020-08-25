pragma solidity ^0.7.0;

import "../Batcher.sol";

contract TestBatcherDriver {
    Batcher private batcher;
    bool doSelfFail;
    bool doSelfReentry;
    address[] selfReentryAddress;
    uint256[] selfReentryValue;

    constructor(address payable _batcherAddr, bool _doSelfFail, bool _doSelfReentry) public {
        batcher = Batcher(_batcherAddr);
        doSelfFail = _doSelfFail;
        doSelfReentry = _doSelfReentry;
        selfReentryAddress.push(address(this));
        selfReentryValue.push(1);
    }

    function driveTest(address[] memory recipients, uint256[] memory values) public payable {
        batcher.batch{value: msg.value}(recipients, values);
    }

    fallback() external payable {
        if (doSelfFail) {
            revert("Oops");
        } else if (doSelfReentry) {
            batcher.batch{value: msg.value}(selfReentryAddress, selfReentryValue);
        }
    }

    receive() external payable {
        if (doSelfFail) {
            revert("Oops");
        } else if (doSelfReentry) {
            batcher.batch{value: msg.value}(selfReentryAddress, selfReentryValue);
        }
    }
}
