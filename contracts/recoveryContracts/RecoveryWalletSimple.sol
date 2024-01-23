// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;
import '../IForwarder.sol';

/** ERC721, ERC1155 imports */
import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol';

/**
 *
 * RecoveryWallet
 * ============
 *
 * Basic singleSig wallet designed to recover funds.
 *
 */
contract RecoveryWalletSimple is IERC721Receiver, ERC1155Receiver {
  // Public fields
  address public signer;
  bool public initialized = false; // True if the contract has been initialized

  function init(address _signer) external onlyUninitialized {
    require(_signer != address(0), 'Invalid signer address');
    signer = _signer;
    initialized = true;
  }

  /**
   * Modifier that will execute internal code block only if the sender is an authorized signer on this wallet
   */
  modifier onlySigner() {
    require(signer == msg.sender, 'Non-signer in onlySigner method');
    _;
  }

  /**
   * Modifier that will execute internal code block only if the contract has not been initialized yet
   */
  modifier onlyUninitialized() {
    require(!initialized, 'Contract already initialized');
    _;
  }

  /**
   * Gets called when a transaction is received with data that does not match any other method
   */
  fallback() external payable {}

  /**
   * Gets called when a transaction is received with ether and no data
   */
  receive() external payable {}

  /**
   * Execute a transaction from this wallet using the signer.
   *
   * @param toAddress the destination address to send an outgoing transaction
   * @param value the amount in Wei to be sent
   * @param data the data to send to the toAddress when invoking the transaction
   */
  function sendFunds(
    address toAddress,
    uint256 value,
    bytes calldata data
  ) external onlySigner {
    require(toAddress != address(0), 'Invalid destination address');
    // Success, send the transaction
    (bool success, ) = toAddress.call{ value: value }(data);
    require(success, 'Call execution failed');
  }

  /**
   * Execute a token flush from one of the forwarder addresses. This transfer can be done by any external address
   *
   * @param forwarderAddress the address of the forwarder address to flush the tokens from
   * @param tokenContractAddress the address of the erc20 token contract
   */
  function flushForwarderTokens(
    address payable forwarderAddress,
    address tokenContractAddress
  ) external {
    IForwarder forwarder = IForwarder(forwarderAddress);
    forwarder.flushTokens(tokenContractAddress);
  }

  /**
   * Execute a ERC721 token flush from one of the forwarder addresses. This transfer can be done by any external address
   *
   * @param forwarderAddress the address of the forwarder address to flush the tokens from
   * @param tokenContractAddress the address of the erc20 token contract
   */
  function flushERC721ForwarderTokens(
    address payable forwarderAddress,
    address tokenContractAddress,
    uint256 tokenId
  ) external {
    IForwarder forwarder = IForwarder(forwarderAddress);
    forwarder.flushERC721Token(tokenContractAddress, tokenId);
  }

  /**
   * Execute a ERC1155 batch token flush from one of the forwarder addresses.
   * This transfer can be done by any external address.
   *
   * @param forwarderAddress the address of the forwarder address to flush the tokens from
   * @param tokenContractAddress the address of the erc1155 token contract
   */
  function batchFlushERC1155ForwarderTokens(
    address payable forwarderAddress,
    address tokenContractAddress,
    uint256[] calldata tokenIds
  ) external {
    IForwarder forwarder = IForwarder(forwarderAddress);
    forwarder.batchFlushERC1155Tokens(tokenContractAddress, tokenIds);
  }

  /**
   * Execute a ERC1155 token flush from one of the forwarder addresses.
   * This transfer can be done by any external address.
   *
   * @param forwarderAddress the address of the forwarder address to flush the tokens from
   * @param tokenContractAddress the address of the erc1155 token contract
   * @param tokenId the token id associated with the ERC1155
   */
  function flushERC1155ForwarderTokens(
    address payable forwarderAddress,
    address tokenContractAddress,
    uint256 tokenId
  ) external {
    IForwarder forwarder = IForwarder(forwarderAddress);
    forwarder.flushERC1155Tokens(tokenContractAddress, tokenId);
  }

  /**
   * Sets the autoflush 721 parameter on the forwarder.
   *
   * @param forwarderAddress the address of the forwarder to toggle.
   * @param autoFlush whether to autoflush erc721 tokens
   */
  function setAutoFlush721(address forwarderAddress, bool autoFlush)
    external
    onlySigner
  {
    IForwarder forwarder = IForwarder(forwarderAddress);
    forwarder.setAutoFlush721(autoFlush);
  }

  /**
   * Sets the autoflush 721 parameter on the forwarder.
   *
   * @param forwarderAddress the address of the forwarder to toggle.
   * @param autoFlush whether to autoflush erc1155 tokens
   */
  function setAutoFlush1155(address forwarderAddress, bool autoFlush)
    external
    onlySigner
  {
    IForwarder forwarder = IForwarder(forwarderAddress);
    forwarder.setAutoFlush1155(autoFlush);
  }

  /**
   * ERC721 standard callback function for when a ERC721 is transfered.
   *
   * @param _operator The address of the nft contract
   * @param _from The address of the sender
   * @param _tokenId The token id of the nft
   * @param _data Additional data with no specified format, sent in call to `_to`
   */
  function onERC721Received(
    address _operator,
    address _from,
    uint256 _tokenId,
    bytes memory _data
  ) external virtual override returns (bytes4) {
    return this.onERC721Received.selector;
  }

  /**
   * @inheritdoc IERC1155Receiver
   */
  function onERC1155Received(
    address _operator,
    address _from,
    uint256 id,
    uint256 value,
    bytes calldata data
  ) external virtual override returns (bytes4) {
    return this.onERC1155Received.selector;
  }

  /**
   * @inheritdoc IERC1155Receiver
   */
  function onERC1155BatchReceived(
    address _operator,
    address _from,
    uint256[] calldata ids,
    uint256[] calldata values,
    bytes calldata data
  ) external virtual override returns (bytes4) {
    return this.onERC1155BatchReceived.selector;
  }
}
