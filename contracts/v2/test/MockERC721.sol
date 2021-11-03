pragma solidity 0.7.5;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

contract MockERC721 is ERC721 {
    constructor (string memory name_, string memory symbol_) public ERC721(name_,symbol_) {
       
    }

    function mint(address _to, uint256 _tokenId) external {
    super._safeMint(_to, _tokenId);
  }
}