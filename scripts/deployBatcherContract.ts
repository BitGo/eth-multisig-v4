import { ethers } from 'hardhat';
const hre = require('hardhat');
const fs = require('fs');

async function main() {
  const output = {
    walletImplementation: '',
    walletFactory: '',
    forwarderImplementation: '',
    forwarderFactory: '',
    batcher: ''
  };

  const contractName = 'Batcher';
  const transferGasLimit = '200000';

  const Batcher = await ethers.getContractFactory(contractName);
  const batcher = await Batcher.deploy(transferGasLimit);
  await batcher.deployed();
  output.batcher = batcher.address;
  console.log('Batcher deployed at ' + batcher.address);

  fs.writeFileSync('output.json', JSON.stringify(output));

  // Wait 5 minutes. It takes some time for the etherscan backend to index the transaction and store the contract.
  console.log('Waiting for 5 minutes before verifying.....');
  await new Promise((r) => setTimeout(r, 1000 * 300));

  console.log('Done waiting, verifying');
  await verifyContract(contractName, batcher.address, [transferGasLimit]);
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
