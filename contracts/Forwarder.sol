// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.10;
import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol';
import './ERC20Interface.sol';
import './TransferHelper.sol';
import './IForwarder.sol';

/**
 * Contract that will forward any incoming Ether to the creator of the contract
 *
 */
contract Forwarder is IERC721Receiver, ERC1155Receiver, IForwarder {
  // Address to which any funds sent to this contract will be forwarded
  address public parentAddress;
  bool public autoFlush721 = true;
  bool public autoFlush1155 = true;

  event ForwarderDeposited(address from, uint256 value, bytes data);

  /**
   * Initialize the contract, and sets the destination address to that of the creator
   */
  function init(
    address _parentAddress,
    bool _autoFlush721,
    bool _autoFlush1155
  ) external onlyUninitialized {
    parentAddress = _parentAddress;
    uint256 value = address(this).balance;

    // set whether we want to automatically flush erc721/erc1155 tokens or not
    autoFlush721 = _autoFlush721;
    autoFlush1155 = _autoFlush1155;

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
   * @inheritdoc IForwarder
   */
  function setAutoFlush721(bool autoFlush)
    external
    virtual
    override
    onlyParent
  {
    autoFlush721 = autoFlush;
  }

  /**
   * @inheritdoc IForwarder
   */
  function setAutoFlush1155(bool autoFlush)
    external
    virtual
    override
    onlyParent
  {
    autoFlush1155 = autoFlush;
  }

  /**
   * ERC721 standard callback function for when a ERC721 is transfered. The forwarder will send the nft
   * to the base wallet once the nft contract invokes this method after transfering the nft.
   *
   * @param _operator The address which called `safeTransferFrom` function
   * @param _from The address of the sender
   * @param _tokenId The token id of the nft
   * @param data Additional data with no specified format, sent in call to `_to`
   */
  function onERC721Received(
    address _operator,
    address _from,
    uint256 _tokenId,
    bytes memory data
  ) external virtual override returns (bytes4) {
    if (autoFlush721) {
      IERC721 instance = IERC721(msg.sender);
      require(
        instance.supportsInterface(type(IERC721).interfaceId),
        'The caller does not support the ERC721 interface'
      );
      // this won't work for ERC721 re-entrancy
      instance.safeTransferFrom(address(this), parentAddress, _tokenId, data);
    }

    return this.onERC721Received.selector;
  }

  function callFromParent(
    address target,
    uint256 value,
    bytes calldata data
  ) external onlyParent returns (bytes calldata) {
    (bool success, ) = target.call{ value: value }(data);
    require(success, 'Parent call execution failed');

    return data;
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
    IERC1155 instance = IERC1155(msg.sender);
    require(
      instance.supportsInterface(type(IERC1155).interfaceId),
      'The caller does not support the IERC1155 interface'
    );

    if (autoFlush1155) {
      instance.safeTransferFrom(address(this), parentAddress, id, value, data);
    }

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
    IERC1155 instance = IERC1155(msg.sender);
    require(
      instance.supportsInterface(type(IERC1155).interfaceId),
      'The caller does not support the IERC1155 interface'
    );

    if (autoFlush1155) {
      instance.safeBatchTransferFrom(
        address(this),
        parentAddress,
        ids,
        values,
        data
      );
    }

    return this.onERC1155BatchReceived.selector;
  }

  /**
   * @inheritdoc IForwarder
   */
  function flushTokens(address tokenContractAddress)
    external
    virtual
    override
    onlyParent
  {
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
   * @inheritdoc IForwarder
   */
  function flushERC721Token(address tokenContractAddress, uint256 tokenId)
    external
    virtual
    override
    onlyParent
  {
    IERC721 instance = IERC721(tokenContractAddress);
    require(
      instance.supportsInterface(type(IERC721).interfaceId),
      'The tokenContractAddress does not support the ERC721 interface'
    );

    address ownerAddress = instance.ownerOf(tokenId);
    instance.transferFrom(ownerAddress, parentAddress, tokenId);
  }

  /**
   * @inheritdoc IForwarder
   */
  function flushERC1155Tokens(address tokenContractAddress, uint256 tokenId)
    external
    virtual
    override
    onlyParent
  {
    IERC1155 instance = IERC1155(tokenContractAddress);
    require(
      instance.supportsInterface(type(IERC1155).interfaceId),
      'The caller does not support the IERC1155 interface'
    );

    address forwarderAddress = address(this);
    uint256 forwarderBalance = instance.balanceOf(forwarderAddress, tokenId);

    instance.safeTransferFrom(
      forwarderAddress,
      parentAddress,
      tokenId,
      forwarderBalance,
      ''
    );
  }

  /**
   * @inheritdoc IForwarder
   */
  function batchFlushERC1155Tokens(
    address tokenContractAddress,
    uint256[] calldata tokenIds
  ) external virtual override onlyParent {
    IERC1155 instance = IERC1155(tokenContractAddress);
    require(
      instance.supportsInterface(type(IERC1155).interfaceId),
      'The caller does not support the IERC1155 interface'
    );

    address forwarderAddress = address(this);
    uint256[] memory amounts = new uint256[](tokenIds.length);
    for (uint256 i = 0; i < tokenIds.length; i++) {
      amounts[i] = instance.balanceOf(forwarderAddress, tokenIds[i]);
    }

    instance.safeBatchTransferFrom(
      forwarderAddress,
      parentAddress,
      tokenIds,
      amounts,
      ''
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
   * @inheritdoc IERC165
   */
  function supportsInterface(bytes4 interfaceId)
    public
    virtual
    override(ERC1155Receiver, IERC165)
    view
    returns (bool)
  {
    return
      interfaceId == type(IForwarder).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
