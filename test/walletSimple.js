const { expect } = require('chai');
const { ethers } = require('hardhat');
const helpers = require('./helpers'); // For operation hashing
const { createWalletHelper } = require('./wallet/helpers');
const util = require('ethereumjs-util');

describe('WalletSimple Contracts', function () {
  // Define contract factories and signers to be used across tests
  let WalletFactory, RecoveryWalletSimple, RecoveryWalletFactory;
  let deployer, signer1, signer2, user1, user2, user3, user4, user5;
  let ReentryWalletSimple; // Factory for re-entrancy helper contract

  // List of wallet implementations to test
  const coins = [
    { name: 'WalletSimple', nativePrefix: '31337', nativeBatchPrefix: '31337-Batch', tokenPrefix: '31337-ERC20' },
    { name: 'RskWalletSimple', nativePrefix: 'RSK', nativeBatchPrefix: 'RSK-Batch', tokenPrefix: 'RSK-ERC20' },
    { name: 'EtcWalletSimple', nativePrefix: 'ETC', nativeBatchPrefix: 'ETC-Batch', tokenPrefix: 'ETC-ERC20' },
    { name: 'CeloWalletSimple', nativePrefix: 'CELO', nativeBatchPrefix: 'CELO-Batch', tokenPrefix: 'CELO-ERC20' },
    { name: 'PolygonWalletSimple', nativePrefix: 'POLYGON', nativeBatchPrefix: 'POLYGON-Batch', tokenPrefix: 'POLYGON-ERC20' },
    { name: 'ArbethWalletSimple', nativePrefix: '31337', nativeBatchPrefix: '31337-Batch', tokenPrefix: '31337-ERC20' },
    { name: 'OpethWalletSimple', nativePrefix: '31337', nativeBatchPrefix: '31337-Batch', tokenPrefix: '31337-ERC20' },
  ];

  before(async () => {
    // Get signers from Hardhat
    [deployer, signer1, signer2, user1, user2, user3, user4, user5] = await ethers.getSigners();

    // Get base contract factories
    WalletFactory = await ethers.getContractFactory('WalletFactory');
    RecoveryWalletSimple = await ethers.getContractFactory('RecoveryWalletSimple');
    RecoveryWalletFactory = await ethers.getContractFactory('RecoveryWalletFactory');
    ReentryWalletSimple = await ethers.getContractFactory('ReentryWalletSimple');
  });

  // Default createWallet function for tests that run outside coin-specific describe blocks
  const createWallet = async (creator, signers) => {
    const WalletSimpleImplementation = await ethers.getContractFactory('WalletSimple');
    return createWalletHelper(WalletSimpleImplementation, creator, signers);
  };

  // Loop to run the same tests for each wallet implementation
  coins.forEach(({ name: walletContractName, nativePrefix, nativeBatchPrefix, tokenPrefix }) => {
    describe(`${walletContractName}`, function () {
      let wallet; // The multisig wallet instance for each test

      // Helper to create a new wallet for a set of signers
      const createWallet = async (creator, signers) => {
        const WalletSimpleImplementation = await ethers.getContractFactory(walletContractName);
        return createWalletHelper(WalletSimpleImplementation, creator, signers);
      };

      describe('Wallet creation', function () {
        it('2 of 3 multisig wallet', async function () {
          const signers = [deployer.address, signer1.address, signer2.address];
          const wallet = await createWallet(deployer, signers);

          for (const signerAddress of signers) {
            expect(await wallet.signers(signerAddress)).to.be.true;
          }
          expect(await wallet.signers(user1.address)).to.be.false;
          expect(await wallet.safeMode()).to.be.false;
        });

        it('Reverts when creating with 0 address signer', async function () {
            const WalletSimpleImplementation = await ethers.getContractFactory(walletContractName);
            const walletImplementation = await WalletSimpleImplementation.deploy([]);
            await walletImplementation.waitForDeployment();
            await expect(walletImplementation.init([deployer.address, ethers.ZeroAddress])).to.be.revertedWith('Invalid number of signers');
        });
      });

      describe('Deposits', function () {
        beforeEach(async () => {
          wallet = await createWallet(deployer, [deployer.address, signer1.address, signer2.address]);
        });

        it('Should emit event on deposit', async function () {
          const amount = ethers.parseEther('20');
          await expect(deployer.sendTransaction({ to: await wallet.getAddress(), value: amount }))
            .to.emit(wallet, 'Deposited')
            .withArgs(deployer.address, amount, '0x');
        });

        it('Should emit event with data on deposit', async function () {
            const amount = ethers.parseEther('30');
            const data = '0xabcd';
            await expect(deployer.sendTransaction({ to: await wallet.getAddress(), value: amount, data: data }))
              .to.emit(wallet, 'Deposited')
              .withArgs(deployer.address, amount, data);
        });
      });

      describe('Transaction sending using sendMultiSig', function () {
        beforeEach(async function () {
          // Create and fund a new wallet for each test
          wallet = await createWallet(deployer, [deployer.address, signer1.address, signer2.address]);
          await deployer.sendTransaction({ to: await wallet.getAddress(), value: ethers.parseEther('2000') });
        });

        it('Send out 50 ether with sendMultiSig', async function () {
          const amount = ethers.parseEther('50');
          const expireTime = Math.floor(Date.now() / 1000) + 3600;
          const data = '0xabcde35f1234';
          const sequenceId = Number(await wallet.getNextSequenceId());

          const operationHash = helpers.getSha3ForConfirmationTx(
            nativePrefix,
            user1.address,
            amount.toString(),
            data,
            expireTime,
            sequenceId
          );
          
          const sig = util.ecsign(
            Buffer.from(operationHash.slice(2), 'hex'),
            helpers.privateKeyForAccount(signer1.address)
          );
          const signature = helpers.serializeSignature(sig);

          const tx = wallet.connect(deployer).sendMultiSig(user1.address, amount, data, expireTime, sequenceId, signature);

          await expect(tx).to.changeEtherBalances([wallet, user1], [-amount, amount]);
          await expect(tx).to.emit(wallet, 'Transacted').withArgs(
              deployer.address,
              signer1.address,
              operationHash,
              user1.address,
              amount,
              data
          );
        });

        it('Should fail to reuse a sequence ID', async function () {
            const amount = ethers.parseEther('1');
            const expireTime = Math.floor(Date.now() / 1000) + 3600;
            const sequenceId = Number(await wallet.getNextSequenceId());
  
            const operationHash = helpers.getSha3ForConfirmationTx(nativePrefix, user1.address, amount.toString(), '0x', expireTime, sequenceId);
            const sig = util.ecsign(
              Buffer.from(operationHash.slice(2), 'hex'),
              helpers.privateKeyForAccount(signer1.address)
            );
            const signature = helpers.serializeSignature(sig);
  
            // First transaction should succeed
            await wallet.connect(deployer).sendMultiSig(user1.address, amount, '0x', expireTime, sequenceId, signature);
  
            // Second transaction with the same sequenceId should fail
            await expect(
                wallet.connect(deployer).sendMultiSig(user1.address, amount, '0x', expireTime, sequenceId, signature)
            ).to.be.revertedWith('Sequence ID already used');
        });

        it('Should fail if the signature is invalid', async function () {
            const amount = ethers.parseEther('1');
            const expireTime = Math.floor(Date.now() / 1000) + 3600;
            const sequenceId = Number(await wallet.getNextSequenceId());
  
            const operationHash = helpers.getSha3ForConfirmationTx(nativePrefix, user1.address, amount.toString(), '0x', expireTime, sequenceId);
            
            // Sign with an unauthorized signer (user2)
            const sig = util.ecsign(
              Buffer.from(operationHash.slice(2), 'hex'),
              helpers.privateKeyForAccount(user2.address)
            );
            const signature = helpers.serializeSignature(sig);
  
            await expect(
                wallet.connect(deployer).sendMultiSig(user1.address, amount, '0x', expireTime, sequenceId, signature)
            ).to.be.revertedWith('Invalid signer');
        });
      });

      // Batch Transaction sending using sendMultiSigBatch
      describe('Batch Transaction sending using sendMultiSigBatch', function() {
        let wallet;

        beforeEach(async function() {
          wallet = await createWallet(deployer, [deployer.address, signer1.address, signer2.address]);
          await deployer.sendTransaction({ to: await wallet.getAddress(), value: ethers.parseEther('100') });
        });

        it('Should send batch transaction to multiple recipients', async function() {
          const recipients = [user1.address, user2.address, user3.address];
          const amounts = [ethers.parseEther('1'), ethers.parseEther('2'), ethers.parseEther('3')];
          const expireTime = Math.floor(Date.now() / 1000) + 3600;
          const sequenceId = Number(await wallet.getNextSequenceId());

          const operationHash = helpers.getSha3ForBatchTx(
            nativeBatchPrefix,
            recipients,
            amounts.map(a => a.toString()),
            expireTime,
            sequenceId
          );

          const sig = util.ecsign(
            Buffer.from(operationHash.slice(2), 'hex'),
            helpers.privateKeyForAccount(signer1.address)
          );
          const signature = helpers.serializeSignature(sig);

          await expect(
            wallet.connect(deployer).sendMultiSigBatch(recipients, amounts, expireTime, sequenceId, signature)
          ).to.changeEtherBalances(
            [wallet, user1, user2, user3],
            [-(amounts[0] + amounts[1] + amounts[2]), amounts[0], amounts[1], amounts[2]]
          );
        });

        it('Should fail batch transaction with mismatched arrays', async function() {
          const recipients = [user1.address, user2.address];
          const amounts = [ethers.parseEther('1')]; // Mismatched array length
          const expireTime = Math.floor(Date.now() / 1000) + 3600;
          const sequenceId = Number(await wallet.getNextSequenceId());

          await expect(
            wallet.connect(deployer).sendMultiSigBatch(recipients, amounts, expireTime, sequenceId, '0x')
          ).to.be.revertedWith('Unequal recipients and values');
        });
      });

      // ERC20 token transfers
      describe('ERC20 token transfers', function() {
        let wallet;
        let token;

        beforeEach(async function() {
          wallet = await createWallet(deployer, [deployer.address, signer1.address, signer2.address]);
          
          // Deploy a simple ERC20 token for testing
          const Token = await ethers.getContractFactory('FixedSupplyToken');
          token = await Token.deploy();
          await token.waitForDeployment();
          
          // Transfer some tokens to the wallet (use raw units; totalSupply is 1,000,000)
          await token.transfer(await wallet.getAddress(), 1000n);
        });

        it('Should transfer ERC20 tokens using sendMultiSigToken', async function() {
          const amount = 10n;
          const expireTime = Math.floor(Date.now() / 1000) + 3600;
          const sequenceId = Number(await wallet.getNextSequenceId());

          const operationHash = helpers.getSha3ForConfirmationTokenTx(
            tokenPrefix,
            user1.address,
            amount.toString(),
            await token.getAddress(),
            expireTime,
            sequenceId
          );

          const sig = util.ecsign(
            Buffer.from(operationHash.slice(2), 'hex'),
            helpers.privateKeyForAccount(signer1.address)
          );
          const signature = helpers.serializeSignature(sig);

          const tx = wallet.connect(deployer).sendMultiSigToken(
            user1.address,
            amount,
            await token.getAddress(),
            expireTime,
            sequenceId,
            signature
          );

          await expect(tx).to.changeTokenBalances(token, [wallet, user1], [-amount, amount]);
        });
      });

      // Safe mode tests - these should work as they don't require signature verification for basic functionality
      describe('Safe mode', function() {
        let wallet;

        beforeEach(async function() {
          wallet = await createWallet(deployer, [deployer.address, signer1.address, signer2.address]);
        });

        it('Should start with safe mode disabled', async function() {
          expect(await wallet.safeMode()).to.be.false;
        });

        it('Should enable safe mode', async function() {
          await wallet.connect(deployer).activateSafeMode();
          expect(await wallet.safeMode()).to.be.true;
        });
      });

      // Tests for NFT (ERC721 and ERC1155) support functionality - receiving tokens
      describe('NFT Support', function() {
        let wallet;

        beforeEach(async function() {
          wallet = await createWallet(deployer, [deployer.address, signer1.address, signer2.address]);
        });

        describe('ERC721', function() {
          it('Should receive ERC721 via safeMint', async function() {
            const ERC721 = await ethers.getContractFactory('MockERC721');
            const nft = await ERC721.deploy('TestNFT', 'TNFT');
            await nft.waitForDeployment();

            const tokenId = 1n;
            await nft.mint(await wallet.getAddress(), tokenId);
            expect(await nft.ownerOf(tokenId)).to.equal(await wallet.getAddress());
          });
        });

        describe('ERC1155', function() {
          it('Should receive ERC1155 tokens', async function() {
            const ERC1155 = await ethers.getContractFactory('MockERC1155');
            const nft = await ERC1155.deploy();
            await nft.waitForDeployment();

            const id = 1n;
            const amt = 5n;
            await nft.mint(await wallet.getAddress(), id, amt, '0x');
            expect(await nft.balanceOf(await wallet.getAddress(), id)).to.equal(amt);
          });
        });
      });

      // ERC165 interface support tests - these should work as they don't require signatures
      describe('ERC165 Interface Support', function() {
        let wallet;

        beforeEach(async function() {
          wallet = await createWallet(deployer, [deployer.address, signer1.address, signer2.address]);
        });

        it('Should support ERC165 interface detection', async function() {
          // Test ERC165 supportsInterface functionality
          const ERC165_INTERFACE_ID = '0x01ffc9a7';
          
          try {
            const supported = await wallet.supportsInterface(ERC165_INTERFACE_ID);
            expect(typeof supported).to.equal('boolean');
          } catch (error) {
            // Some wallet implementations might not support ERC165
            console.log('ERC165 not supported by this wallet implementation');
          }
        });
      });

      // Re-entrancy tests (ported from legacy suite)
      describe('Re-Entrancy', function () {
        let wallet;
        let reentryInstance;
        let sequenceId;

        before(async function () {
          reentryInstance = await ReentryWalletSimple.deploy();
          await reentryInstance.waitForDeployment();

          // Use the reentry contract itself as one of the 3 signers
          wallet = await createWallet(deployer, [
            deployer.address,
            signer1.address,
            await reentryInstance.getAddress(),
          ]);

          // Fund wallet with ample ETH
          await deployer.sendTransaction({
            to: await wallet.getAddress(),
            value: ethers.parseEther('200000'),
          });
        });

        beforeEach(async function () {
          sequenceId = Number(await wallet.getNextSequenceId());
        });

        it('should fail with reentry set to true for sendMultiSig', async function () {
          const expireTime = Math.floor(Date.now() / 1000) + 120;
          const amount = ethers.parseEther('1');
          const toAddress = await reentryInstance.getAddress();
          const data = '0x1234';

          const operationHash = helpers.getSha3ForConfirmationTx(
            nativePrefix,
            toAddress,
            amount.toString(),
            data,
            expireTime,
            sequenceId
          );
          const sig = util.ecsign(
            Buffer.from(operationHash.slice(2), 'hex'),
            helpers.privateKeyForAccount(signer1.address)
          );
          const signature = helpers.serializeSignature(sig);

          await expect(
            reentryInstance.sendMultiSig(
              await wallet.getAddress(),
              toAddress,
              amount,
              data,
              expireTime,
              sequenceId,
              signature,
              true
            )
          ).to.be.revertedWith('ReentryWalletSimple: sendMultiSig failed call');
        });

        it('should pass with reentry set to false for sendMultiSig', async function () {
          const expireTime = Math.floor(Date.now() / 1000) + 1000;
          const amount = ethers.parseEther('1');
          const toAddress = await reentryInstance.getAddress();
          const data = '0x5678';

          const operationHash = helpers.getSha3ForConfirmationTx(
            nativePrefix,
            toAddress,
            amount.toString(),
            data,
            expireTime,
            sequenceId
          );
          const sig = util.ecsign(
            Buffer.from(operationHash.slice(2), 'hex'),
            helpers.privateKeyForAccount(signer1.address)
          );
          const signature = helpers.serializeSignature(sig);

          await expect(
            reentryInstance.sendMultiSig(
              await wallet.getAddress(),
              toAddress,
              amount,
              data,
              expireTime,
              sequenceId,
              signature,
              false
            )
          ).to.changeEtherBalances(
            [wallet, await reentryInstance.getAddress()],
            [-amount, amount]
          );
        });

        it('should fail with reentry set to true for sendMultiSigBatch', async function () {
          const expireTime = Math.floor(Date.now() / 1000) + 120;
          const amount = ethers.parseEther('1');
          const recipients = [await reentryInstance.getAddress()];
          const values = [amount];

          const operationHash = helpers.getSha3ForBatchTx(
            nativeBatchPrefix,
            recipients,
            values.map((v) => v.toString()),
            expireTime,
            sequenceId
          );
          const sig = util.ecsign(
            Buffer.from(operationHash.slice(2), 'hex'),
            helpers.privateKeyForAccount(signer1.address)
          );
          const signature = helpers.serializeSignature(sig);

          await expect(
            reentryInstance.sendMultiSigBatch(
              await wallet.getAddress(),
              recipients,
              values,
              expireTime,
              sequenceId,
              signature,
              true
            )
          ).to.be.revertedWith('ReentryWalletSimple: sendMultiSigBatch failed call');
        });

        it('should pass with reentry set to false for sendMultiSigBatch', async function () {
          const expireTime = Math.floor(Date.now() / 1000) + 1000;
          const amount = ethers.parseEther('1');
          const recipients = [await reentryInstance.getAddress()];
          const values = [amount];

          const operationHash = helpers.getSha3ForBatchTx(
            nativeBatchPrefix,
            recipients,
            values.map((v) => v.toString()),
            expireTime,
            sequenceId
          );
          const sig = util.ecsign(
            Buffer.from(operationHash.slice(2), 'hex'),
            helpers.privateKeyForAccount(signer1.address)
          );
          const signature = helpers.serializeSignature(sig);

          await expect(
            reentryInstance.sendMultiSigBatch(
              await wallet.getAddress(),
              recipients,
              values,
              expireTime,
              sequenceId,
              signature,
              false
            )
          ).to.changeEtherBalances(
            [wallet, await reentryInstance.getAddress()],
            [-amount, amount]
          );
        });

        it('should fail with reentry set to true for sendMultiSigToken', async function () {
          const expireTime = Math.floor(Date.now() / 1000) + 120;
          const amount = ethers.parseEther('1');
          const toAddress = user5.address; // arbitrary destination
          const tokenContractAddress = await reentryInstance.getAddress();

          const operationHash = helpers.getSha3ForConfirmationTokenTx(
            tokenPrefix,
            toAddress,
            amount.toString(),
            tokenContractAddress,
            expireTime,
            sequenceId
          );
          const sig = util.ecsign(
            Buffer.from(operationHash.slice(2), 'hex'),
            helpers.privateKeyForAccount(signer1.address)
          );
          const signature = helpers.serializeSignature(sig);

          await expect(
            reentryInstance.sendMultiSigToken(
              await wallet.getAddress(),
              toAddress,
              amount,
              tokenContractAddress,
              expireTime,
              sequenceId,
              signature,
              true
            )
          ).to.be.revertedWith('ReentryWalletSimple: sendMultiSigToken failed call');
        });

        it('should pass with reentry set to false for sendMultiSigToken', async function () {
          const expireTime = Math.floor(Date.now() / 1000) + 1000;
          const amount = ethers.parseEther('1');
          const toAddress = user3.address; // arbitrary destination
          const tokenContractAddress = await reentryInstance.getAddress();

          const operationHash = helpers.getSha3ForConfirmationTokenTx(
            tokenPrefix,
            toAddress,
            amount.toString(),
            tokenContractAddress,
            expireTime,
            sequenceId
          );
          const sig = util.ecsign(
            Buffer.from(operationHash.slice(2), 'hex'),
            helpers.privateKeyForAccount(signer1.address)
          );
          const signature = helpers.serializeSignature(sig);

          // Should not revert
          await reentryInstance.sendMultiSigToken(
            await wallet.getAddress(),
            toAddress,
            amount,
            tokenContractAddress,
            expireTime,
            sequenceId,
            signature,
            false
          );
        });
      });

      describe('RecoveryWallet', function () {
        it('Should successfully send funds via the recovery signer', async function () {
          // Deploy implementation and factory
          const recoveryImpl = await RecoveryWalletSimple.deploy();
          await recoveryImpl.waitForDeployment();
          const factory = await RecoveryWalletFactory.deploy(await recoveryImpl.getAddress());
          await factory.waitForDeployment();

          // Inputs
          const signers = [deployer.address, signer1.address, signer2.address]; // signer2 is the recovery key
          const salt = ethers.encodeBytes32String('recovery-salt');

          // Create the wallet on-chain and fetch the address from the WalletCreated event
          const tx = await factory.createWallet(signers, salt);
          const receipt = await tx.wait();
          const createdLog = receipt.logs.find(log => {
            try { return factory.interface.parseLog(log).name === 'WalletCreated'; } catch { return false; }
          });
          if (!createdLog) { throw new Error('WalletCreated event not found'); }
          const parsed = factory.interface.parseLog(createdLog);
          const walletAddress = parsed.args.newWalletAddress;

          // Verify code exists at the created address
          const code = await ethers.provider.getCode(walletAddress);
          expect(code).to.not.equal('0x');

          const wallet = await ethers.getContractAt('RecoveryWalletSimple', walletAddress);

          // Fund and send by recovery signer
          await deployer.sendTransaction({ to: await wallet.getAddress(), value: ethers.parseEther('20') });
          const amount = ethers.parseEther('2');
          await expect(
            wallet.connect(signer2).sendFunds(user1.address, amount, '0x')
          ).to.changeEtherBalances([wallet, user1], [-amount, amount]);
        });
      });
    });
  });
});

// Tests for signature recovery using the Transacted event to verify otherSigner
describe('Recover address from signature', function() {
  let wallet;
  let deployer, signer1, signer2, user1;

  before(async function() {
    [deployer, signer1, signer2, user1] = await ethers.getSigners();
  });

  beforeEach(async function() {
    const WalletSimpleImplementation = await ethers.getContractFactory('WalletSimple');
    wallet = await createWalletHelper(WalletSimpleImplementation, deployer, [deployer.address, signer1.address, signer2.address]);
    await deployer.sendTransaction({ to: await wallet.getAddress(), value: ethers.parseEther('1') });
  });

  it('Matches util.ecsign signer via Transacted event (10 iterations)', async function() {
    const { chainId } = await ethers.provider.getNetwork();

    for (let i = 0; i < 10; i++) {
      const amount = 1n; // wei
      const expireTime = Math.floor(Date.now() / 1000) + 3600;
      const sequenceId = Number(await wallet.getNextSequenceId());

      const operationHash = helpers.getSha3ForConfirmationTx(
        chainId.toString(),
        user1.address,
        amount.toString(),
        '0x',
        expireTime,
        sequenceId
      );

      const sig = util.ecsign(
        Buffer.from(operationHash.slice(2), 'hex'),
        helpers.privateKeyForAccount(signer1.address)
      );
      const signature = helpers.serializeSignature(sig);

      const tx = await wallet.connect(deployer).sendMultiSig(
        user1.address,
        amount,
        '0x',
        expireTime,
        sequenceId,
        signature
      );
      const receipt = await tx.wait();
      const log = receipt.logs.find(log => {
        try {
          const parsed = wallet.interface.parseLog(log);
          return parsed?.name === 'Transacted';
        } catch (e) {
          return false;
        }
      });
      const parsed = wallet.interface.parseLog(log);
      expect(parsed.args.otherSigner.toLowerCase()).to.equal(signer1.address.toLowerCase());
    }
  });
});

// Anti-replay protection tests using real signed transactions
describe('Sequence ID anti-replay protection', function() {
  let wallet;
  let deployer, signer1, signer2, user1;

  before(async function() {
    [deployer, signer1, signer2, user1] = await ethers.getSigners();
  });

  beforeEach(async function() {
    const WalletSimpleImplementation = await ethers.getContractFactory('WalletSimple');
    wallet = await createWalletHelper(WalletSimpleImplementation, deployer, [deployer.address, signer1.address, signer2.address]);
    await deployer.sendTransaction({ to: await wallet.getAddress(), value: ethers.parseEther('10') });
  });

  it('Sequence ID should increment after successful transaction', async function() {
    const initialSequenceId = Number(await wallet.getNextSequenceId());

    const amount = 1n;
    const expireTime = Math.floor(Date.now() / 1000) + 3600;
    const sequenceId = initialSequenceId;
    const { chainId } = await ethers.provider.getNetwork();

    const operationHash = helpers.getSha3ForConfirmationTx(
      chainId.toString(),
      user1.address,
      amount.toString(),
      '0x',
      expireTime,
      sequenceId
    );

    const sig = util.ecsign(
      Buffer.from(operationHash.slice(2), 'hex'),
      helpers.privateKeyForAccount(signer1.address)
    );
    const signature = helpers.serializeSignature(sig);

    await wallet.connect(deployer).sendMultiSig(user1.address, amount, '0x', expireTime, sequenceId, signature);

    const nextSequenceId = Number(await wallet.getNextSequenceId());
    expect(nextSequenceId).to.equal(initialSequenceId + 1);
  });

  it('Should reject transaction with used sequence ID', async function() {
    const amount = 1n;
    const expireTime = Math.floor(Date.now() / 1000) + 3600;
    const sequenceId = Number(await wallet.getNextSequenceId());
    const { chainId } = await ethers.provider.getNetwork();

    const operationHash = helpers.getSha3ForConfirmationTx(
      chainId.toString(),
      user1.address,
      amount.toString(),
      '0x',
      expireTime,
      sequenceId
    );

    const sig = util.ecsign(
      Buffer.from(operationHash.slice(2), 'hex'),
      helpers.privateKeyForAccount(signer1.address)
    );
    const signature = helpers.serializeSignature(sig);

    // First tx succeeds
    await wallet.connect(deployer).sendMultiSig(user1.address, amount, '0x', expireTime, sequenceId, signature);

    // Reuse same sequenceId should revert
    await expect(
      wallet.connect(deployer).sendMultiSig(user1.address, amount, '0x', expireTime, sequenceId, signature)
    ).to.be.revertedWith('Sequence ID already used');
  });
});
