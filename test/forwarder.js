const should = require('should');

const truffleAssert = require('truffle-assertions');
const helpers = require('./helpers');
const BigNumber = require('bignumber.js');
const { makeInterfaceId } = require('@openzeppelin/test-helpers');

const Forwarder = artifacts.require('./Forwarder.sol');
const ERC721 = artifacts.require('./MockERC721');
const ERC1155 = artifacts.require('./MockERC1155');
const AlwaysFalseERC165 = artifacts.require('./AlwaysFalseERC165.sol');

const createForwarder = async (creator, parent) => {
  const forwarderContract = await Forwarder.new([], { from: creator });
  await forwarderContract.init(parent, true, true);
  return forwarderContract;
};

const getBalanceInWei = async (address) => {
  return new BigNumber(await web3.eth.getBalance(address));
};

const assertVMException = (err, expectedErrMsg) => {
  err.message.toString().should.containEql('VM Exception');
  if (expectedErrMsg) {
    err.message.toString().should.containEql(expectedErrMsg);
  }
};

const FORWARDER_DEPOSITED_EVENT = 'ForwarderDeposited';

contract('Forwarder', function (accounts) {
  it('Basic forwarding test', async function () {
    const forwarder = await createForwarder(accounts[0], accounts[0]);
    const startBalance = await getBalanceInWei(accounts[0]);
    const amount = web3.utils.toWei('2', 'ether');

    const tx = await web3.eth.sendTransaction({
      from: accounts[1],
      to: forwarder.address,
      value: amount
    });

    const endBalance = await getBalanceInWei(accounts[0]);
    startBalance.plus(amount).eq(endBalance).should.be.true();
    const forwardedEvent = await helpers.getEventFromTransaction(
      tx.transactionHash,
      FORWARDER_DEPOSITED_EVENT
    );

    should.exist(forwardedEvent);
    forwardedEvent.from.should.equal(accounts[1]);
    forwardedEvent.value.should.equal(amount);
  });

  it('Flush on initialization', async function () {
    // determine the forwarder contract address
    const amount = web3.utils.toWei('5', 'ether');
    const baseAddress = accounts[3];
    const senderAddress = accounts[0];
    const forwarderAddress = await helpers.getNextContractAddress(
      senderAddress
    );

    const startBalance = await getBalanceInWei(baseAddress);

    // send funds to the contract address first
    await web3.eth.sendTransaction({
      from: accounts[2],
      to: forwarderAddress,
      value: amount
    });

    // Check that the ether is in the forwarder address and not yet in the base address
    (await getBalanceInWei(forwarderAddress)).eq(amount).should.be.true();
    (await getBalanceInWei(baseAddress)).eq(startBalance).should.be.true();

    const forwarder = await Forwarder.new([], { from: senderAddress });
    const tx = await forwarder.init(baseAddress, true, true);
    forwarder.address.should.eql(forwarderAddress);

    // Check that the ether was automatically flushed to the base address
    (await getBalanceInWei(forwarderAddress)).eq(0).should.be.true();
    (await getBalanceInWei(baseAddress))
      .eq(startBalance.plus(amount))
      .should.be.true();

    const forwardedEvent = await helpers.getEventFromTransaction(
      tx.receipt.transactionHash,
      FORWARDER_DEPOSITED_EVENT
    );

    should.exist(forwardedEvent);
    forwardedEvent.from.should.equal(forwarderAddress);
    forwardedEvent.value.should.equal(amount);
  });

  it('Should forward with data passed', async function () {
    const forwarder = await createForwarder(accounts[0], accounts[0]);
    const startBalance = await getBalanceInWei(accounts[0]);
    const amount = web3.utils.toWei('2', 'ether');

    await web3.eth.sendTransaction({
      from: accounts[1],
      to: forwarder.address,
      value: amount,
      data: '0x1234abcd'
    });

    const endBalance = await getBalanceInWei(accounts[0]);
    startBalance.plus(amount).eq(endBalance).should.be.true();
  });

  it('Should not init twice', async function () {
    const baseAddress = accounts[3];
    const forwarder = await createForwarder(baseAddress, baseAddress);

    await truffleAssert.reverts(
      forwarder.init(baseAddress, true, { from: baseAddress })
    );
  });

  it('should toggle autoFlush721 when calling toggleAutoFlush721', async () => {
    const baseAddress = accounts[3];
    const forwarder = await createForwarder(baseAddress, baseAddress);

    const initialState = await forwarder.autoFlush721();
    await forwarder.toggleAutoFlush721({ from: baseAddress });

    const newState = await forwarder.autoFlush721();
    initialState.should.equal(!newState);
  });

  it('should fail to toggle autoFlush721 if caller is not parent', async () => {
    const baseAddress = accounts[3];
    const forwarder = await createForwarder(baseAddress, baseAddress);

    await truffleAssert.reverts(
      forwarder.toggleAutoFlush721({ from: accounts[4] })
    );
  });

  it('should toggle autoFlush1155 when calling toggleAutoFlush1155', async () => {
    const baseAddress = accounts[3];
    const forwarder = await createForwarder(baseAddress, baseAddress);

    const initialState = await forwarder.autoFlush1155();
    await forwarder.toggleAutoFlush1155({ from: baseAddress });

    const newState = await forwarder.autoFlush1155();
    initialState.should.equal(!newState);
  });

  it('should fail to toggle autoFlush1155 if caller is not parent', async () => {
    const baseAddress = accounts[3];
    const forwarder = await createForwarder(baseAddress, baseAddress);

    await truffleAssert.reverts(
      forwarder.toggleAutoFlush1155({ from: accounts[4] })
    );
  });

  describe('NFT Support', function () {
    let token721;
    let tokenId = 0;
    let baseAddress;
    let autoFlushForwarder;
    let noAutoFlushForwarder;

    before(async function () {
      const name = 'Non Fungible Token';
      const symbol = 'NFT';
      token721 = await ERC721.new(name, symbol);
      baseAddress = accounts[0];
      autoFlushForwarder = await createForwarder(baseAddress, baseAddress);
      noAutoFlushForwarder = await Forwarder.new([], { from: accounts[1] });
      await noAutoFlushForwarder.init(baseAddress, false, false);
    });

    it('Should support NFT safeTransferFrom function', async function () {
      const operator = accounts[0];
      const from = accounts[1];
      tokenId = tokenId + 1;
      const data = 0x00;
      const methodId = await noAutoFlushForwarder.onERC721Received.call(
        operator,
        from,
        tokenId,
        data
      );
      methodId.should.eql('0x150b7a02');
    });

    it('should revert if msg.sender in onERC721Received does not support ERC721', async function () {
      const operator = accounts[0];
      const from = accounts[1];
      const tokenId = 123;

      const alwaysFalseERC165 = await AlwaysFalseERC165.new(
        autoFlushForwarder.address
      );

      await truffleAssert.reverts(
        alwaysFalseERC165.onERC721Received(operator, from, tokenId, [], {
          from: operator
        })
      );
    });

    it('Should receive with safeTransferFrom function with auto flush', async function () {
      tokenId = tokenId + 1;
      const owner = accounts[5];
      await token721.mint(owner, tokenId);
      await token721.safeTransferFrom(
        owner,
        autoFlushForwarder.address,
        tokenId,
        { from: owner }
      );
      expect(await token721.ownerOf(tokenId)).to.be.equal(baseAddress);
    });

    it('Should receive with transferFrom function with auto flush', async function () {
      tokenId = tokenId + 1;
      const owner = accounts[5];
      await token721.mint(owner, tokenId);
      await token721.transferFrom(owner, autoFlushForwarder.address, tokenId, {
        from: owner
      });
      expect(await token721.ownerOf(tokenId)).to.be.equal(autoFlushForwarder.address);
    });

    it('Should receive with safeTransferFrom function with no auto flush', async function () {
      tokenId = tokenId + 1;
      const owner = accounts[4];
      await token721.mint(owner, tokenId);
      await token721.safeTransferFrom(
        owner,
        noAutoFlushForwarder.address,
        tokenId,
        { from: owner }
      );
      expect(await token721.ownerOf(tokenId)).to.be.equal(
        noAutoFlushForwarder.address
      );
    });

    it('Should receive with transferFrom function with no auto flush', async function () {
      tokenId = tokenId + 1;
      const owner = accounts[4];
      await token721.mint(owner, tokenId);
      await token721.transferFrom(
        owner,
        noAutoFlushForwarder.address,
        tokenId,
        { from: owner }
      );
      expect(await token721.ownerOf(tokenId)).to.be.equal(
        noAutoFlushForwarder.address
      );
    });

    it('Should be to able to flush ERC721 tokens when forwarder is owner', async function () {
      tokenId = tokenId + 1;
      const owner = accounts[4];
      await token721.mint(owner, tokenId);
      await token721.safeTransferFrom(
        owner,
        noAutoFlushForwarder.address,
        tokenId,
        { from: owner }
      );
      expect(await token721.ownerOf(tokenId)).to.be.equal(
        noAutoFlushForwarder.address
      );

      await noAutoFlushForwarder.flushERC721Tokens(token721.address, tokenId, {from: baseAddress});
      expect(await token721.ownerOf(tokenId)).to.be.equal(baseAddress);
    });

    it('Should be to able to flush ERC721 tokens when forwarder is approved', async function () {
      tokenId = tokenId + 1;
      const owner = accounts[5];
      await token721.mint(owner, tokenId);
      await token721.approve(autoFlushForwarder.address, tokenId, {
        from: owner
      });
      expect(await token721.getApproved(tokenId)).to.be.equal(
        autoFlushForwarder.address
      );

      await autoFlushForwarder.flushERC721Tokens(token721.address, tokenId, {from: baseAddress});
      expect(await token721.ownerOf(tokenId)).to.be.equal(baseAddress);
    });

    it('Should fail to flush ERC721 tokens when forwarder is not owner or approved', async function () {
      tokenId = tokenId + 1;
      const owner = accounts[4];
      await token721.mint(owner, tokenId);

      try {
        await autoFlushForwarder.flushERC721Tokens(token721.address, tokenId, {from: baseAddress});
      } catch (err) {
        assertVMException(err);
      }
    });

    describe('ERC1155', () => {
      let owner;
      let token1155;

      beforeEach(async function () {
        owner = baseAddress;
        token1155 = await ERC1155.new({ from: owner });
      });

      const mint = async (to, tokenId, amount) => {
        await token1155.mint(to, tokenId, amount, [], { from: owner });
      };

      const transferERC1155 = async (from, to, tokenId, amount) => {
        await token1155.safeTransferFrom(from, to, tokenId, amount, [], {
          from
        });
      };

      const transferBatchERC1155 = async (from, to, tokenIds, amounts) => {
        await token1155.safeBatchTransferFrom(from, to, tokenIds, amounts, [], {
          from
        });
      };

      const assertBalances = async (tokenId, accounts, balances) => {
        accounts.length.should.equal(balances.length);
        for (let i = 0; i < accounts.length; i++) {
          const balance = await token1155.balanceOf(accounts[i], tokenId);
          balance.toNumber().should.equal(balances[i]);
        }
      };

      describe('Flush', () => {
        it('should flush erc1155 tokens back to parent address when caller is parent', async () => {
          const erc1155TokenId = 1;
          const amount = 10;
          await mint(noAutoFlushForwarder.address, erc1155TokenId, amount);

          const forwarderBalancePreFlush = await token1155.balanceOf(
            noAutoFlushForwarder.address,
            erc1155TokenId
          );
          forwarderBalancePreFlush.toNumber().should.equal(amount);

          await noAutoFlushForwarder.flushERC1155Tokens(
            token1155.address,
            erc1155TokenId,
            { from: owner }
          );

          const forwarderBalancePostFlush = await token1155.balanceOf(
            noAutoFlushForwarder.address,
            erc1155TokenId
          );
          forwarderBalancePostFlush.toNumber().should.equal(0);
        });

        it('should fail to flush erc1155 tokens when caller is not parent', async () => {
          const owner = baseAddress;
          const token1155 = await ERC1155.new({ from: owner });

          const erc1155TokenId = 1;
          await truffleAssert.reverts(
            noAutoFlushForwarder.flushERC1155Tokens(
              token1155.address,
              erc1155TokenId,
              { from: accounts[2] }
            )
          );
        });

        it('should batch flush erc1155 tokens back to parent address when caller is parent', async () => {
          const erc1155TokenIds = [1, 2, 3];
          const amounts = [10, 20, 30];

          for (let i = 0; i < erc1155TokenIds.length; i++) {
            await mint(
              noAutoFlushForwarder.address,
              erc1155TokenIds[i],
              amounts[i]
            );
          }

          for (let i = 0; i < erc1155TokenIds.length; i++) {
            await assertBalances(
              erc1155TokenIds[i],
              [noAutoFlushForwarder.address],
              [amounts[i]]
            );
          }

          await noAutoFlushForwarder.batchFlushERC1155Tokens(
            token1155.address,
            erc1155TokenIds,
            { from: owner }
          );

          for (let i = 0; i < erc1155TokenIds.length; i++) {
            await assertBalances(
              erc1155TokenIds[i],
              [owner, noAutoFlushForwarder.address],
              [amounts[i], 0]
            );
          }
        });

        it('should fail to batch flush erc1155 tokens when caller is not parent', async () => {
          const owner = baseAddress;
          const token1155 = await ERC1155.new({ from: owner });

          await truffleAssert.reverts(
            noAutoFlushForwarder.batchFlushERC1155Tokens(
              token1155.address,
              [],
              {
                from: accounts[2]
              }
            )
          );
        });
      });

      describe('ERC1155Receiver', () => {
        it('should receive erc1155 tokens with autoflush off', async function () {
          const erc1155TokenId = 1;

          const sender = accounts[1];
          await mint(sender, erc1155TokenId, 100);

          await transferERC1155(
            sender,
            noAutoFlushForwarder.address,
            erc1155TokenId,
            10
          );

          await assertBalances(
            erc1155TokenId,
            [owner, sender, noAutoFlushForwarder.address],
            [0, 90, 10]
          );
        });

        it('should receive erc1155 tokens with autoflush on', async function () {
          const erc1155TokenId = 1;

          const sender = accounts[1];
          await mint(sender, erc1155TokenId, 100);

          await transferERC1155(
            sender,
            autoFlushForwarder.address,
            erc1155TokenId,
            10
          );

          await assertBalances(
            erc1155TokenId,
            [owner, sender, autoFlushForwarder.address],
            [10, 90, 0]
          );
        });

        it('should receive batch erc1155 tokens with autoflush off', async function () {
          const erc1155TokenId1 = 1;
          const erc1155TokenId2 = 2;

          const sender = accounts[1];
          await mint(sender, erc1155TokenId1, 100);
          await mint(sender, erc1155TokenId2, 50);

          await transferBatchERC1155(
            sender,
            noAutoFlushForwarder.address,
            [erc1155TokenId1, erc1155TokenId2],
            [10, 20]
          );

          await assertBalances(
            erc1155TokenId1,
            [owner, sender, noAutoFlushForwarder.address],
            [0, 90, 10]
          );

          await assertBalances(
            erc1155TokenId2,
            [owner, sender, noAutoFlushForwarder.address],
            [0, 30, 20]
          );
        });

        it('should receive batch erc1155 tokens with autoflush on', async function () {
          const erc1155TokenId1 = 1;
          const erc1155TokenId2 = 2;

          const sender = accounts[1];
          await mint(sender, erc1155TokenId1, 100);
          await mint(sender, erc1155TokenId2, 50);

          await transferBatchERC1155(
            sender,
            autoFlushForwarder.address,
            [erc1155TokenId1, erc1155TokenId2],
            [10, 20]
          );

          await assertBalances(
            erc1155TokenId1,
            [owner, sender, autoFlushForwarder.address],
            [10, 90, 0]
          );

          await assertBalances(
            erc1155TokenId2,
            [owner, sender, autoFlushForwarder.address],
            [20, 30, 0]
          );
        });

        it('should revert if msg.sender does not support IERC1155', async () => {
          await truffleAssert.reverts(
            noAutoFlushForwarder.onERC1155Received(
              accounts[0],
              accounts[1],
              0,
              0,
              [],
              {
                from: accounts[0]
              }
            )
          );

          await truffleAssert.reverts(
            noAutoFlushForwarder.onERC1155BatchReceived(
              accounts[0],
              accounts[1],
              [],
              [],
              [],
              {
                from: accounts[0]
              }
            )
          );
        });
      });
    });
  });

  describe('ERC165', function () {
    const INTERFACE_IDS = {
      IERC1155Receiver: makeInterfaceId.ERC165([
        'onERC1155Received(address,address,uint256,uint256,bytes)',
        'onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)'
      ])
    };

    Object.entries(INTERFACE_IDS).map(([eipInterface, interfaceId]) => {
      it(`should support ${eipInterface}`, async function () {
        const baseAddress = accounts[3];
        const forwarder = await createForwarder(baseAddress, baseAddress);

        const supportsInterface = await forwarder.supportsInterface(
          interfaceId
        );
        supportsInterface.should.equal(true);
      });
    });
  });
});
