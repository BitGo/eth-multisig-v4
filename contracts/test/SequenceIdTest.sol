// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.10;

import '../libraries/SequenceIdArray.sol';

contract SequenceIdTest {
  using SequenceIdArray for uint256;

  uint256 public sequenceIds;

  constructor() {}

  function get(uint256 index) external view returns (uint24) {
    return sequenceIds.getId(index);
  }

  function set(uint8 index, uint24 value) external {
    sequenceIds = sequenceIds.setId(index, value);
  }
}
