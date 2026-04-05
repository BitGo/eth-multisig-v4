const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('ForwarderFactory', function () {
  // Declare variables for contracts and signers
  let Forwarder, ForwarderFactory;
  let forwarderImplementation, forwarderFactory;
  let owner, parent, user1, user2;

  // Helper to deploy the factory and its implementation
  const createForwarderFactory = async () => {
    const implementation = await Forwarder.deploy([]);
    await implementation.waitForDeployment();
    const factory = await ForwarderFactory.deploy(
      await implementation.getAddress()
    );
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
    salt,
    senderSigner,
    shouldAutoFlushERC721 = true,
    shouldAutoFlushERC1155 = true
  ) => {
    // Convert salt to bytes32
    const saltBytes = ethers.encodeBytes32String(salt);

    // Create the forwarder
    const tx = await factory
      .connect(senderSigner)
      .createForwarder(
        parentSigner.address,
        saltBytes,
        shouldAutoFlushERC721,
        shouldAutoFlushERC1155
      );

    // Wait for the transaction and get the receipt
    const receipt = await tx.wait();

    // Find the ForwarderCreated event
    const forwarderCreatedEvent = receipt.logs.find((log) => {
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
    [owner, parent, user1, user2] = await ethers.getSigners();

    // Get contract factories
    Forwarder = await ethers.getContractFactory('Forwarder');
    ForwarderFactory = await ethers.getContractFactory('ForwarderFactory');
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
      salt,
      user1
    );

    const amount = ethers.parseEther('2');

    // Check that sending ETH to the forwarder correctly forwards it to the parent
    await expect(
      user2.sendTransaction({ to: forwarderAddress, value: amount })
    ).to.changeEtherBalances([parent, user2], [amount, -amount]);
  });

  it('Different salt should create at different addresses', async function () {
    const forwarderAddress1 = await createForwarder(
      forwarderFactory,
      parent,
      'salt-a',
      user1
    );
    const forwarderAddress2 = await createForwarder(
      forwarderFactory,
      parent,
      'salt-b',
      user1
    );

    expect(forwarderAddress1).to.not.equal(forwarderAddress2);
  });

  it('Different parents should create at different addresses', async function () {
    const forwarderAddress1 = await createForwarder(
      forwarderFactory,
      parent, // parent 1
      'salt-c',
      user1
    );
    const forwarderAddress2 = await createForwarder(
      forwarderFactory,
      user2, // parent 2
      'salt-c',
      user1
    );

    expect(forwarderAddress1).to.not.equal(forwarderAddress2);
  });

  it('Different factory creators should create at different addresses', async function () {
    const { factory: factory2 } = await createForwarderFactory();
    const salt = 'salt-d';

    const forwarderAddress1 = await createForwarder(
      forwarderFactory,
      parent,
      salt,
      user1
    );
    const forwarderAddress2 = await createForwarder(
      factory2,
      parent,
      salt,
      user1
    );

    expect(forwarderAddress1).to.not.equal(forwarderAddress2);
  });

  it('Should fail to create two contracts with the same salt and parent', async function () {
    const salt = 'same-salt';
    // First creation should succeed
    await createForwarder(forwarderFactory, parent, salt, user1);

    // Second creation with the same parameters should fail
    const saltBytes = ethers.encodeBytes32String(salt);
    await expect(
      forwarderFactory
        .connect(user1)
        .createForwarder(parent.address, saltBytes, true, true)
    ).to.be.reverted; // Reverts because the contract already exists at that address
  });

  // Test cases for autoflush parameters
  [
    { autoFlush721: true, autoFlush1155: true, label: 'true/true' },
    { autoFlush721: false, autoFlush1155: true, label: 'false/true' },
    { autoFlush721: true, autoFlush1155: false, label: 'true/false' },
    { autoFlush721: false, autoFlush1155: false, label: 'false/false' }
  ].forEach(({ autoFlush721, autoFlush1155, label }) => {
    it(`should create a forwarder with autoflush params ${label}`, async () => {
      const salt = `salt-${label}`;
      const forwarderAddress = await createForwarder(
        forwarderFactory,
        parent,
        salt,
        user1,
        autoFlush721,
        autoFlush1155
      );
      const forwarderContract = await ethers.getContractAt(
        'Forwarder',
        forwarderAddress
      );

      expect(await forwarderContract.autoFlush721()).to.equal(autoFlush721);
      expect(await forwarderContract.autoFlush1155()).to.equal(autoFlush1155);
    });
  });
});
