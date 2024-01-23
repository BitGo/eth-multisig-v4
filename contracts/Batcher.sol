pragma solidity 0.8.20;

// SPDX-License-Identifier: Apache-2.0

/**
 *
 * Batcher
 * =======
 *
 * Contract that can take a batch of transfers, presented in the form of a recipients array and a values array, and
 * funnel off those funds to the correct accounts in a single transaction. This is useful for saving on gas when a
 * bunch of funds need to be transferred to different accounts.
 *
 * If more ETH is sent to `batch` than it is instructed to transfer, contact the contract owner in order to recover the excess.
 * If any tokens are accidentally transferred to this account, contact the contract owner in order to recover them.
 *
 */

contract Batcher {
  event BatchTransfer(address sender, address recipient, uint256 value);
  event OwnerChange(address prevOwner, address newOwner);
  event TransferGasLimitChange(
    uint256 prevTransferGasLimit,
    uint256 newTransferGasLimit
  );

  address public owner;
  uint256 public lockCounter;
  uint256 public transferGasLimit;

  constructor() {
    lockCounter = 1;
    owner = msg.sender;
    emit OwnerChange(address(0), owner);
    transferGasLimit = 20000;
    emit TransferGasLimitChange(0, transferGasLimit);
  }

  modifier lockCall() {
    lockCounter++;
    uint256 localCounter = lockCounter;
    _;
    require(localCounter == lockCounter, 'Reentrancy attempt detected');
  }

  modifier onlyOwner() {
    require(msg.sender == owner, 'Not owner');
    _;
  }

  /**
   * Transfer funds in a batch to each of recipients
   * @param recipients The list of recipients to send to
   * @param values The list of values to send to recipients.
   *  The recipient with index i in recipients array will be sent values[i].
   *  Thus, recipients and values must be the same length
   */
  function batch(address[] calldata recipients, uint256[] calldata values)
    external
    payable
    lockCall
  {
    require(recipients.length != 0, 'Must send to at least one person');
    require(
      recipients.length == values.length,
      'Unequal recipients and values'
    );
    require(recipients.length < 256, 'Too many recipients');

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
    }
  }

  /**
   * Recovery function for the contract owner to recover any ERC20 tokens or ETH that may get lost in the control of this contract.
   * @param to The recipient to send to
   * @param value The ETH value to send with the call
   * @param data The data to send along with the call
   */
  function recover(
    address to,
    uint256 value,
    bytes calldata data
  ) external onlyOwner returns (bytes memory) {
    (bool success, bytes memory returnData) = to.call{ value: value }(data);
    require(success, 'Recover failed');
    return returnData;
  }

  /**
   * Transfers ownership of the contract ot the new owner
   * @param newOwner The address to transfer ownership of the contract to
   */
  function transferOwnership(address newOwner) external onlyOwner {
    require(newOwner != address(0), 'Invalid new owner');
    emit OwnerChange(owner, newOwner);
    owner = newOwner;
  }

  /**
   * Change the gas limit that is sent along with batched transfers.
   * This is intended to protect against any EVM level changes that would require
   * a new amount of gas for an internal send to complete.
   * @param newTransferGasLimit The new gas limit to send along with batched transfers
   */
  function changeTransferGasLimit(uint256 newTransferGasLimit)
    external
    onlyOwner
  {
    require(newTransferGasLimit >= 2300, 'Transfer gas limit too low');
    emit TransferGasLimitChange(transferGasLimit, newTransferGasLimit);
    transferGasLimit = newTransferGasLimit;
  }

  fallback() external payable {
    revert('Invalid fallback');
  }

  receive() external payable {
    revert('Invalid receive');
  }
}
