pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/introspection/IERC165.sol';

interface IForwarder is IERC165 {
  /**
   * Toggles the autoflush721 parameter.
   */
  function toggleAutoFlush721() external;

  /**
   * Toggles the autoflush1155 parameter.
   */
  function toggleAutoFlush1155() external;

  /**
   * Execute a token transfer of the full balance from the forwarder token to the parent address
   *
   * @param tokenContractAddress the address of the erc20 token contract
   */
  function flushTokens(address tokenContractAddress) external;

  /**
   * Execute a nft transfer from the forwarder to the parent address
   *
   * @param tokenContractAddress the address of the ERC721 NFT contract
   * @param tokenId The token id of the nft
   */
  function flushERC721Token(address tokenContractAddress, uint256 tokenId)
    external;

  /**
   * Execute a nft transfer from the forwarder to the parent address.
   *
   * @param tokenContractAddress the address of the ERC1155 NFT contract
   * @param tokenId The token id of the nft
   */
  function flushERC1155Tokens(address tokenContractAddress, uint256 tokenId)
    external;

  /**
   * Execute a batch nft transfer from the forwarder to the parent address.
   *
   * @param tokenContractAddress the address of the ERC1155 NFT contract
   * @param tokenIds The token ids of the nfts
   */
  function batchFlushERC1155Tokens(
    address tokenContractAddress,
    uint256[] calldata tokenIds
  ) external;
}
