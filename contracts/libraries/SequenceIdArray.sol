// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.10;

/// @notice Helper functions for the sequence id array
/// @dev sequence ids are stored tightly packed in a uint256
/// as 10 24-bit unsigned integers, i.e.
/// 0xbbbbbbaaaaaa where 0xaaaaaa is index 0 and 0xbbbbbb is index 1
library SequenceIdArray {
  function getId(uint256 sequenceIds, uint256 index) internal pure returns (uint24) {
    uint256 mask = 0xffffff << (index * 24);
    return uint24((sequenceIds & mask) >> (index * 24));
  }

  function setId(uint256 sequenceIds, uint8 index, uint24 newId) internal pure returns (uint256) {
    uint256 zeroMask = ~(0xffffff << (index * 24));
    uint256 valueMask = uint256(newId) << (index * 24);
    return (sequenceIds & zeroMask) | valueMask;
  }
}
