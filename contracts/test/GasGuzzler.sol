pragma solidity ^0.7.0;

contract GasGuzzler {
    uint256 x = 1;
    fallback() external payable {
        while(true) {
            x++;
            x--;
        }
    }

    receive() external payable {
        while(true) {
            x++;
            x--;
        }
    }
}

