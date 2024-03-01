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

  const feeData = await ethers.provider.getFeeData();
  const gasParams = {
    gasPrice: feeData.gasPrice
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
    case 17000:
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
    // arbeth
    case 42161:
    // tarbeth
    case 421614:
      walletImplementationContractName = 'ArbethWalletSimple';
      break;
    // opeth
    case 10:
    // topeth
    case 11155420:
      walletImplementationContractName = 'OpethWalletSimple';
      break;
    // zketh
    case 324:
    // tzketh
    case 300:
      walletImplementationContractName = 'ZkethWalletSimple';
      break;
  }

  console.log(
    'Deployed wallet contract called: ' + walletImplementationContractName
  );

  const WalletSimple = await ethers.getContractFactory(
    walletImplementationContractName
  );
  const walletSimple = await WalletSimple.deploy(gasParams);
  await walletSimple.deployed();
  output.walletImplementation = walletSimple.address;
  console.log('WalletSimple deployed at ' + walletSimple.address);

  const WalletFactory = await ethers.getContractFactory(
    walletFactoryContractName
  );
  const walletFactory = await WalletFactory.deploy(
    walletSimple.address,
    gasParams
  );
  await walletFactory.deployed();
  output.walletFactory = walletFactory.address;
  console.log('WalletFactory deployed at ' + walletFactory.address);

  // In case of new coins like arbeth, opeth, zketh, we need to deploy new forwarder and forwarder factory i.e.
  // ForwarderV4 and ForwarderFactoryV4.
  // If we have to deploy contracts for the older coins like eth, avax, polygon, we need to deploy Forwarder and ForwarderFactory
  const Forwarder = await ethers.getContractFactory('ForwarderV4');
  const forwarder = await Forwarder.deploy(gasParams);
  await forwarder.deployed();
  output.forwarderImplementation = forwarder.address;
  console.log('ForwarderV4 deployed at ' + forwarder.address);

  const ForwarderFactory = await ethers.getContractFactory(
    'ForwarderFactoryV4'
  );
  const forwarderFactory = await ForwarderFactory.deploy(
    forwarder.address,
    gasParams
  );
  await forwarderFactory.deployed();
  output.forwarderFactory = forwarderFactory.address;
  console.log('ForwarderFactoryV4 deployed at ' + forwarderFactory.address);

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
  await verifyContract(
    walletImplementationContractName,
    walletSimple.address,
    [],
    `contracts/coins/${walletImplementationContractName}.sol:${walletImplementationContractName}`
  );
  await verifyContract('WalletFactory', walletFactory.address, [
    walletSimple.address
  ]);
  await verifyContract('ForwarderV4', forwarder.address, []);
  await verifyContract('ForwarderFactoryV4', forwarderFactory.address, [
    forwarder.address
  ]);
  console.log('Contracts verified');
}

async function verifyContract(
  contractName: string,
  contractAddress: string,
  constructorArguments: string[],
  contract?: string
) {
  try {
    const verifyContractArgs: {
      address: string;
      constructorArguments: string[];
      contract?: string;
    } = {
      address: contractAddress,
      constructorArguments: constructorArguments
    };

    if (contract) {
      verifyContractArgs.contract = contract;
    }

    await hre.run('verify:verify', verifyContractArgs);
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
