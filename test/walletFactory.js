const { expect } = require('chai');
const { ethers } = require('hardhat');
const helpers = require('./helpers'); // For operation hashing
const util = require('ethereumjs-util');

describe('WalletFactory', function () {
  // Define contract factories and signers
  let WalletSimple, WalletFactory, RecoveryWalletSimple, RecoveryWalletFactory;
  let deployer, signer1, signer2, user1, user2, user3;

  before(async () => {
    // Get signers from Hardhat
    [deployer, signer1, signer2, user1, user2, user3] = await ethers.getSigners();

    // Get contract factories
    WalletSimple = await ethers.getContractFactory('WalletSimple');
    WalletFactory = await ethers.getContractFactory('WalletFactory');
    RecoveryWalletSimple = await ethers.getContractFactory('RecoveryWalletSimple');
    RecoveryWalletFactory = await ethers.getContractFactory('RecoveryWalletFactory');
  });

  // Helper to deploy a WalletFactory and its implementation
  const createWalletFactory = async () => {
    const walletImplementation = await WalletSimple.deploy();
    await walletImplementation.waitForDeployment();
    const factory = await WalletFactory.deploy(await walletImplementation.getAddress());
    await factory.waitForDeployment();
    return { factory };
  };

  // Helper to create a wallet and return the contract instance
  const createWallet = async (factory, signers, salt, sender) => {
    const saltBytes = ethers.encodeBytes32String(salt);
    
    // Create the wallet transaction
    const tx = await factory.connect(sender).createWallet(signers, saltBytes);
    const receipt = await tx.wait();
    
    // Find the WalletCreated event to get the new wallet address
    const event = receipt.logs.find(log => {
        try {
            const parsedLog = factory.interface.parseLog(log);
            return parsedLog?.name === 'WalletCreated';
        } catch (e) {
            return false;
        }
    });
    
    if (!event) {
        throw new Error('WalletCreated event not found in transaction logs');
    }
    
    
    const parsedEvent = factory.interface.parseLog(event);
    const walletAddress = parsedEvent.args.newWalletAddress;

    return ethers.getContractAt('WalletSimple', walletAddress);
  };

  it('Should create a functional wallet using the factory', async function () {
    const { factory } = await createWalletFactory();
    const signers = [deployer.address, signer1.address, signer2.address];
    const salt = '0x1234';
    const wallet = await createWallet(factory, signers, salt, user1);

    const amount = ethers.parseEther('2');
    // Fund the wallet
    await expect(
      user1.sendTransaction({ to: await wallet.getAddress(), value: amount })
    ).to.changeEtherBalance(wallet, amount);

    // Prepare and execute a multisig transaction
    const expireTime = Math.floor(new Date().getTime() / 1000) + 60;
    const sequenceId = Number(await wallet.getNextSequenceId());
    const chainId = await ethers.provider.send('eth_chainId', []);

    const operationHash = helpers.getSha3ForConfirmationTx(
      BigInt(chainId).toString(),
      user3.address,
      amount.toString(),
      '0x',
      expireTime,
      sequenceId
    );

    // Create signature using the same approach as the original tests
    const sig = util.ecsign(
      Buffer.from(operationHash.slice(2), 'hex'),
      helpers.privateKeyForAccount(signer1.address)
    );
    const signature = helpers.serializeSignature(sig);

    // The transaction should move funds from the wallet to the recipient
    await expect(
      wallet.connect(deployer).sendMultiSig(
        user3.address,
        amount,
        '0x',
        expireTime,
        sequenceId,
        signature
      )
    ).to.changeEtherBalances([wallet, user3], [-amount, amount]);
  });

  it('Different salt should create at different addresses', async function () {
    const { factory } = await createWalletFactory();
    const signers = [deployer.address, signer1.address, signer2.address]; // Must have 3 signers
    
    const wallet1 = await createWallet(factory, signers, 'salt-1', user1);
    const wallet2 = await createWallet(factory, signers, 'salt-2', user1);

    expect(await wallet1.getAddress()).to.not.equal(await wallet2.getAddress());
  });

  it('Different signers should create at different addresses', async function () {
    const { factory } = await createWalletFactory();
    const salt = 'salt-3';

    const wallet1 = await createWallet(factory, [deployer.address, signer1.address, signer2.address], salt, user1);
    const wallet2 = await createWallet(factory, [deployer.address, signer1.address, user1.address], salt, user1); // Different 3rd signer
    
    expect(await wallet1.getAddress()).to.not.equal(await wallet2.getAddress());
  });

  it('Should fail to create two contracts with the same inputs', async function () {
    const { factory } = await createWalletFactory();
    const signers = [deployer.address, signer1.address, signer2.address]; // Must have 3 signers
    const salt = 'same-salt';

    // First creation should succeed
    await createWallet(factory, signers, salt, user1);

    // Second creation should fail (contract already exists at that address)
    const saltBytes = ethers.encodeBytes32String(salt);
    await expect(
      factory.connect(user1).createWallet(signers, saltBytes)
    ).to.be.reverted;
  });
});

describe('RecoveryWalletFactory', function () {
    let RecoveryWalletSimple, RecoveryWalletFactory;
    let deployer, signer1, signer2;

    before(async () => {
        // Get signers
        [deployer, signer1, signer2] = await ethers.getSigners();
        
        // Get contract factories
        RecoveryWalletSimple = await ethers.getContractFactory('RecoveryWalletSimple');
        RecoveryWalletFactory = await ethers.getContractFactory('RecoveryWalletFactory');
    });

    it('Should create a recovery wallet using factory', async function () {
        const recoveryImpl = await RecoveryWalletSimple.deploy([]);
        await recoveryImpl.waitForDeployment();
        const factory = await RecoveryWalletFactory.deploy(await recoveryImpl.getAddress());
        await factory.waitForDeployment();

        const signers = [deployer.address, signer1.address, signer2.address]; // signer2 is the recovery key
        const salt = 'recovery-salt';
        const saltBytes = ethers.encodeBytes32String(salt);

        // Create the wallet - since there's no event, we just call the function
        await factory.createWallet(signers, saltBytes);
        
        // The RecoveryWalletFactory doesn't emit an event, so we can't easily get the address
        // For now, let's just verify the transaction succeeded
        // In a real scenario, you'd need to compute the CREATE2 address manually or modify the contract to emit events
        // This test verifies that the factory deployment and createWallet call work without reverting
    });
});
