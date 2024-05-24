import { ethers } from 'hardhat';
const hre = require('hardhat');
const fs = require('fs');

async function main() {
  const output = {
    walletImplementation: '',
    walletFactory: ''
  };

  const feeData = await ethers.provider.getFeeData();
  const gasParams = {
    gasPrice: feeData.gasPrice!
  };
  const [deployer] = await ethers.getSigners();
  const selfTransactions = 2;

  for (let i = 0; i < selfTransactions; i++) {
    const tx = await deployer.sendTransaction({
      to: deployer.address,
      value: ethers.utils.parseEther('0'),
      gasPrice: gasParams.gasPrice
    });
    await tx.wait();
    console.log(`Self transaction with nonce: ${i} complete`);
  }

  const walletImplementationContractName = 'WalletSimple';
  const walletFactoryContractName = 'WalletFactory';

  const WalletImplementation = await ethers.getContractFactory(
    walletImplementationContractName
  );
  const walletImplementation = await WalletImplementation.deploy(gasParams);
  await walletImplementation.deployed();
  output.walletImplementation = walletImplementation.address;
  console.log(
    `${walletImplementationContractName} deployed at ` +
      walletImplementation.address
  );

  const WalletFactory = await ethers.getContractFactory(
    walletFactoryContractName
  );
  const walletFactory = await WalletFactory.deploy(
    walletImplementation.address,
    gasParams
  );
  await walletFactory.deployed();
  output.walletFactory = walletFactory.address;
  console.log(
    `${walletFactoryContractName} deployed at ` + walletFactory.address
  );

  fs.writeFileSync('output.json', JSON.stringify(output));

  // Wait 5 minutes. It takes some time for the etherscan backend to index the transaction and store the contract.
  console.log('Waiting for 5 minutes before verifying....');
  await new Promise((r) => setTimeout(r, 1000 * 300));

  // We have to wait for a minimum of 10 block confirmations before we can call the etherscan api to verify

  await walletImplementation.deployTransaction.wait(10);
  await walletFactory.deployTransaction.wait(10);

  console.log('Done waiting, verifying');
  await verifyContract(
    walletImplementationContractName,
    walletImplementation.address,
    []
  );
  await verifyContract('WalletFactory', walletFactory.address, [
    walletImplementation.address
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
