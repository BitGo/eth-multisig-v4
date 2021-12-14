// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.7.5;
import '@uniswap/lib/contracts/libraries/TransferHelper.sol';
import './ERC20Interface.sol';
import './ReentracyGuard.sol';
import './ERC721Interface.sol';
import './ERC721ReceiverInterface.sol';

/**
 * Contract that will forward any incoming Ether to the creator of the contract
 *
 */
contract Forwarder is ReentrancyGuard, ERC721TokenReceiver {
  // Address to which any funds sent to this contract will be forwarded
  address public parentAddress;
  bool public autoFlush721 = true;

  event ForwarderDeposited(address from, uint256 value, bytes data);

  /**
   * Initialize the contract, and sets the destination address to that of the creator
   */
  function init(address _parentAddress, bool _autoFlush721) external onlyUninitialized {
    parentAddress = _parentAddress;
    uint256 value = address(this).balance;

    // set whether we want to automatically flush erc721 tokens or not
    autoFlush721 = _autoFlush721;
    
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

  function toggleAutoFlush721() external onlyParent {
    autoFlush721 = !autoFlush721;
  }

  /**
   * ERC721 standard callback function for when a ERC721 is transfered. The forwarder will send the nft
   * to the base wallet once the nft contract invokes this method after transfering the nft.
   *
   * @param _operator The address which called `safeTransferFrom` function
   * @param _from The address of the sender
   * @param _tokenId The token id of the nft
   * @param _data Additional data with no specified format, sent in call to `_to`
   */
  function onERC721Received(address _operator, address _from, uint256 _tokenId, bytes memory _data) public virtual override nonReentrant returns (bytes4) {
    if(autoFlush721){
      ERC721 instance = ERC721(msg.sender);
      require(instance.supportsInterface(0x80ac58cd), "The caller does not support the ERC721 interface");
      // this won't work for ERC721 re-entrancy
      instance.safeTransferFrom(address(this), parentAddress, _tokenId);
    }
    return this.onERC721Received.selector;
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
   * Execute a nft transfer from the forwarder to the parent address
   * @param tokenContractAddress the address of the ERC721 NFT contract
   * @param tokenId The token id of the nft
   */
  function flushERC721Tokens(address tokenContractAddress, uint256 tokenId) external onlyParent {
    ERC721 instance = ERC721(tokenContractAddress);
    address forwarderAddress = address(this);
    address ownerAddress = instance.ownerOf(tokenId);
    address approvedAddress=instance.getApproved(tokenId);
    require(forwarderAddress == ownerAddress || forwarderAddress == approvedAddress, "Not owner or approved of the ERC721 token");

    instance.transferFrom(ownerAddress, parentAddress, tokenId);
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
}
