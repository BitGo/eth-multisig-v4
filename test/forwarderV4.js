const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('ForwarderV4', function () {
  // Define contract factories and signers
  let ForwarderV4, WalletSimple, ERC721, ERC1155, ReentryWalletSimple, Tether;
  let deployer, owner, parent, feeAddress, user1, user2, user3, user4, user5;

  // Helper to create a new forwarder
  const createForwarder = async (
    creator,
    parentSigner,
    feeSigner,
    flush721 = true,
    flush1155 = true
  ) => {
    const forwarder = await ForwarderV4.connect(creator).deploy([]);
    await forwarder.waitForDeployment();
    await forwarder
      .connect(creator)
      .init(parentSigner.address, feeSigner.address, flush721, flush1155);
    return forwarder;
  };

  before(async () => {
    // Get signers
    [deployer, owner, parent, feeAddress, user1, user2, user3, user4, user5] =
      await ethers.getSigners();

    // Get contract factories
    ForwarderV4 = await ethers.getContractFactory('ForwarderV4');
    WalletSimple = await ethers.getContractFactory('WalletSimple');
    ERC721 = await ethers.getContractFactory('MockERC721');
    ERC1155 = await ethers.getContractFactory('MockERC1155');
    ReentryWalletSimple = await ethers.getContractFactory(
      'ReentryWalletSimple'
    );
    Tether = await ethers.getContractFactory('TetherToken');
  });

  describe('Core Functionality', () => {
    let forwarder;

    beforeEach(async () => {
      forwarder = await createForwarder(owner, parent, feeAddress);
    });

    it('Basic forwarding test', async function () {
      const amount = ethers.parseEther('2');
      await expect(
        user1.sendTransaction({
          to: await forwarder.getAddress(),
          value: amount
        })
      ).to.changeEtherBalances([parent, user1], [amount, -amount]);
    });

    it('Should forward with data passed', async function () {
      const amount = ethers.parseEther('2');
      await expect(
        user1.sendTransaction({
          to: await forwarder.getAddress(),
          value: amount,
          data: '0x1234abcd'
        })
      ).to.changeEtherBalances([parent, user1], [amount, -amount]);
    });

    it('Should not init twice', async function () {
      await expect(
        forwarder
          .connect(owner)
          .init(parent.address, feeAddress.address, true, true)
      ).to.be.revertedWith('Already initialized');
    });

    it('Should not init if parent address is invalid', async function () {
      const f = await ForwarderV4.deploy([]);
      await f.waitForDeployment();
      await expect(
        f.init(ethers.ZeroAddress, feeAddress.address, true, true)
      ).to.be.revertedWith('Invalid parent address');
    });

    it('Should not init if fee address is invalid', async function () {
      const f = await ForwarderV4.deploy([]);
      await f.waitForDeployment();
      await expect(
        f.init(parent.address, ethers.ZeroAddress, true, true)
      ).to.be.revertedWith('Invalid fee address');
    });

    it('should change autoFlush settings when called by an allowed address', async () => {
      await forwarder.connect(parent).setAutoFlush721(false);
      expect(await forwarder.autoFlush721()).to.be.false;

      await forwarder.connect(feeAddress).setAutoFlush1155(false);
      expect(await forwarder.autoFlush1155()).to.be.false;
    });

    it('should fail to change autoFlush settings if caller is not an allowed address', async () => {
      await expect(
        forwarder.connect(user1).setAutoFlush721(false)
      ).to.be.revertedWith('Address is not allowed');
      await expect(
        forwarder.connect(user1).setAutoFlush1155(false)
      ).to.be.revertedWith('Address is not allowed');
    });

    it('should batch flush ERC20 tokens when called by an allowed address', async () => {
      const tether = await Tether.deploy('1000000', 'USDT', 'USDT', 6);
      await tether.waitForDeployment();
      const forwarderAddress = await forwarder.getAddress();
      const tetherAddress = await tether.getAddress();

      // Transfer tokens to forwarder
      await tether.connect(deployer).transfer(forwarderAddress, 100);

      // Get initial balances (use call to avoid transaction response)
      const initialParentBalance = await ethers.provider.call({
        to: tetherAddress,
        data: tether.interface.encodeFunctionData('balanceOf', [parent.address])
      });
      const initialForwarderBalance = await ethers.provider.call({
        to: tetherAddress,
        data: tether.interface.encodeFunctionData('balanceOf', [
          forwarderAddress
        ])
      });

      // Execute batch flush
      await forwarder
        .connect(feeAddress)
        .batchFlushERC20Tokens([tetherAddress]);

      // Get final balances
      const finalParentBalance = await ethers.provider.call({
        to: tetherAddress,
        data: tether.interface.encodeFunctionData('balanceOf', [parent.address])
      });
      const finalForwarderBalance = await ethers.provider.call({
        to: tetherAddress,
        data: tether.interface.encodeFunctionData('balanceOf', [
          forwarderAddress
        ])
      });

      // Decode balances
      const initialParent = BigInt(initialParentBalance);
      const initialForwarder = BigInt(initialForwarderBalance);
      const finalParent = BigInt(finalParentBalance);
      const finalForwarder = BigInt(finalForwarderBalance);

      // Verify the transfer happened
      expect(finalParent - initialParent).to.equal(100);
      expect(initialForwarder - finalForwarder).to.equal(100);
      expect(finalForwarder).to.equal(0);
    });
  });

  describe('NFT Support', function () {
    let token721, token1155, autoFlushForwarder, noAutoFlushForwarder;
    let tokenIdCounter = 0;

    beforeEach(async () => {
      token721 = await ERC721.deploy('Non Fungible Token', 'NFT');
      await token721.waitForDeployment();
      token1155 = await ERC1155.deploy();
      await token1155.waitForDeployment();

      autoFlushForwarder = await createForwarder(owner, parent, feeAddress);

      const NoFlushForwarderImpl = await ForwarderV4.deploy([]);
      await NoFlushForwarderImpl.waitForDeployment();
      await NoFlushForwarderImpl.init(
        parent.address,
        feeAddress.address,
        false,
        false
      );
      noAutoFlushForwarder = NoFlushForwarderImpl;
    });

    it('Should receive ERC721 with auto flush', async function () {
      const tokenId = ++tokenIdCounter;
      await token721.mint(user1.address, tokenId);
      await token721
        .connect(user1)
        .safeTransferFrom(
          user1.address,
          await autoFlushForwarder.getAddress(),
          tokenId
        );
      expect(await token721.ownerOf(tokenId)).to.equal(parent.address);
    });

    it('Should receive ERC721 without auto flush', async function () {
      const tokenId = ++tokenIdCounter;
      await token721.mint(user1.address, tokenId);
      const forwarderAddress = await noAutoFlushForwarder.getAddress();
      await token721
        .connect(user1)
        .safeTransferFrom(user1.address, forwarderAddress, tokenId);
      expect(await token721.ownerOf(tokenId)).to.equal(forwarderAddress);
    });

    it('Should receive ERC1155 with auto flush', async function () {
      const tokenId = 1;
      const amount = 100;
      await token1155.mint(user1.address, tokenId, amount, '0x');
      await token1155
        .connect(user1)
        .safeTransferFrom(
          user1.address,
          await autoFlushForwarder.getAddress(),
          tokenId,
          amount,
          '0x'
        );

      expect(await token1155.balanceOf(parent.address, tokenId)).to.equal(
        amount
      );
      expect(
        await token1155.balanceOf(
          await autoFlushForwarder.getAddress(),
          tokenId
        )
      ).to.equal(0);
    });

    it('Should flush ERC721 when called by an allowed address', async function () {
      const tokenId = ++tokenIdCounter;
      await token721.mint(user1.address, tokenId);
      const forwarderAddress = await noAutoFlushForwarder.getAddress();
      await token721
        .connect(user1)
        .transferFrom(user1.address, forwarderAddress, tokenId);

      await noAutoFlushForwarder
        .connect(feeAddress)
        .flushERC721Token(await token721.getAddress(), tokenId);
      expect(await token721.ownerOf(tokenId)).to.equal(parent.address);
    });

    it('Should flush ERC1155 when called by an allowed address', async function () {
      const tokenId = 1;
      const amount = 50;
      await token1155.mint(
        await noAutoFlushForwarder.getAddress(),
        tokenId,
        amount,
        '0x'
      );

      await noAutoFlushForwarder
        .connect(parent)
        .flushERC1155Tokens(await token1155.getAddress(), tokenId);
      expect(await token1155.balanceOf(parent.address, tokenId)).to.equal(
        amount
      );
    });
  });
});
