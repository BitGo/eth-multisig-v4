import { ethers } from 'hardhat';
const hre = require('hardhat');
const fs = require('fs');

async function main() {
  const output = {
    walletImplementation: '',
    walletFactory: '',
    forwarderImplementation: '',
    forwarderFactory: ''
  };

  const WalletSimple = await ethers.getContractFactory('WalletSimple');
  const walletSimple = await WalletSimple.deploy();
  await walletSimple.deployed();
  output.walletImplementation = walletSimple.address;
  console.log('WalletSimple deployed at ' + walletSimple.address);

  const WalletFactory = await ethers.getContractFactory('WalletFactory');
  const walletFactory = await WalletFactory.deploy(walletSimple.address);
  await walletFactory.deployed();
  output.walletFactory = walletFactory.address;
  console.log('WalletFactory deployed at ' + walletFactory.address);

  const Forwarder = await ethers.getContractFactory('Forwarder');
  const forwarder = await Forwarder.deploy();
  await forwarder.deployed();
  output.forwarderImplementation = forwarder.address;
  console.log('Forwarder deployed at ' + forwarder.address);

  const ForwarderFactory = await ethers.getContractFactory('ForwarderFactory');
  const forwarderFactory = await ForwarderFactory.deploy(forwarder.address);
  await forwarderFactory.deployed();
  output.forwarderFactory = forwarderFactory.address;
  console.log('ForwarderFactory deployed at ' + forwarderFactory.address);

  fs.writeFileSync('output.json', JSON.stringify(output));

  // We have to wait for a minimum of 10 block confirmations before we can call the etherscan api to verify
  console.log('Waiting for 10 confirmations.....');

  // Add sleep here so it doesn't hammer RPC for block requests
  await new Promise(r => setTimeout(r, 60000));

  await walletSimple.deployTransaction.wait(10);
  await walletFactory.deployTransaction.wait(10);
  await forwarder.deployTransaction.wait(10);
  await forwarderFactory.deployTransaction.wait(10);

  console.log('Contracts confirmed on chain, verifying');
  await verifyContract('WalletSimple', walletSimple.address, []);
  await verifyContract('WalletFactory', walletFactory.address, [
    walletSimple.address
  ]);
  await verifyContract('Forwarder', forwarder.address, []);
  await verifyContract('ForwarderFactory', forwarderFactory.address, [
    forwarder.address
  ]);
  console.log('Contracts verified');
}

async function verifyContract(
  contractName: string,
  contractAddress: string,
  constructorArguments: string[]
) {
  try {
    await hre.run('verify:verify', {
      address: contractAddress,
      constructorArguments: constructorArguments
    });
  } catch (e) {
    // @ts-ignore
    // We get a failure API response if the source code has already been uploaded, don't throw in this case.
    if (!e.message.includes('Reason: Already Verified')) {
      throw e;
    }
  }
  console.log(`Verified ${contractName} on Etherscan!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
