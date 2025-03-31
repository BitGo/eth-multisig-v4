// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import '@openzeppelin/contracts/access/Ownable2Step.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/// @notice Thrown when attempting a batch transfer with an empty recipients list
/// @dev This error indicates an invalid attempt to perform a batch transfer without any recipients
error EmptyRecipientsList();

/// @notice Thrown when the number of recipients doesn't match the number of values/amounts
/// @dev Arrays must be of equal length for batch transfers to work correctly
error UnequalRecipientsAndValues();

/// @notice Thrown when the batch size exceeds the configured limit
/// @param provided The number of recipients in the attempted batch
/// @param limit The maximum allowed number of recipients
error TooManyRecipients(uint256 provided, uint16 limit);

/// @title Batcher - Batch transfer contract for ETH and ERC20 tokens
/// @notice Allows batch transfers of ETH and ERC20 tokens to multiple recipients in a single transaction
/// @dev Implements reentrancy protection and configurable gas limits for transfers

contract Batcher is Ownable2Step, ReentrancyGuard {
  using SafeERC20 for IERC20;

  event BatchTransfer(address sender, address recipient, uint256 value);
  event TransferGasLimitChange(
    uint256 prevTransferGasLimit,
    uint256 newTransferGasLimit
  );
  event BatchTransferLimitChange(
    uint16 prevBatchTransferLimit,
    uint16 newBatchTransferLimit
  );

  uint256 public transferGasLimit;
  uint16 public batchTransferLimit;

  /// @notice Contract constructor
  /// @param _transferGasLimit Gas limit for individual transfers
  /// @param _batchTransferLimit Maximum number of transfers allowed in a batch
  /// @dev Sets initial values for transfer limits and initializes the reentrancy guard
  constructor(uint256 _transferGasLimit, uint16 _batchTransferLimit) Ownable(msg.sender) {
    transferGasLimit = _transferGasLimit;
    batchTransferLimit = _batchTransferLimit;
    emit TransferGasLimitChange(0, transferGasLimit);
    emit BatchTransferLimitChange(0, batchTransferLimit);
  }

  /// @notice Batch transfer ETH to multiple recipients
  /// @param recipients The list of recipients to send to
  /// @param values The list of values to send to recipients.
  /// @dev Total value sent must match msg.value exactly
  /// @dev Reverts if any transfer fails or if arrays are mismatched
  function batch(address[] calldata recipients, uint256[] calldata values)
    external
    payable
    nonReentrant
  {
    require(recipients.length != 0, 'Must send to at least one person');
    require(
      recipients.length == values.length,
      'Unequal recipients and values'
    );
    require(recipients.length < 256, 'Too many recipients');

    uint256 totalSent = 0;

    // Try to send all given amounts to all given recipients
    // Revert everything if any transfer fails
    for (uint8 i = 0; i < recipients.length; i++) {
      require(recipients[i] != address(0), 'Invalid recipient address');
      emit BatchTransfer(msg.sender, recipients[i], values[i]);
      (bool success, ) = recipients[i].call{
        value: values[i],
        gas: transferGasLimit
      }('');
      require(success, 'Send failed');

      totalSent += values[i];
    }

    require(totalSent == msg.value, 'Total sent out must equal total received');
  }

  /// @notice Batch transfer ERC20 tokens from sender to multiple recipients
  /// @param token Address of the ERC20 token contract
  /// @param recipients Array of recipient addresses
  /// @param amounts Array of token amounts to transfer to each recipient
  /// @dev Requires prior approval for token spending
  /// @dev Uses SafeERC20 for secure token transfers
  function batchTransferFrom(
    address token,
    address[] calldata recipients,
    uint256[] calldata amounts
  ) external nonReentrant {
    if (recipients.length == 0) revert EmptyRecipientsList();
    if (recipients.length != amounts.length) revert UnequalRecipientsAndValues();
    if (recipients.length > batchTransferLimit) revert TooManyRecipients(recipients.length, batchTransferLimit);

    IERC20 safeToken = IERC20(token);
    for (uint16 i = 0; i < recipients.length; i++) {
      safeToken.safeTransferFrom(msg.sender, recipients[i], amounts[i]);
    }
  }

  /// @notice Recover any ETH or tokens accidentally sent to the contract
  /// @param to Destination address for recovery
  /// @param value Amount of ETH to send
  /// @param data Calldata for the recovery transaction
  /// @return bytes The return data from the recovery call
  /// @dev Only callable by contract owner
  function recover(
    address to,
    uint256 value,
    bytes calldata data
  ) external onlyOwner returns (bytes memory) {
    require(to != address(0), "Cannot recover to zero address");
    (bool success, bytes memory returnData) = to.call{ value: value }(data);
    require(success, 'Recover failed');
    return returnData;
  }

  /// @notice Update the gas limit for individual transfers
  /// @param newTransferGasLimit New gas limit value
  /// @dev Minimum value of 2300 required for basic ETH transfers
  /// @dev Only callable by contract owner
  function changeTransferGasLimit(uint256 newTransferGasLimit)
    external
    onlyOwner
  {
    require(newTransferGasLimit >= 2300, 'Transfer gas limit too low');
    emit TransferGasLimitChange(transferGasLimit, newTransferGasLimit);
    transferGasLimit = newTransferGasLimit;
  }

  /// @notice Update the maximum number of transfers allowed in a batch
  /// @param newBatchTransferLimit New maximum batch size
  /// @dev Must be greater than zero
  /// @dev Only callable by contract owner
  function changeBatchTransferLimit(uint16 newBatchTransferLimit)
    external
    onlyOwner
  {
    require(newBatchTransferLimit > 0, 'Batch transfer limit too low');
    emit BatchTransferLimitChange(batchTransferLimit, newBatchTransferLimit);
    batchTransferLimit = newBatchTransferLimit;
  }
}
