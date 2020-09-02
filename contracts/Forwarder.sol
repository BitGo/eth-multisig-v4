// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.7.0;
import "./ERC20Interface.sol";

/**
 * Contract that will forward any incoming Ether to the creator of the contract
 * 
 */
contract Forwarder {
  // Address to which any funds sent to this contract will be forwarded
  address public parentAddress;
  event ForwarderDeposited(address from, uint value, bytes data);


  /**
   * Initialize the contract, and sets the destination address to that of the creator
   */
  function init(address _parentAddress) external onlyUninitialized {
    parentAddress = _parentAddress;
    this.flush();
  }

  /**
   * Modifier that will execute internal code block only if the sender is the parent address
   */
  modifier onlyParent {
    if (msg.sender != parentAddress) {
      revert();
    }
    _;
  }
  
    /**
   * Modifier that will execute internal code block only if the contract has not been initialized yet
   */
  modifier onlyUninitialized {
    if (parentAddress != address(0x0)) {
      revert("Already initialized");
    }
    _;
  }

  /**
   * Default function; Gets called when data is sent but does not match any other function
   */
  fallback() external payable {
      this.flush();
  }
  
  /**
   * Default function; Gets called when Ether is deposited with no data, and forwards it to the parent address
   */
  receive() external payable {
      this.flush();
  }

  /**
   * Execute a token transfer of the full balance from the forwarder token to the parent address
   * @param tokenContractAddress the address of the erc20 token contract
   */
  function flushTokens(address tokenContractAddress) external onlyParent {
    ERC20Interface instance = ERC20Interface(tokenContractAddress);
    address forwarderAddress = address(this);
    uint256 forwarderBalance = instance.balanceOf(forwarderAddress);
    if (forwarderBalance == 0) {
        return;
    }

    if (!instance.transfer(parentAddress, forwarderBalance)) {
        revert("Token flush failed");
    }
  }

  /**
   * Flush the entire balance of the contract to the parent address.
   */
  function flush() external {
    uint256 value = address(this).balance;
    
    (bool success,  ) = parentAddress.call{value: value}("");
    if (!success) {
        revert("Flush failed");
    }
    emit ForwarderDeposited(msg.sender, value, msg.data);
  }
}
