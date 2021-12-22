pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/introspection/IERC165.sol';

interface IForwarder is IERC165 {
  function toggleAutoFlush721() external;

  function toggleAutoFlush1155() external;

  function flushTokens(address tokenContractAddress) external;

  function flushERC721Tokens(address tokenContractAddress, uint256 tokenId)
    external;

  function flushERC1155Tokens(address tokenContractAddress, uint256 tokenId)
    external;

  function batchFlushERC1155Tokens(
    address tokenContractAddress,
    uint256[] calldata tokenIds
  ) external;
}
