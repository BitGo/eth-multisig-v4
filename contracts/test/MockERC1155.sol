// Created with: https://wizard.openzeppelin.com/#erc1155
pragma solidity 0.7.5;

import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract MockERC1155 is ERC1155, Ownable {
  constructor() ERC1155('https://app.bitgo-test.com/') {}

  function setURI(string memory newuri) public onlyOwner {
    _setURI(newuri);
  }

  function mint(
    address account,
    uint256 id,
    uint256 amount,
    bytes memory data
  ) public onlyOwner {
    _mint(account, id, amount, data);
  }

  function mintBatch(
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public onlyOwner {
    _mintBatch(to, ids, amounts, data);
  }
}
