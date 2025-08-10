
const { ethers } = require('hardhat');
const helpers = require('../helpers');
const crypto = require('crypto');

const assertVMException = (err, expectedErrMsg) => {
  if (!/revert|VM Exception/.test(err.message)) throw err;
  if (expectedErrMsg) {
    if (!err.message.includes(expectedErrMsg)) throw err;
  }
};


const createForwarderFromWallet = async (wallet, autoFlush = true) => {
  const parent = wallet.address;
  const salt = ethers.hexlify(crypto.randomBytes(20));
  const inputSalt = ethers.zeroPadValue(salt, 32);
  const Forwarder = await ethers.getContractFactory('Forwarder');
  const forwarderContract = await Forwarder.deploy([]);
  await forwarderContract.waitForDeployment();
  const ForwarderFactory = await ethers.getContractFactory('ForwarderFactory');
  const forwarderFactory = await ForwarderFactory.deploy(await forwarderContract.getAddress());
  await forwarderFactory.waitForDeployment();
  
  return {
    forwarderAddress: null, // Will be set when created
    create: async () =>
      executeCreateForwarder(
        forwarderFactory,
        inputSalt,
        parent,
        autoFlush
      )
  };
};


const executeCreateForwarder = async (
  factory,
  inputSalt,
  parent,
  autoFlush = true
) => {
  // Create the forwarder and get the address from the event
  const tx = await factory.createForwarder(parent, inputSalt, autoFlush, autoFlush);
  const receipt = await tx.wait();
  
  // Find the ForwarderCreated event to get the new forwarder address
  const event = receipt.logs.find(log => {
      try {
          const parsedLog = factory.interface.parseLog(log);
          return parsedLog?.name === 'ForwarderCreated';
      } catch (e) {
          return false;
      }
  });
  
  if (!event) {
      throw new Error('ForwarderCreated event not found in transaction logs');
  }
  
  const parsedEvent = factory.interface.parseLog(event);
  const forwarderAddress = parsedEvent.args.newForwarderAddress;
  
  const Forwarder = await ethers.getContractFactory('Forwarder');
  return Forwarder.attach(forwarderAddress);
};


const createWalletFactory = async (WalletSimple) => {
  const walletContract = await WalletSimple.deploy([]);
  await walletContract.waitForDeployment();
  const WalletFactory = await ethers.getContractFactory('WalletFactory');
  const walletFactory = await WalletFactory.deploy(await walletContract.getAddress());
  await walletFactory.waitForDeployment();
  return {
    implementationAddress: await walletContract.getAddress(),
    factory: walletFactory
  };
};


const createRecoveryWalletFactory = async () => {
  const RecoveryWalletSimple = await ethers.getContractFactory('RecoveryWalletSimple');
  const walletContract = await RecoveryWalletSimple.deploy([]);
  await walletContract.waitForDeployment();
  const RecoveryWalletFactory = await ethers.getContractFactory('RecoveryWalletFactory');
  const walletFactory = await RecoveryWalletFactory.deploy(await walletContract.getAddress());
  await walletFactory.waitForDeployment();
  return {
    implementationAddress: await walletContract.getAddress(),
    factory: walletFactory
  };
};


const createRecoveryWalletHelper = async (creator, signers) => {
  const salt = '0x1234';
  const { factory, implementationAddress } = await createRecoveryWalletFactory();
  const inputSalt = ethers.zeroPadValue(salt, 32);
  
  // Create the wallet and get the address from the event
  const tx = await factory.createWallet(signers, inputSalt);
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
  
  const RecoveryWalletSimple = await ethers.getContractFactory('RecoveryWalletSimple');
  return RecoveryWalletSimple.attach(walletAddress);
};


const createWalletHelper = async (WalletSimple, creator, signers) => {
  const salt = '0x1234';
  const { factory, implementationAddress } = await createWalletFactory(WalletSimple);
  const inputSalt = ethers.zeroPadValue(salt, 32);
  
  // Create the wallet and get the address from the event
  const tx = await factory.createWallet(signers, inputSalt);
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
  
  return WalletSimple.attach(walletAddress);
};


const getBalanceInWei = async (address) => {
  return await ethers.provider.getBalance(address);
};


const calculateFutureExpireTime = (seconds) => {
  return Math.floor(Date.now() / 1000) + seconds;
};


const isSigner = async function getSigners(wallet, signer) {
  return await wallet.signers(signer);
};

exports.assertVMException = assertVMException;
exports.createForwarderFromWallet = createForwarderFromWallet;
exports.executeCreateForwarder = executeCreateForwarder;
exports.createWalletFactory = createWalletFactory;
exports.createRecoveryWalletFactory = createRecoveryWalletFactory;
exports.createWalletHelper = createWalletHelper;
exports.createRecoveryWalletHelper = createRecoveryWalletHelper;
exports.getBalanceInWei = getBalanceInWei;
exports.calculateFutureExpireTime = calculateFutureExpireTime;
exports.isSigner = isSigner;
