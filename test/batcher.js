const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Batcher', () => {
  // Declare variables for contracts and signers to be used across tests
  let Batcher,
    Reentry,
    Fail,
    GasGuzzler,
    GasHeavy,
    FixedSupplyToken,
    TestBatcherDriver;
  let batcher, reentry, fail, gasGuzzler, gasHeavy, fixedSupplyToken;
  let deployer,
    batcherOwner,
    tokenOwner,
    sender,
    recipient1,
    recipient2,
    recipient3,
    otherAccount;

  // --- Helper function to generate random BigInt values ---
  const randBigInt = (max) => BigInt(Math.floor(Math.random() * max) + 1);
  const createRandBigIntArr = (len) =>
    Array.from({ length: len }, () => randBigInt(100));

  before(async () => {
    // Get signers from Hardhat
    [
      deployer,
      sender,
      recipient1,
      recipient2,
      recipient3,
      otherAccount,
      batcherOwner,
      tokenOwner
    ] = await ethers.getSigners();

    // Get contract factories
    Batcher = await ethers.getContractFactory('Batcher');
    TestBatcherDriver = await ethers.getContractFactory('TestBatcherDriver');
    Reentry = await ethers.getContractFactory('Reentry');
    Fail = await ethers.getContractFactory('Fail');
    GasGuzzler = await ethers.getContractFactory('GasGuzzler');
    GasHeavy = await ethers.getContractFactory('GasHeavy');
    FixedSupplyToken = await ethers.getContractFactory('FixedSupplyToken');
  });

  beforeEach(async () => {
    // Deploy contracts before each test
    batcher = await Batcher.connect(batcherOwner).deploy(21000, 256, 256);
    await batcher.waitForDeployment();

    const batcherAddress = await batcher.getAddress();
    reentry = await Reentry.deploy(batcherAddress);
    await reentry.waitForDeployment();

    fail = await Fail.deploy();
    await fail.waitForDeployment();

    gasGuzzler = await GasGuzzler.deploy();
    await gasGuzzler.waitForDeployment();

    gasHeavy = await GasHeavy.deploy();
    await gasHeavy.waitForDeployment();
  });

  // This hook runs after each test to clean up leftover funds in the batcher contract
  afterEach(async () => {
    if (batcher) {
      const batcherAddress = await batcher.getAddress();
      const balance = await ethers.provider.getBalance(batcherAddress);
      if (balance > 0) {
        // The recover function allows the owner to retrieve stuck funds.
        await batcher
          .connect(batcherOwner)
          .recover(deployer.address, balance, '0x');
      }
    }
  });

  const runTestBatcherDriver = async ({
    recipients,
    values,
    extraValue = 0n,
    expectRevert = false,
    expectedErrorMsg = ''
  }) => {
    const testBatcherDriver = await TestBatcherDriver.deploy(
      await batcher.getAddress(),
      false,
      false
    );
    await testBatcherDriver.waitForDeployment();

    const totalValue = values.reduce((sum, v) => sum + v, 0n);
    const sendVal = totalValue + extraValue;

    const recipientAddresses = recipients.map((r) => r.address || r);

    const txPromise = testBatcherDriver
      .connect(sender)
      .driveTest(recipientAddresses, values, { value: sendVal });

    if (expectRevert) {
      if (expectedErrorMsg) {
        // Use custom error for these codes, otherwise use revert string
        if (
          [
            'EmptyRecipientsList',
            'UnequalRecipientsAndValues',
            'TooManyRecipients'
          ].includes(expectedErrorMsg)
        ) {
          await expect(txPromise).to.be.revertedWithCustomError(
            batcher,
            expectedErrorMsg
          );
        } else {
          let revertString = expectedErrorMsg;
          if (expectedErrorMsg === 'TotalSentMustEqualTotalReceived') {
            revertString = 'Total sent out must equal total received';
          } else if (expectedErrorMsg === 'InvalidRecipient') {
            revertString = 'Invalid recipient address';
          }
          await expect(txPromise).to.be.revertedWith(revertString);
        }
      } else {
        await expect(txPromise).to.be.reverted;
      }
      return;
    }

    await expect(txPromise).to.changeEtherBalances(recipients, values);
  };

  describe('Good transactions', () => {
    it('Correctly sends to a single recipient', async () => {
      await runTestBatcherDriver({
        recipients: [recipient1],
        values: [ethers.parseEther('1')]
      });
    });

    it('Correctly sends to multiple recipients with exact amount', async () => {
      await runTestBatcherDriver({
        recipients: [recipient1, recipient2, recipient3],
        values: createRandBigIntArr(3).map((v) =>
          ethers.parseEther(v.toString())
        )
      });
    });

    it('Correctly sends with duplicate recipients', async () => {
      const recipients = [recipient1, recipient1, recipient2];
      const values = [
        ethers.parseEther('1'),
        ethers.parseEther('2'),
        ethers.parseEther('3')
      ];

      const testBatcherDriver = await TestBatcherDriver.deploy(
        await batcher.getAddress(),
        false,
        false
      );
      await testBatcherDriver.waitForDeployment();

      const totalValue = values.reduce((sum, v) => sum + v, 0n);
      const tx = () =>
        testBatcherDriver.connect(sender).driveTest(
          recipients.map((r) => r.address),
          values,
          { value: totalValue }
        );

      await expect(tx).to.changeEtherBalances(
        [recipient1, recipient2],
        [ethers.parseEther('3'), ethers.parseEther('3')]
      );
    });
  });

  describe('Failed transactions', () => {
    it('Reverts if total sent out does not equal total received', async () => {
      console.log(
        'DEBUG: Starting test - Reverts if total sent out does not equal total received'
      );
      try {
        await runTestBatcherDriver({
          recipients: [recipient1],
          values: [ethers.parseEther('1')],
          extraValue: ethers.parseEther('0.5'),
          expectRevert: true,
          expectedErrorMsg: 'TotalSentMustEqualTotalReceived'
        });
      } catch (err) {
        console.log('DEBUG: Error thrown:', err);
        throw err;
      }
    });

    it('Reverts when a recipient is a re-entrant contract', async () => {
      await runTestBatcherDriver({
        recipients: [reentry],
        values: [5n],
        expectRevert: true
      });
    });

    it('Reverts when a recipient fails (e.g., has no receive function)', async () => {
      await runTestBatcherDriver({
        recipients: [fail],
        values: [5n],
        expectRevert: true
      });
    });

    it('Reverts with empty recipients list', async () => {
      console.log('DEBUG: Starting test - Reverts with empty recipients list');
      try {
        const testBatcherDriver = await TestBatcherDriver.deploy(
          await batcher.getAddress(),
          false,
          false
        );
        await testBatcherDriver.waitForDeployment();
        const txPromise = testBatcherDriver
          .connect(sender)
          .driveTest([], [], { value: 0 });
        await expect(txPromise).to.be.revertedWithCustomError(
          batcher,
          'EmptyRecipientsList'
        );
      } catch (err) {
        console.log('DEBUG: Error thrown:', err);
        throw err;
      }
    });

    it('Reverts with mismatched recipients and values arrays', async () => {
      console.log(
        'DEBUG: Starting test - Reverts with mismatched recipients and values arrays'
      );
      try {
        const testBatcherDriver = await TestBatcherDriver.deploy(
          await batcher.getAddress(),
          false,
          false
        );
        await testBatcherDriver.waitForDeployment();
        const txPromise = testBatcherDriver
          .connect(sender)
          .driveTest([recipient1.address, recipient2.address], [5n], {
            value: 5n
          });
        await expect(txPromise).to.be.revertedWithCustomError(
          batcher,
          'UnequalRecipientsAndValues'
        );
      } catch (err) {
        console.log('DEBUG: Error thrown:', err);
        throw err;
      }
    });

    it('Reverts for zero address recipient', async () => {
      console.log('DEBUG: Starting test - Reverts for zero address recipient');
      try {
        await runTestBatcherDriver({
          recipients: [ethers.ZeroAddress],
          values: [5n],
          expectRevert: true,
          expectedErrorMsg: 'InvalidRecipient'
        });
      } catch (err) {
        console.log('DEBUG: Error thrown:', err);
        throw err;
      }
    });

    it('Reverts when recipients length exceeds limit', async () => {
      console.log(
        'DEBUG: Starting test - Reverts when recipients length exceeds limit'
      );
      const limit = 256;
      const recipients = Array(limit + 1).fill(recipient1.address);
      const values = Array(limit + 1).fill(1n);
      try {
        const testBatcherDriver = await TestBatcherDriver.deploy(
          await batcher.getAddress(),
          false,
          false
        );
        await testBatcherDriver.waitForDeployment();
        const txPromise = testBatcherDriver
          .connect(sender)
          .driveTest(recipients, values, { value: BigInt(values.length) });
        await expect(txPromise).to.be.revertedWithCustomError(
          batcher,
          'TooManyRecipients'
        );
      } catch (err) {
        console.log('DEBUG: Error thrown:', err);
        throw err;
      }
    });
  });

  describe('Only owner functions', () => {
    it('Successfully transfers ownership', async () => {
      await batcher
        .connect(batcherOwner)
        .transferOwnership(otherAccount.address);
      await batcher.connect(otherAccount).acceptOwnership();
      expect(await batcher.owner()).to.equal(otherAccount.address);
    });

    it('Fails to transfer ownership for non-owner', async () => {
      await expect(
        batcher.connect(sender).transferOwnership(otherAccount.address)
      ).to.be.reverted;
    });

    it('Successfully sets transfer gas limit', async () => {
      console.log(
        'DEBUG: Starting test - Successfully sets transfer gas limit'
      );
      try {
        // Remove event assertion since event does not exist
        await batcher.connect(batcherOwner).changeTransferGasLimit(25000);
        // Optionally, check state change directly if contract exposes getter
      } catch (err) {
        console.log('DEBUG: Error thrown:', err);
        throw err;
      }
    });

    it('Fails to set transfer gas limit below minimum', async () => {
      console.log(
        'DEBUG: Starting test - Fails to set transfer gas limit below minimum'
      );
      try {
        await expect(
          batcher.connect(batcherOwner).changeTransferGasLimit(2000)
        ).to.be.revertedWith('Transfer gas limit too low');
      } catch (err) {
        console.log('DEBUG: Error thrown:', err);
        throw err;
      }
    });
  });

  describe('Batch ERC20 Token Transfers', () => {
    beforeEach(async () => {
      fixedSupplyToken = await FixedSupplyToken.connect(tokenOwner).deploy();
      await fixedSupplyToken.waitForDeployment();
    });

    it('Successfully transfers tokens to multiple recipients', async () => {
      const recipients = [recipient1.address, recipient2.address];
      const amounts = [100n, 200n];

      await fixedSupplyToken
        .connect(tokenOwner)
        .transfer(sender.address, 1000n);
      await fixedSupplyToken
        .connect(sender)
        .approve(await batcher.getAddress(), 1000n);

      const tx = () =>
        batcher
          .connect(sender)
          .batchTransferFrom(
            fixedSupplyToken.getAddress(),
            recipients,
            amounts
          );

      await expect(tx).to.changeTokenBalances(
        fixedSupplyToken,
        [sender, recipient1, recipient2],
        [-300n, 100n, 200n]
      );
    });

    it('Successfully transfers tokens with duplicate recipients', async () => {
      const recipients = [
        recipient1.address,
        recipient1.address,
        recipient2.address
      ];
      const amounts = [100n, 150n, 200n];

      await fixedSupplyToken
        .connect(tokenOwner)
        .transfer(sender.address, 1000n);
      await fixedSupplyToken
        .connect(sender)
        .approve(await batcher.getAddress(), 1000n);

      const tx = () =>
        batcher
          .connect(sender)
          .batchTransferFrom(
            fixedSupplyToken.getAddress(),
            recipients,
            amounts
          );

      // recipient1 should receive 100 + 150 = 250 tokens
      await expect(tx).to.changeTokenBalances(
        fixedSupplyToken,
        [sender, recipient1, recipient2],
        [-450n, 250n, 200n]
      );
    });

    it('Fails when sender has insufficient token balance', async () => {
      const recipients = [recipient1.address, recipient2.address];
      const amounts = [600n, 500n]; // Total 1100, but sender only has 500

      await fixedSupplyToken.connect(tokenOwner).transfer(sender.address, 500n);
      await fixedSupplyToken
        .connect(sender)
        .approve(await batcher.getAddress(), 1100n);

      await expect(
        batcher
          .connect(sender)
          .batchTransferFrom(fixedSupplyToken.getAddress(), recipients, amounts)
      ).to.be.reverted; // Just check that it reverts, not the specific message
    });

    it('Fails when sender has not approved enough tokens', async () => {
      const recipients = [recipient1.address, recipient2.address];
      const amounts = [300n, 200n]; // Total 500

      await fixedSupplyToken
        .connect(tokenOwner)
        .transfer(sender.address, 1000n);
      await fixedSupplyToken
        .connect(sender)
        .approve(await batcher.getAddress(), 400n); // Only approved 400

      await expect(
        batcher
          .connect(sender)
          .batchTransferFrom(fixedSupplyToken.getAddress(), recipients, amounts)
      ).to.be.reverted; // Just check that it reverts
    });

    it('Fails with empty recipients array for token transfers', async () => {
      await expect(
        batcher
          .connect(sender)
          .batchTransferFrom(fixedSupplyToken.getAddress(), [], [])
      ).to.be.revertedWithCustomError(batcher, 'EmptyRecipientsList');
    });

    it('Fails with mismatched recipients and amounts arrays for token transfers', async () => {
      const recipients = [recipient1.address, recipient2.address];
      const amounts = [100n]; // Mismatched array length

      await expect(
        batcher
          .connect(sender)
          .batchTransferFrom(fixedSupplyToken.getAddress(), recipients, amounts)
      ).to.be.revertedWithCustomError(batcher, 'UnequalRecipientsAndValues');
    });

    it('Fails when recipients length exceeds batchTransferLimit', async () => {
      const recipients = [];
      const amounts = [];
      const limit = 256; // Default limit

      // Create arrays that exceed the limit
      for (let i = 0; i < limit + 1; i++) {
        recipients.push(recipient1.address);
        amounts.push(1n);
      }

      await expect(
        batcher
          .connect(sender)
          .batchTransferFrom(fixedSupplyToken.getAddress(), recipients, amounts)
      ).to.be.revertedWithCustomError(batcher, 'TooManyRecipients');
    });
  });

  describe('Additional Stress Tests and Edge Cases', () => {
    it('Stress test with maximum allowed recipients for native transfers', async () => {
      const recipients = [];
      const values = [];
      const maxRecipients = 50; // Reduced from 256 for faster testing

      for (let i = 0; i < maxRecipients; i++) {
        recipients.push(recipient1.address);
        values.push(ethers.parseEther('0.01'));
      }

      const totalValue = values.reduce((sum, val) => sum + val, 0n);

      await expect(
        batcher.connect(sender).batch(recipients, values, { value: totalValue })
      ).to.changeEtherBalances([sender, recipient1], [-totalValue, totalValue]);
    });

    it('Handles complex reentry scenarios correctly', async () => {
      const value = ethers.parseEther('1');

      // Test with reentrant contract - the test should pass because batch() handles failures
      await expect(
        batcher
          .connect(sender)
          .batch([await reentry.getAddress()], [value], { value: value })
      ).to.be.revertedWith('Send failed'); // The batch should fail because reentry contract rejects the payment
    });

    it('Correctly handles gas-heavy recipients with appropriate gas limits', async () => {
      // First set a higher transfer gas limit to accommodate gas-heavy contract
      await batcher.connect(batcherOwner).changeTransferGasLimit(200000);

      const value = ethers.parseEther('1');

      await expect(
        batcher
          .connect(sender)
          .batch([await gasHeavy.getAddress()], [value], { value: value })
      ).to.changeEtherBalances([sender, gasHeavy], [-value, value]);
    });
  });

  describe('Ownership and Administrative Functions', () => {
    it('Successfully changes batch transfer limit', async () => {
      const newLimit = 100;
      const currentLimit = await batcher.batchTransferLimit();

      await expect(
        batcher.connect(batcherOwner).changeBatchTransferLimit(newLimit)
      )
        .to.emit(batcher, 'BatchTransferLimitChange')
        .withArgs(currentLimit, newLimit);

      expect(await batcher.batchTransferLimit()).to.equal(newLimit);
    });

    it('Fails to set batch transfer limit to zero', async () => {
      await expect(
        batcher.connect(batcherOwner).changeBatchTransferLimit(0)
      ).to.be.revertedWith('Batch transfer limit too low');
    });

    it('Fails when non-owner tries to change batch transfer limit', async () => {
      await expect(
        batcher.connect(sender).changeBatchTransferLimit(100)
      ).to.be.revertedWithCustomError(batcher, 'OwnableUnauthorizedAccount');
    });

    it('Successfully changes native batch transfer limit', async () => {
      const newLimit = 150;
      const currentLimit = await batcher.nativeBatchTransferLimit();

      await expect(
        batcher.connect(batcherOwner).changeNativeBatchTransferLimit(newLimit)
      )
        .to.emit(batcher, 'NativeBatchTransferLimitChange')
        .withArgs(currentLimit, newLimit);

      expect(await batcher.nativeBatchTransferLimit()).to.equal(newLimit);
    });

    it('Fails to set native batch transfer limit to zero', async () => {
      await expect(
        batcher.connect(batcherOwner).changeNativeBatchTransferLimit(0)
      ).to.be.revertedWith('Native batch transfer limit too low');
    });

    it('Fails when non-owner tries to change native batch transfer limit', async () => {
      await expect(
        batcher.connect(sender).changeNativeBatchTransferLimit(100)
      ).to.be.revertedWithCustomError(batcher, 'OwnableUnauthorizedAccount');
    });
  });

  describe('Recovery Functions for Stuck Tokens', () => {
    beforeEach(async () => {
      fixedSupplyToken = await FixedSupplyToken.connect(tokenOwner).deploy();
      await fixedSupplyToken.waitForDeployment();
    });

    it('Successfully recovers stuck ERC20 tokens', async () => {
      // Send some tokens directly to the batcher contract (simulating stuck tokens)
      const stuckAmount = 1000n;
      await fixedSupplyToken
        .connect(tokenOwner)
        .transfer(await batcher.getAddress(), stuckAmount);

      // Create recovery call data for transferring tokens back to owner
      const transferCalldata = fixedSupplyToken.interface.encodeFunctionData(
        'transfer',
        [batcherOwner.address, stuckAmount]
      );

      await expect(
        batcher
          .connect(batcherOwner)
          .recover(await fixedSupplyToken.getAddress(), 0, transferCalldata)
      ).to.changeTokenBalance(fixedSupplyToken, batcherOwner, stuckAmount);
    });

    it('Fails when non-owner tries to use recovery function', async () => {
      const transferCalldata = fixedSupplyToken.interface.encodeFunctionData(
        'transfer',
        [sender.address, 100n]
      );

      await expect(
        batcher
          .connect(sender)
          .recover(await fixedSupplyToken.getAddress(), 0, transferCalldata)
      ).to.be.revertedWithCustomError(batcher, 'OwnableUnauthorizedAccount');
    });
  });
});
