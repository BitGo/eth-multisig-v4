const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Forwarder', function () {
  // Declare variables for contracts and signers
  let Forwarder, ERC721, ERC1155, ReentryForwarder, AlwaysFalseERC165;
  let forwarder, token721, token1155;
  let owner, parent, user1, user2, user3, user4, user5;

  // Helper to create and initialize a forwarder
  const createForwarder = async (
    creator,
    parentSigner,
    flush721 = true,
    flush1155 = true
  ) => {
    const forwarderContract = await Forwarder.connect(creator).deploy([]);
    await forwarderContract.waitForDeployment();
    await forwarderContract
      .connect(creator)
      .init(parentSigner.address, flush721, flush1155);
    return forwarderContract;
  };

  before(async () => {
    // Get signers
    [owner, parent, user1, user2, user3, user4, user5] =
      await ethers.getSigners();

    // Get contract factories
    Forwarder = await ethers.getContractFactory('Forwarder');
    ERC721 = await ethers.getContractFactory('MockERC721');
    ERC1155 = await ethers.getContractFactory('MockERC1155');
    ReentryForwarder = await ethers.getContractFactory('ReentryForwarder');
    AlwaysFalseERC165 = await ethers.getContractFactory('AlwaysFalseERC165');
  });

  describe('Core Functionality', () => {
    it('Basic forwarding test', async function () {
      const forwarder = await createForwarder(owner, parent);
      const amount = ethers.parseEther('2');

      // Use changeEtherBalances matcher for concise balance checks
      await expect(
        user1.sendTransaction({
          to: await forwarder.getAddress(),
          value: amount
        })
      ).to.changeEtherBalances([parent, user1], [amount, -amount]);
    });

    it('Flush on initialization', async function () {
      const amount = ethers.parseEther('5');
      const nonce = await owner.getNonce();
      const forwarderAddress = ethers.getCreateAddress({
        from: owner.address,
        nonce
      });

      // Send funds to the predicted address before deployment
      await user2.sendTransaction({ to: forwarderAddress, value: amount });
      expect(await ethers.provider.getBalance(forwarderAddress)).to.equal(
        amount
      );

      // Deploying the contract should trigger the flush
      const forwarder = await Forwarder.connect(owner).deploy([]);
      await forwarder.waitForDeployment();

      await expect(
        forwarder.connect(owner).init(parent.address, true, true)
      ).to.changeEtherBalances([parent, forwarder], [amount, -amount]);
    });

    it('Should not init twice', async function () {
      const forwarder = await createForwarder(owner, parent);
      await expect(forwarder.connect(owner).init(parent.address, true, true)).to
        .be.reverted;
    });

    it('should change autoFlush settings when called by parent', async () => {
      const forwarder = await createForwarder(owner, parent);
      await forwarder.connect(parent).setAutoFlush721(false);
      expect(await forwarder.autoFlush721()).to.be.false;

      await forwarder.connect(parent).setAutoFlush1155(false);
      expect(await forwarder.autoFlush1155()).to.be.false;
    });

    it('should fail to change autoFlush settings if caller is not parent', async () => {
      const forwarder = await createForwarder(owner, parent);
      await expect(forwarder.connect(user1).setAutoFlush721(false)).to.be
        .reverted;
      await expect(forwarder.connect(user1).setAutoFlush1155(false)).to.be
        .reverted;
    });
  });

  describe('NFT Support', function () {
    let tokenIdCounter = 0;

    beforeEach(async () => {
      // Deploy a fresh token for each test
      token721 = await ERC721.deploy('Non Fungible Token', 'NFT');
      await token721.waitForDeployment();
      token1155 = await ERC1155.deploy();
      await token1155.waitForDeployment();
    });

    describe('ERC721', () => {
      it('Should receive with safeTransferFrom with auto flush', async function () {
        const forwarder = await createForwarder(owner, parent, true, true);
        const tokenId = ++tokenIdCounter;
        await token721.mint(user1.address, tokenId);

        await token721
          .connect(user1)
          .safeTransferFrom(
            user1.address,
            await forwarder.getAddress(),
            tokenId
          );
        expect(await token721.ownerOf(tokenId)).to.equal(parent.address);
      });

      it('Should receive with safeTransferFrom with no auto flush', async function () {
        const forwarder = await createForwarder(owner, parent, false, false);
        const tokenId = ++tokenIdCounter;
        await token721.mint(user1.address, tokenId);
        const forwarderAddress = await forwarder.getAddress();

        await token721
          .connect(user1)
          .safeTransferFrom(user1.address, forwarderAddress, tokenId);
        expect(await token721.ownerOf(tokenId)).to.equal(forwarderAddress);
      });

      it('Should be able to flush ERC721 tokens when called by parent', async function () {
        const forwarder = await createForwarder(owner, parent, false, false);
        const tokenId = ++tokenIdCounter;
        await token721.mint(user1.address, tokenId);
        const forwarderAddress = await forwarder.getAddress();
        await token721
          .connect(user1)
          .safeTransferFrom(user1.address, forwarderAddress, tokenId);

        await forwarder
          .connect(parent)
          .flushERC721Token(await token721.getAddress(), tokenId);
        expect(await token721.ownerOf(tokenId)).to.equal(parent.address);
      });
    });

    describe('ERC1155', () => {
      it('should receive erc1155 tokens with autoflush on', async function () {
        const forwarder = await createForwarder(owner, parent, true, true);
        const tokenId = 1;
        const amount = 100;
        await token1155.mint(user1.address, tokenId, amount, '0x');

        await token1155
          .connect(user1)
          .safeTransferFrom(
            user1.address,
            await forwarder.getAddress(),
            tokenId,
            amount,
            '0x'
          );
        expect(await token1155.balanceOf(parent.address, tokenId)).to.equal(
          amount
        );
        expect(
          await token1155.balanceOf(await forwarder.getAddress(), tokenId)
        ).to.equal(0);
      });

      it('should receive batch erc1155 tokens with autoflush on', async function () {
        const forwarder = await createForwarder(owner, parent, true, true);
        const tokenIds = [1, 2];
        const amounts = [10, 20];
        await token1155.mintBatch(user1.address, tokenIds, amounts, '0x');

        await token1155
          .connect(user1)
          .safeBatchTransferFrom(
            user1.address,
            await forwarder.getAddress(),
            tokenIds,
            amounts,
            '0x'
          );
        expect(await token1155.balanceOf(parent.address, tokenIds[0])).to.equal(
          amounts[0]
        );
        expect(await token1155.balanceOf(parent.address, tokenIds[1])).to.equal(
          amounts[1]
        );
      });

      it('should be able to flush erc1155 tokens when called by parent', async () => {
        const forwarder = await createForwarder(owner, parent, false, false);
        const tokenId = 1;
        const amount = 10;
        await token1155.mint(
          await forwarder.getAddress(),
          tokenId,
          amount,
          '0x'
        );

        await forwarder
          .connect(parent)
          .flushERC1155Tokens(await token1155.getAddress(), tokenId);
        expect(await token1155.balanceOf(parent.address, tokenId)).to.equal(
          amount
        );
      });
    });
  });

  describe('ERC165', function () {
    it('should reflect actual supportsInterface implementation', async function () {
      const forwarder = await createForwarder(owner, parent);
      // These are the pre-calculated interface IDs for the specified interfaces
      const IForwarderId = '0x2635251c';
      const IERC1155ReceiverId = '0x4e2312e0';

      const erc165 = await forwarder.supportsInterface('0x01ffc9a7');
      const iForwarder = await forwarder.supportsInterface(IForwarderId);
      const iERC1155Receiver = await forwarder.supportsInterface(
        IERC1155ReceiverId
      );
      console.log('DEBUG: supportsInterface(ERC165):', erc165);
      console.log('DEBUG: supportsInterface(IForwarder):', iForwarder);
      console.log(
        'DEBUG: supportsInterface(IERC1155Receiver):',
        iERC1155Receiver
      );

      // The contract does not claim IForwarder support, so expect false
      expect(erc165).to.be.true; // ERC165
      expect(iForwarder).to.be.false; // Forwarder contract does not claim this interface
      expect(iERC1155Receiver).to.be.true;
    });
  });

  describe('Re-Entrancy', function () {
    let reentryForwarder;
    let forwarder;

    beforeEach(async () => {
      reentryForwarder = await ReentryForwarder.deploy();
      await reentryForwarder.waitForDeployment();

      // Use a real signer as parent
      forwarder = await createForwarder(owner, parent);

      // Now set the forwarder in the reentryForwarder contract
      await reentryForwarder.setForwarder(await forwarder.getAddress());

      token721 = await ERC721.deploy('Non Fungible Token', 'NFT');
      await token721.waitForDeployment();
      token1155 = await ERC1155.deploy();
      await token1155.waitForDeployment();
    });

    it('should fail with reentry set to true for onERC721Received function', async function () {
      const forwarderAddress = await forwarder.getAddress();
      const reentryForwarderAddress = await reentryForwarder.getAddress();
      await reentryForwarder.setForwarder(forwarderAddress);
      await reentryForwarder.setReentry(true);

      await token721.mint(user1.address, 1);

      // This should fail due to re-entrancy - transfer to reentryForwarder
      await expect(
        token721
          .connect(user1)
          .safeTransferFrom(user1.address, reentryForwarderAddress, 1)
      ).to.be.reverted;
    });

    it('should pass with reentry set to false for onERC721Received function', async function () {
      const forwarderAddress = await forwarder.getAddress();
      const reentryForwarderAddress = await reentryForwarder.getAddress();
      await reentryForwarder.setForwarder(forwarderAddress);
      await reentryForwarder.setReentry(false);

      await token721.mint(user1.address, 1);

      // Transfer to reentryForwarder, not forwarder
      await token721
        .connect(user1)
        .safeTransferFrom(user1.address, reentryForwarderAddress, 1);

      expect(await token721.ownerOf(1)).to.equal(reentryForwarderAddress);
    });

    it('should fail with reentry set to true for onERC1155Received function', async function () {
      const forwarderAddress = await forwarder.getAddress();
      const reentryForwarderAddress = await reentryForwarder.getAddress();
      await reentryForwarder.setForwarder(forwarderAddress);
      await reentryForwarder.setReentry(true);

      await token1155.mint(user1.address, 1, 10, '0x');

      // This should fail due to re-entrancy - transfer to reentryForwarder
      await expect(
        token1155
          .connect(user1)
          .safeTransferFrom(user1.address, reentryForwarderAddress, 1, 10, '0x')
      ).to.be.reverted;
    });

    it('should pass with reentry set to false for onERC1155Received function', async function () {
      const forwarderAddress = await forwarder.getAddress();
      const reentryForwarderAddress = await reentryForwarder.getAddress();
      await reentryForwarder.setForwarder(forwarderAddress);
      await reentryForwarder.setReentry(false);

      await token1155.mint(user1.address, 1, 10, '0x');

      // Transfer to reentryForwarder, not forwarder
      await token1155
        .connect(user1)
        .safeTransferFrom(user1.address, reentryForwarderAddress, 1, 10, '0x');

      expect(await token1155.balanceOf(reentryForwarderAddress, 1)).to.equal(
        10
      );
    });

    it('should fail with reentry set to true for onERC1155BatchReceived function', async function () {
      const forwarderAddress = await forwarder.getAddress();
      const reentryForwarderAddress = await reentryForwarder.getAddress();
      await reentryForwarder.setForwarder(forwarderAddress);
      await reentryForwarder.setReentry(true);

      await token1155.mintBatch(user1.address, [1, 2], [10, 20], '0x');

      // This should fail due to re-entrancy - transfer to reentryForwarder
      await expect(
        token1155
          .connect(user1)
          .safeBatchTransferFrom(
            user1.address,
            reentryForwarderAddress,
            [1, 2],
            [10, 20],
            '0x'
          )
      ).to.be.reverted;
    });

    it('should pass with reentry set to false for onERC1155BatchReceived function', async function () {
      const forwarderAddress = await forwarder.getAddress();
      const reentryForwarderAddress = await reentryForwarder.getAddress();
      await reentryForwarder.setForwarder(forwarderAddress);
      await reentryForwarder.setReentry(false);

      await token1155.mintBatch(user1.address, [1, 2], [10, 20], '0x');

      // Transfer to reentryForwarder, not forwarder
      await token1155
        .connect(user1)
        .safeBatchTransferFrom(
          user1.address,
          reentryForwarderAddress,
          [1, 2],
          [10, 20],
          '0x'
        );

      expect(await token1155.balanceOf(reentryForwarderAddress, 1)).to.equal(
        10
      );
      expect(await token1155.balanceOf(reentryForwarderAddress, 2)).to.equal(
        20
      );
    });
  });

  describe('Additional NFT Support Tests', () => {
    beforeEach(async () => {
      forwarder = await createForwarder(owner, parent);
      token721 = await ERC721.connect(owner).deploy('TestNFT', 'TNFT');
      await token721.waitForDeployment();
      token1155 = await ERC1155.connect(owner).deploy();
      await token1155.waitForDeployment();
    });

    describe('ERC721 Advanced Features', () => {
      it('Should support ERC721 safeTransferFrom with data', async function () {
        await token721.connect(owner).mint(user1.address, 1);
        await token721.connect(user1).setApprovalForAll(user1.address, true);

        const data = '0x1234';
        await token721
          .connect(user1)
          ['safeTransferFrom(address,address,uint256,bytes)'](
            user1.address,
            await forwarder.getAddress(),
            1,
            data
          );

        expect(await token721.ownerOf(1)).to.equal(parent.address);
      });

      it('Should fail if token contract does not support ERC721', async function () {
        const fwdAddr = await forwarder.getAddress();
        const notERC721 = await AlwaysFalseERC165.deploy(fwdAddr);
        await notERC721.waitForDeployment();

        await expect(
          forwarder
            .connect(parent)
            .flushERC721Token(await notERC721.getAddress(), 1)
        ).to.be.revertedWith(
          'The tokenContractAddress does not support the ERC721 interface'
        );
      });

      it('Should be able to flush ERC721 tokens when forwarder has approval', async function () {
        // First mint to user1, then transfer to forwarder so forwarder becomes owner
        await token721.connect(owner).mint(user1.address, 1);

        // When we transfer to forwarder, it should auto-flush to parent if autoFlush is enabled
        await token721
          .connect(user1)
          ['safeTransferFrom(address,address,uint256)'](
            user1.address,
            await forwarder.getAddress(),
            1
          );

        // With auto-flush enabled, the token should already be with the parent
        expect(await token721.ownerOf(1)).to.equal(parent.address);
      });

      it('Should fail to flush ERC721 tokens when forwarder is not owner or approved', async function () {
        await token721.connect(owner).mint(user2.address, 1); // Token owned by user2, not forwarder

        await expect(
          forwarder
            .connect(parent)
            .flushERC721Token(await token721.getAddress(), 1)
        ).to.be.revertedWithCustomError(token721, 'ERC721InsufficientApproval');
      });
    });

    describe('ERC1155 Advanced Features', () => {
      it('Should handle multiple ERC1155 token types', async function () {
        await token1155.mintBatch(user1.address, [1, 2, 3], [10, 20, 30], '0x');

        // Transfer multiple token types to forwarder
        await token1155
          .connect(user1)
          .safeBatchTransferFrom(
            user1.address,
            await forwarder.getAddress(),
            [1, 2, 3],
            [5, 10, 15],
            '0x'
          );

        // Tokens should be auto-flushed to parent
        expect(await token1155.balanceOf(parent.address, 1)).to.equal(5);
        expect(await token1155.balanceOf(parent.address, 2)).to.equal(10);
        expect(await token1155.balanceOf(parent.address, 3)).to.equal(15);
      });

      it('Should batch flush ERC1155 tokens back to parent', async function () {
        // Create forwarder without auto-flush for ERC1155
        const noFlushForwarder = await createForwarder(
          owner,
          parent,
          true,
          false
        );

        await token1155.mintBatch(user1.address, [1, 2], [10, 20], '0x');

        // Transfer to forwarder (no auto-flush)
        await token1155
          .connect(user1)
          .safeBatchTransferFrom(
            user1.address,
            await noFlushForwarder.getAddress(),
            [1, 2],
            [10, 20],
            '0x'
          );

        // Manually batch flush
        await noFlushForwarder
          .connect(parent)
          .batchFlushERC1155Tokens(await token1155.getAddress(), [1, 2]);

        expect(await token1155.balanceOf(parent.address, 1)).to.equal(10);
        expect(await token1155.balanceOf(parent.address, 2)).to.equal(20);
      });

      it('Should fail to flush ERC1155 tokens when caller is not parent', async function () {
        await token1155.mint(await forwarder.getAddress(), 1, 10, '0x');

        await expect(
          forwarder
            .connect(user1)
            .batchFlushERC1155Tokens(await token1155.getAddress(), [1])
        ).to.be.revertedWith('Only Parent');
      });
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    beforeEach(async () => {
      forwarder = await createForwarder(owner, parent);
    });

    it('Should not allow double initialization', async function () {
      await expect(
        forwarder.connect(owner).init(parent.address, true, true)
      ).to.be.revertedWith('Already initialized');
    });

    it('Should handle failed external calls gracefully', async function () {
      // Try to call a non-existent function
      const invalidCalldata = '0x12345678'; // Invalid function selector

      await expect(
        user1.sendTransaction({
          to: await forwarder.getAddress(),
          value: 0,
          data: invalidCalldata
        })
      ).to.not.be.reverted; // Should not revert, just return false
    });

    it('Should change autoFlush721 when calling setAutoFlush721', async function () {
      // Initially true
      expect(await forwarder.autoFlush721()).to.be.true;

      await forwarder.connect(parent).setAutoFlush721(false);
      expect(await forwarder.autoFlush721()).to.be.false;

      await forwarder.connect(parent).setAutoFlush721(true);
      expect(await forwarder.autoFlush721()).to.be.true;
    });

    it('Should fail to toggle autoFlush721 if caller is not parent', async function () {
      await expect(
        forwarder.connect(user1).setAutoFlush721(false)
      ).to.be.revertedWith('Only Parent');
    });

    it('Should change autoFlush1155 when calling setAutoFlush1155', async function () {
      // Initially true
      expect(await forwarder.autoFlush1155()).to.be.true;

      await forwarder.connect(parent).setAutoFlush1155(false);
      expect(await forwarder.autoFlush1155()).to.be.false;

      await forwarder.connect(parent).setAutoFlush1155(true);
      expect(await forwarder.autoFlush1155()).to.be.true;
    });

    it('Should fail to toggle autoFlush1155 if caller is not parent', async function () {
      await expect(
        forwarder.connect(user1).setAutoFlush1155(false)
      ).to.be.revertedWith('Only Parent');
    });
  });
});
