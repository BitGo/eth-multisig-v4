// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.7.5;
import '@uniswap/lib/contracts/libraries/TransferHelper.sol';
import './ERC20Interface.sol';

import '@openzeppelin/contracts/token/ERC721/IERC721Holder.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';

/**
 * Contract that will forward any incoming Ether to the creator of the contract
 *
 */
contract Forwarder is IERC721Holder {
  // Address to which any funds sent to this contract will be forwarded
  address public parentAddress;
  event ForwarderDeposited(address from, uint256 value, bytes data);

  /**
   * Initialize the contract, and sets the destination address to that of the creator
   */
  function init(address _parentAddress) external onlyUninitialized {
    parentAddress = _parentAddress;
    uint256 value = address(this).balance;

    if (value == 0) {
      return;
    }

    (bool success, ) = parentAddress.call{ value: value }('');
    require(success, 'Flush failed');
    // NOTE: since we are forwarding on initialization,
    // we don't have the context of the original sender.
    // We still emit an event about the forwarding but set
    // the sender to the forwarder itself
    emit ForwarderDeposited(address(this), value, msg.data);
  }

  /**
   * Modifier that will execute internal code block only if the sender is the parent address
   */
  modifier onlyParent {
    require(msg.sender == parentAddress, 'Only Parent');
    _;
  }

  /**
   * Modifier that will execute internal code block only if the contract has not been initialized yet
   */
  modifier onlyUninitialized {
    require(parentAddress == address(0x0), 'Already initialized');
    _;
  }

  /**
   * Default function; Gets called when data is sent but does not match any other function
   */
  fallback() external payable {
    flush();
  }

  /**
   * Default function; Gets called when Ether is deposited with no data, and forwards it to the parent address
   */
  receive() external payable {
    flush();
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

    TransferHelper.safeTransfer(
      tokenContractAddress,
      parentAddress,
      forwarderBalance
    );
  }

  /**
   * Flush the entire balance of the contract to the parent address.
   */
  function flush() public {
    uint256 value = address(this).balance;

    if (value == 0) {
      return;
    }

    (bool success, ) = parentAddress.call{ value: value }('');
    require(success, 'Flush failed');
    emit ForwarderDeposited(msg.sender, value, msg.data);
  }

  /**
    Flush ERC721 to token contracts
   */
  function flushErc721(address _tokenContractAddress, uint256 _tokenId) public {
    // TODO: maybe force this in unsafe manner or something, this requires
    // some investigation into top30 ERC721 contracts

    require(IERC721(_tokenContractAddress).ownerOf(_tokenId) == address(this), "Not owner of token");

    IERC721(_operator).safeTransferFrom(_tokenContractAddress, parentAddress, _tokenId);
  }

  function onERC721Received(address _operator, address _from, uint256 _tokenId, bytes memory _data) public virtual override returns (bytes4) {
    // TODO: I'm not super sure this works - might need to be transferFrom
    //
    // check here: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/security/ReentrancyGuard.sol
    IERC721(_operator).safeTransferFrom(_from, parentAddress, _tokenId);

    return this.onERC721Received.selector;
  }
}
