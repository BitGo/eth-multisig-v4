const should = require('should');

const truffleAssert = require('truffle-assertions');
const helpers = require('./helpers');
const BigNumber = require('bignumber.js');

const Forwarder = artifacts.require('./Forwarder.sol');
const ERC721 = artifacts.require('./MockERC721');

const createForwarder = async (creator, parent) => {
  const forwarderContract = await Forwarder.new([], { from: creator });
  await forwarderContract.init(parent, true);
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
    const tx = await forwarder.init(baseAddress, true);
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

  describe('NFT Support', function () {
    let token721;
    let tokenId = 0;
    let baseAddress;
    before(async function () {
      const name = 'Non Fungible Token';
      const symbol = 'NFT';
      token721 = await ERC721.new(name, symbol);
      baseAddress = accounts[0];
      autoFlushForwarder = await createForwarder(baseAddress, baseAddress);
      noAutoFlushForwarder = await Forwarder.new([], { from: accounts[1] });
      await noAutoFlushForwarder.init(baseAddress, false);
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
  });
});
