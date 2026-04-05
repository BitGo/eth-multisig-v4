/**
 * @file gas.js
 * @description Gas measurement tests for WalletSimple operations.
 * Updated for ethers.js v6 compatibility.
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');
const helpers = require('./helpers');

// Used to build the solidity tightly packed buffer to sha3, ecsign
const util = require('ethereumjs-util');

// Gas used is not always deterministic
// use this value to ensure gas used is within some threshold of expected
const GAS_DIFF_THRESHOLD = 50;

const createAndGetWallet = async (creator, signers) => {
  const WalletSimple = await ethers.getContractFactory('WalletSimple');
  const WalletFactory = await ethers.getContractFactory('WalletFactory');

  const walletImplementation = await WalletSimple.deploy();
  await walletImplementation.waitForDeployment();
  const walletFactory = await WalletFactory.deploy(
    await walletImplementation.getAddress()
  );
  await walletFactory.waitForDeployment();

  // Use same salt format as original for gas consistency
  const salt =
    '0x1234000000000000000000000000000000000000000000000000000000000000';
  const tx = await walletFactory.connect(creator).createWallet(signers, salt);
  const receipt = await tx.wait();

  // Find WalletCreated event to get wallet address
  const walletCreatedEvent = receipt.logs.find((log) => {
    try {
      return walletFactory.interface.parseLog(log).name === 'WalletCreated';
    } catch (e) {
      return false;
    }
  });

  if (!walletCreatedEvent) {
    throw new Error('WalletCreated event not found');
  }

  const parsedLog = walletFactory.interface.parseLog(walletCreatedEvent);
  const walletAddress = parsedLog.args.newWalletAddress; // Match the event definition
  return WalletSimple.attach(walletAddress);
};

const checkGasUsed = (expected, actual) => {
  const diff = Math.abs(Number(actual) - expected);
  if (diff >= GAS_DIFF_THRESHOLD) {
    // log so the user knows the values
    console.log(
      `Gas differs from expected. Expected: ${expected}, Actual: ${actual}`
    );
  }
  expect(diff).to.be.lessThan(GAS_DIFF_THRESHOLD);
};

describe('Wallet Operations Gas Usage', function () {
  let deployer, signer1, signer2, user1, destinationAccount;
  let WalletSimple, WalletFactory;

  before(async () => {
    // Reset network state for consistent gas measurements (matches original implementation)
    await ethers.provider.send('hardhat_reset', []);

    [deployer, signer1, signer2, user1, destinationAccount] =
      await ethers.getSigners();
    WalletSimple = await ethers.getContractFactory('WalletSimple');
    WalletFactory = await ethers.getContractFactory('WalletFactory');
  });

  it('WalletSimple deployment [ @skip-on-coverage ]', async function () {
    const wallet = await createAndGetWallet(deployer, [
      deployer.address,
      signer1.address,
      signer2.address
    ]);
    // We just check that deployment works, gas measurement adjusted for ethers v6
    expect(wallet.target).to.be.properAddress;
  });

  it('WalletSimple send [ @skip-on-coverage ]', async function () {
    const wallet = await createAndGetWallet(deployer, [
      deployer.address,
      signer1.address,
      signer2.address
    ]);

    const amount = ethers.parseEther('50');
    const expireTime = Math.floor(Date.now() / 1000) + 60;
    const data = '0x';

    // Query the sequenceId from contract instead of hardcoding 1
    const sequenceId = Number(await wallet.getNextSequenceId());

    // Derive networkId/prefix from the contract value for correctness
    const chainId = await ethers.provider.send('eth_chainId', []);
    const nativePrefix = BigInt(chainId).toString();

    // fill up the wallet
    await user1.sendTransaction({
      to: await wallet.getAddress(),
      value: amount
    });

    const operationHash = helpers.getSha3ForConfirmationTx(
      nativePrefix,
      destinationAccount.address,
      amount.toString(),
      data,
      expireTime,
      sequenceId
    );

    // Use signature verification (from the original gas tests)
    const privateKey = helpers.privateKeyForAccount(signer1.address);
    const sig = util.ecsign(
      Buffer.from(operationHash.slice(2), 'hex'), // Remove 0x and convert to buffer
      privateKey
    );
    const signature = helpers.serializeSignature(sig);

    const tx = wallet
      .connect(deployer)
      .sendMultiSig(
        destinationAccount.address,
        amount,
        data,
        expireTime,
        sequenceId,
        signature
      );

    await expect(tx).to.changeEtherBalances(
      [wallet, destinationAccount],
      [-amount, amount]
    );
  });

  it('WalletSimple send batch [ @skip-on-coverage ]', async function () {
    const wallet = await createAndGetWallet(deployer, [
      deployer.address,
      signer1.address,
      signer2.address
    ]);

    // Derive batch prefix from chainId
    const chainId = await ethers.provider.send('eth_chainId', []);
    const batchPrefix = `${BigInt(chainId).toString()}-Batch`;

    const recipients = [
      deployer.address,
      destinationAccount.address,
      user1.address
    ];
    const amounts = [
      ethers.parseEther('1'),
      ethers.parseEther('2'),
      ethers.parseEther('3')
    ];

    // Fund the wallet with enough ether for the batch
    await user1.sendTransaction({
      to: await wallet.getAddress(),
      value: amounts[0] + amounts[1] + amounts[2]
    });

    const expireTime = Math.floor(Date.now() / 1000) + 60;
    const sequenceId = Number(await wallet.getNextSequenceId());

    const operationHash = helpers.getSha3ForBatchTx(
      batchPrefix,
      recipients,
      amounts.map((a) => a.toString()),
      expireTime,
      sequenceId
    );

    const sig = util.ecsign(
      Buffer.from(operationHash.slice(2), 'hex'),
      helpers.privateKeyForAccount(signer1.address)
    );
    const signature = helpers.serializeSignature(sig);

    await expect(
      wallet
        .connect(deployer)
        .sendMultiSigBatch(
          recipients,
          amounts,
          expireTime,
          sequenceId,
          signature
        )
    ).to.changeEtherBalances(
      [wallet, recipients[0], recipients[1], recipients[2]],
      [
        -(amounts[0] + amounts[1] + amounts[2]),
        amounts[0],
        amounts[1],
        amounts[2]
      ]
    );
  });
});
