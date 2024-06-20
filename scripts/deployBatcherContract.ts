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

  const [walletDeployer, forwarderDeployer] = await ethers.getSigners();

  const gasParams = {
    gasPrice: feeData.gasPrice!.mul('2')
  };

  const forwarderImplementationContractName = 'Forwarder';
  const forwarderFactoryContractName = 'Batcher';

  const ForwarderImplementation = await ethers.getContractFactory(
    forwarderImplementationContractName,
    forwarderDeployer
  );

  const forwarderImplementation = await ForwarderImplementation.deploy(
    gasParams
  );
  await forwarderImplementation.deployed();
  output.forwarderImplementation = forwarderImplementation.address;

  console.log(
    `${forwarderImplementationContractName} deployed at ` +
      forwarderImplementation.address
  );

  const ForwarderFactory = await ethers.getContractFactory(
    forwarderFactoryContractName,
    forwarderDeployer
  );

  const forwarderFactory = await ForwarderFactory.deploy(
    forwarderImplementation.address,
    gasParams
  );

  await forwarderFactory.deployed();
  output.forwarderFactory = forwarderFactory.address;
  console.log(
    `${forwarderFactoryContractName} deployed at ` + forwarderFactory.address
  );

  fs.writeFileSync('output.json', JSON.stringify(output));

  // Wait 5 minutes. It takes some time for the etherscan backend to index the transaction and store the contract.
  console.log('Waiting for 5 minutes before verifying....');
  await new Promise((r) => setTimeout(r, 1000 * 300));

  // We have to wait for a minimum of 10 block confirmations before we can call the etherscan api to verify
  await forwarderFactory.deployTransaction.wait(10);

  console.log('Done waiting, verifying');

  await verifyContract(
    forwarderImplementationContractName,
    forwarderImplementation.address,
    []
  );

  await verifyContract('ForwarderFactory', forwarderFactory.address, [
    forwarderImplementation.address
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
