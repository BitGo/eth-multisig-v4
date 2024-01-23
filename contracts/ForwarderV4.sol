// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;
import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol';
import './ERC20Interface.sol';
import './TransferHelper.sol';
import './IForwarderV4.sol';

/**
 * @title ForwarderV4
 * @notice This contract will forward any incoming Ether or token to the parent address of the contract
 */
contract ForwarderV4 is IERC721Receiver, ERC1155Receiver, IForwarderV4 {
  /// @notice Any funds sent to this contract will be forwarded to this address
  address public parentAddress;
  /// @notice Address which is allowed to call methods on this contract alongwith the parentAddress
  address public feeAddress;
  bool public autoFlush721 = true;
  bool public autoFlush1155 = true;

  /**
   * @notice Event triggered when a deposit is received in the forwarder
   * @param from Address from which the deposit is received
   * @param value Amount of Ether received
   * @param data Data sent along with the deposit
   */
  event ForwarderDeposited(address from, uint256 value, bytes data);

  /**
   * @notice Modifier that will execute internal code block only if the sender is from the allowed addresses
   */
  modifier onlyAllowedAddress() {
    require(
      msg.sender == parentAddress || msg.sender == feeAddress,
      'Address is not allowed'
    );
    _;
  }

  /**
   * @notice Modifier that will execute internal code block only if the contract has not been initialized yet
   */
  modifier onlyUninitialized() {
    require(parentAddress == address(0x0), 'Already initialized');
    _;
  }

  /**
   * @notice Default function; Gets called when Ether is deposited with no data, and forwards it to the parent address
   */
  receive() external payable {
    flush();
  }

  /**
   * @notice Default function; Gets called when data is sent but does not match any other function
   */
  fallback() external payable {
    flush();
  }

  /**
   * @notice Initialize the contract, and sets the destination address to that of the parent address
   * @param _parentAddress Address to which the funds should be forwarded
   * @param _feeAddress Address which is allowed to call methods on this contract alongwith the parentAddress
   * @param _autoFlush721 Whether to automatically flush ERC721 tokens or not
   * @param _autoFlush1155 Whether to automatically flush ERC1155 tokens or not
   */
  function init(
    address _parentAddress,
    address _feeAddress,
    bool _autoFlush721,
    bool _autoFlush1155
  ) external onlyUninitialized {
    require(_parentAddress != address(0x0), 'Invalid parent address');
    parentAddress = _parentAddress;
    require(_feeAddress != address(0x0), 'Invalid fee address');
    feeAddress = _feeAddress;

    uint256 value = address(this).balance;

    /// @notice set whether we want to automatically flush erc721/erc1155 tokens or not
    autoFlush721 = _autoFlush721;
    autoFlush1155 = _autoFlush1155;

    if (value == 0) {
      return;
    }

    /**
     * Since we are forwarding on initialization,
     * we don't have the context of the original sender.
     * We still emit an event about the forwarding but set
     * the sender to the forwarder itself
     */
    emit ForwarderDeposited(address(this), value, msg.data);
    (bool success, ) = parentAddress.call{ value: value }('');
    require(success, 'Flush failed');
  }

  /**
   * @inheritdoc IForwarderV4
   */
  function setAutoFlush721(bool autoFlush)
    external
    virtual
    override
    onlyAllowedAddress
  {
    autoFlush721 = autoFlush;
  }

  /**
   * @inheritdoc IForwarderV4
   */
  function setAutoFlush1155(bool autoFlush)
    external
    virtual
    override
    onlyAllowedAddress
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
      /// this won't work for ERC721 re-entrancy
      instance.safeTransferFrom(address(this), parentAddress, _tokenId, data);
    }

    return this.onERC721Received.selector;
  }

  /**
   * @notice Method to allow for calls to other contracts. This method can only be called by the parent address
   * @param target The target contract address whose method needs to be called
   * @param value The amount of Ether to be sent
   * @param data The calldata to be sent
   */
  function callFromParent(
    address target,
    uint256 value,
    bytes calldata data
  ) external returns (bytes memory) {
    require(msg.sender == parentAddress, 'Only Parent');
    require(target != address(0), 'Invalid target address');
    (bool success, bytes memory returnedData) = target.call{ value: value }(
      data
    );
    require(success, 'Parent call execution failed');

    return returnedData;
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
   * @inheritdoc IForwarderV4
   */
  function flushTokens(address tokenContractAddress)
    external
    virtual
    override
    onlyAllowedAddress
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
   * @inheritdoc IForwarderV4
   */
  function flushERC721Token(address tokenContractAddress, uint256 tokenId)
    external
    virtual
    override
    onlyAllowedAddress
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
   * @inheritdoc IForwarderV4
   */
  function flushERC1155Tokens(address tokenContractAddress, uint256 tokenId)
    external
    virtual
    override
    onlyAllowedAddress
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
   * @inheritdoc IForwarderV4
   */
  function batchFlushERC1155Tokens(
    address tokenContractAddress,
    uint256[] calldata tokenIds
  ) external virtual override onlyAllowedAddress {
    IERC1155 instance = IERC1155(tokenContractAddress);
    require(
      instance.supportsInterface(type(IERC1155).interfaceId),
      'The caller does not support the IERC1155 interface'
    );

    address forwarderAddress = address(this);
    uint256 length = tokenIds.length;
    uint256[] memory amounts = new uint256[](tokenIds.length);
    for (uint256 i; i < length; i++) {
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
   * @inheritdoc IForwarderV4
   */
  function batchFlushERC20Tokens(address[] calldata tokenContractAddresses)
    external
    virtual
    override
    onlyAllowedAddress
  {
    address forwarderAddress = address(this);
    uint256 length = tokenContractAddresses.length;
    for (uint256 i; i < length; i++) {
      ERC20Interface instance = ERC20Interface(tokenContractAddresses[i]);
      uint256 forwarderBalance = instance.balanceOf(forwarderAddress);
      if (forwarderBalance == 0) {
        continue;
      }

      TransferHelper.safeTransfer(
        tokenContractAddresses[i],
        parentAddress,
        forwarderBalance
      );
    }
  }

  /**
   * @notice Flush the entire balance of the contract to the parent address.
   */
  function flush() public {
    uint256 value = address(this).balance;

    if (value == 0) {
      return;
    }

    emit ForwarderDeposited(msg.sender, value, msg.data);
    (bool success, ) = parentAddress.call{ value: value }('');
    require(success, 'Flush failed');
  }

  /**
   * @inheritdoc IERC165
   */
  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(ERC1155Receiver, IERC165)
    returns (bool)
  {
    return
      interfaceId == type(IForwarderV4).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
