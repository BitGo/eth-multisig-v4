const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('ForwarderFactoryV4', function () {
  // Declare variables for contracts and signers
  let ForwarderV4, ForwarderFactoryV4;
  let forwarderImplementation, forwarderFactory;
  let owner, parent, feeAddress, user1, user2;

  // Helper to deploy the factory and its implementation
  const createForwarderFactory = async () => {
    const implementation = await ForwarderV4.deploy([]);
    await implementation.waitForDeployment();
    const factory = await ForwarderFactoryV4.deploy(await implementation.getAddress());
    await factory.waitForDeployment();
    return {
      implementationAddress: await implementation.getAddress(),
      factory: factory
    };
  };

  // Helper to create a forwarder using the factory and return its actual address
  const createForwarder = async (
    factory,
    parentSigner,
    feeSigner,
    salt,
    shouldAutoFlushERC721 = true,
    shouldAutoFlushERC1155 = true
  ) => {
    const saltBytes = ethers.encodeBytes32String(salt);
    
    // Create the forwarder
    const tx = await factory.createForwarder(
      parentSigner.address,
      feeSigner.address,
      saltBytes,
      shouldAutoFlushERC721,
      shouldAutoFlushERC1155
    );

    // Wait for the transaction and get the receipt
    const receipt = await tx.wait();

    // Find the ForwarderCreated event
    const forwarderCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed.name === 'ForwarderCreated';
      } catch (e) {
        return false;
      }
    });

    if (!forwarderCreatedEvent) {
      throw new Error('ForwarderCreated event not found');
    }

    const parsedEvent = factory.interface.parseLog(forwarderCreatedEvent);
    return parsedEvent.args.newForwarderAddress;
  };

  before(async () => {
    // Get signers
    [owner, parent, feeAddress, user1, user2] = await ethers.getSigners();

    // Get contract factories
    ForwarderV4 = await ethers.getContractFactory('ForwarderV4');
    ForwarderFactoryV4 = await ethers.getContractFactory('ForwarderFactoryV4');
  });

  beforeEach(async () => {
    // Deploy a fresh factory for each test
    const { factory, implementationAddress } = await createForwarderFactory();
    forwarderFactory = factory;
    forwarderImplementation = implementationAddress;
  });

  it('Should create a functional forwarder using the factory', async function () {
    const salt = 'test-salt-1';
    const forwarderAddress = await createForwarder(
      forwarderFactory,
      parent,
      feeAddress,
      salt
    );

    const amount = ethers.parseEther('2');
    // Check that sending ETH to the forwarder correctly forwards it to the parent
    await expect(
      user1.sendTransaction({ to: forwarderAddress, value: amount })
    ).to.changeEtherBalances([parent, user1], [amount, -amount]);
  });

  it('Different salt should create forwarders at different addresses', async function () {
    const forwarderAddress1 = await createForwarder(
      forwarderFactory,
      parent,
      feeAddress,
      'salt-a'
    );
    const forwarderAddress2 = await createForwarder(
      forwarderFactory,
      parent,
      feeAddress,
      'salt-b'
    );

    expect(forwarderAddress1).to.not.equal(forwarderAddress2);
  });

  it('Different parents should create forwarders at different addresses', async function () {
    const forwarderAddress1 = await createForwarder(
      forwarderFactory,
      parent, // parent 1
      feeAddress,
      'salt-c'
    );
    const forwarderAddress2 = await createForwarder(
      forwarderFactory,
      user1, // parent 2
      feeAddress,
      'salt-c'
    );

    expect(forwarderAddress1).to.not.equal(forwarderAddress2);
  });

  it('Different fee addresses should create forwarders at different addresses', async function () {
    const forwarderAddress1 = await createForwarder(
      forwarderFactory,
      parent,
      feeAddress, // fee address 1
      'salt-d'
    );
    const forwarderAddress2 = await createForwarder(
      forwarderFactory,
      parent,
      user2, // fee address 2
      'salt-d'
    );

    expect(forwarderAddress1).to.not.equal(forwarderAddress2);
  });
  
  it('Should fail to create two contracts with the same inputs', async function () {
    const salt = 'same-salt';
    // First creation should succeed
    await createForwarder(forwarderFactory, parent, feeAddress, salt);

    // Second creation with the same parameters should fail
    const saltBytes = ethers.encodeBytes32String(salt);
    await expect(
      forwarderFactory.createForwarder(parent.address, feeAddress.address, saltBytes, true, true)
    ).to.be.reverted; // Reverts because the contract already exists at that address
  });

  // Test cases for autoflush parameters
  [
    { autoFlush721: true, autoFlush1155: true, label: 'true/true' },
    { autoFlush721: false, autoFlush1155: true, label: 'false/true' },
    { autoFlush721: true, autoFlush1155: false, label: 'true/false' },
    { autoFlush721: false, autoFlush1155: false, label: 'false/false' },
  ].forEach(({ autoFlush721, autoFlush1155, label }) => {
    it(`should create a forwarder with autoflush params ${label}`, async () => {
      const salt = `salt-${label}`;
      const forwarderAddress = await createForwarder(forwarderFactory, parent, feeAddress, salt, autoFlush721, autoFlush1155);
      const forwarderContract = await ethers.getContractAt('ForwarderV4', forwarderAddress);
      
      expect(await forwarderContract.autoFlush721()).to.equal(autoFlush721);
      expect(await forwarderContract.autoFlush1155()).to.equal(autoFlush1155);
    });
  });
});
