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

  const [deployer] = await ethers.getSigners();

  let walletImplementationContractName = '';
  let walletFactoryContractName = 'WalletFactory';
  const chainId = await deployer.getChainId();
  switch (await deployer.getChainId()) {
    // https://chainlist.org/
    //eth
    case 1:
    //hteth
    case 5:
      walletImplementationContractName = 'WalletSimple';
      break;
    //matic
    case 137:
    //tmatic
    case 80001:
      walletImplementationContractName = 'PolygonWalletSimple';
      break;
    // bsc
    case 56:
    // tbsc
    case 97:
      walletImplementationContractName = 'RecoveryWalletSimple';
      walletFactoryContractName = 'RecoveryWalletFactory';
      break;
  }

  console.log(
    'Deployed wallet contract called: ' + walletImplementationContractName
  );

  const WalletSimple = await ethers.getContractFactory(
    walletImplementationContractName
  );
  const walletSimple = await WalletSimple.deploy();
  await walletSimple.deployed();
  output.walletImplementation = walletSimple.address;
  console.log('WalletSimple deployed at ' + walletSimple.address);

  const WalletFactory = await ethers.getContractFactory(
    walletFactoryContractName
  );
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

  // Wait 5 minutes. It takes some time for the etherscan backend to index the transaction and store the contract.
  console.log('Waiting for 5 minutes before verifying.....');
  await new Promise((r) => setTimeout(r, 1000 * 300));

  // We have to wait for a minimum of 10 block confirmations before we can call the etherscan api to verify
  await walletSimple.deployTransaction.wait(10);
  await walletFactory.deployTransaction.wait(10);
  await forwarder.deployTransaction.wait(10);
  await forwarderFactory.deployTransaction.wait(10);

  console.log('Done waiting, verifying');
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
