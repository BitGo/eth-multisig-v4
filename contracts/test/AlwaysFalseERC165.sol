pragma solidity 0.8;

import '@openzeppelin/contracts/interfaces/IERC165.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';

contract AlwaysFalseERC165 is IERC165, IERC721Receiver {
  IERC165 private _delegateContract;

  constructor(address delegateContract) {
    _delegateContract = IERC165(delegateContract);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    virtual
    override
    view
    returns (bool)
  {
    return false;
  }

  function onERC721Received(
    address operator,
    address from,
    uint256 tokenId,
    bytes memory data
  ) external virtual override returns (bytes4) {
    require(
      _delegateContract.supportsInterface(type(IERC721Receiver).interfaceId),
      'The delegate contract does not support the ERC721Receiver interface'
    );

    IERC721Receiver receiver = IERC721Receiver(address(_delegateContract));

    return receiver.onERC721Received(operator, from, tokenId, data);
  }
}
