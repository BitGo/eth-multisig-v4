// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// import "./MockERC1155.sol";

contract ReentryForwarder {
  bool private reentry = false;
  address private forwarder;

  function setForwarder(address _forwarder) public {
    forwarder = _forwarder;
  }

  function setReentry(bool _reentry) public {
    reentry = _reentry;
  }

  function onERC721Received(
    address _operator,
    address _from,
    uint256 _tokenId,
    bytes memory _data
  ) public returns (bytes4) {
    if (reentry) {
      (bool success, ) = forwarder.call(
        abi.encodeWithSignature(
          'onERC721Received(address,address,uint256,bytes)',
          _operator,
          _from,
          _tokenId,
          _data
        )
      );
      require(success, 'ReentryForwarder: onERC721Received failed call');
    }

    return this.onERC721Received.selector;
  }

  function onERC1155Received(
    address _operator,
    address _from,
    uint256 id,
    uint256 value,
    bytes memory data
  ) public returns (bytes4) {
    if (reentry) {
      (bool success, ) = forwarder.call(
        abi.encodeWithSignature(
          'onERC1155Received(address,address,uint256,uint256,bytes)',
          _operator,
          _from,
          id,
          value,
          data
        )
      );
      require(success, 'ReentryForwarder: onERC1155Received failed call');
    }

    return this.onERC1155Received.selector;
  }

  function onERC1155BatchReceived(
    address _operator,
    address _from,
    uint256[] memory ids,
    uint256[] memory values,
    bytes memory data
  ) public returns (bytes4) {
    if (reentry) {
      (bool success, ) = forwarder.call(
        abi.encodeWithSignature(
          'onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)',
          _operator,
          _from,
          ids,
          values,
          data
        )
      );
      require(success, 'ReentryForwarder: onERC1155BatchReceived failed call');
    }

    return this.onERC1155BatchReceived.selector;
  }

  function dataCall(
    address target,
    uint256 value,
    bytes calldata data
  ) external {
    (bool success, ) = forwarder.call(
      abi.encodeWithSignature(
        'callFromParent(address,uint256,bytes)',
        target,
        value,
        data
      )
    );
    require(success, 'dataCall execution failed');
  }

  function callFromParent(
    address target,
    uint256 value,
    bytes calldata data
  ) external {
    if (reentry) {
      (bool success, ) = forwarder.call(
        abi.encodeWithSignature(
          'callFromParent(address,uint256,bytes)',
          target,
          value,
          data
        )
      );
      require(success, 'Attack failed');
    }
  }
}
