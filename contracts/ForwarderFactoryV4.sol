// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;
import './ForwarderV4.sol';
import './CloneFactory.sol';

/**
 * @title ForwarderFactoryV4
 * @notice This contract will deploy new forwarder contracts using the create2 opcode
 */
contract ForwarderFactoryV4 is CloneFactory {
  address public implementationAddress;

  /**
   * @notice Event triggered when a new forwarder is deployed
   * @param newForwarderAddress Address of the newly deployed forwarder
   * @param parentAddress Address to which the funds should be forwarded
   * @param feeAddress Address which is allowed to call methods on forwarder contract alongwith the parentAddress
   * @param shouldAutoFlushERC721 Whether to automatically flush ERC721 tokens or not
   * @param shouldAutoFlushERC1155 Whether to automatically flush ERC1155 tokens or not
   */
  event ForwarderCreated(
    address newForwarderAddress,
    address parentAddress,
    address feeAddress,
    bool shouldAutoFlushERC721,
    bool shouldAutoFlushERC1155
  );

  /**
   * @notice Initializes the factory with the address of the current forwarder implementation
   * @param _implementationAddress Address of the current forwarder implementation
   */
  constructor(address _implementationAddress) {
    implementationAddress = _implementationAddress;
  }

  /**
   * @notice Creates a new forwarder contract
   * @param parent Address to which the funds should be forwarded
   * @param feeAddress Address which is allowed to call methods on forwarder contract alongwith the parentAddress
   * @param salt Salt to be used while deploying the contract
   */
  function createForwarder(
    address parent,
    address feeAddress,
    bytes32 salt
  ) external {
    this.createForwarder(parent, feeAddress, salt, true, true);
  }

  /**
   * @notice Creates a new forwarder contract
   * @param parent Address to which the funds should be forwarded
   * @param feeAddress Address which is allowed to call methods on forwarder contract alongwith the parentAddress
   * @param salt Salt to be used while deploying the contract
   * @param shouldAutoFlushERC721 Whether to automatically flush ERC721 tokens or not
   * @param shouldAutoFlushERC1155 Whether to automatically flush ERC1155 tokens or not
   */
  function createForwarder(
    address parent,
    address feeAddress,
    bytes32 salt,
    bool shouldAutoFlushERC721,
    bool shouldAutoFlushERC1155
  ) external {
    /// include the parent and fee address in the salt so any contract deployed directly relies on the parent address and the fee address
    bytes32 finalSalt = keccak256(abi.encodePacked(parent, feeAddress, salt));

    address payable clone = createClone(implementationAddress, finalSalt);
    emit ForwarderCreated(
      clone,
      parent,
      feeAddress,
      shouldAutoFlushERC721,
      shouldAutoFlushERC1155
    );
    ForwarderV4(clone).init(
      parent,
      feeAddress,
      shouldAutoFlushERC721,
      shouldAutoFlushERC1155
    );
  }
}
