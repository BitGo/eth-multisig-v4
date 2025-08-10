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
    gasPrice: feeData.gasPrice.mul(2) // Use BigNumber arithmetic for ethers v5
  };
  const walletTxCount = await ethers.provider.getTransactionCount(walletDeployer.address); // Updated for ethers v6

  console.log('Deploying wallet contracts....');
  console.log('Wallet Tx Count: ', walletTxCount);
  const walletSelfTransactions = 2 - walletTxCount;
  for (let i = 0; i < walletSelfTransactions; i++) {
    const tx = await walletDeployer.sendTransaction({
      to: walletDeployer.address,
      value: ethers.utils.parseEther('0'), // ethers v5
      gasPrice: gasParams.gasPrice
    });
    await tx.wait();
    console.log(`Self transaction with nonce: ${i} complete`);
  }

  const walletImplementationContractName = 'WalletSimple';
  const walletFactoryContractName = 'WalletFactory';

  const WalletImplementation = await ethers.getContractFactory(
    walletImplementationContractName,
    walletDeployer
  );
  const walletImplementation = await WalletImplementation.deploy(gasParams);
  await walletImplementation.deployed(); // ethers v5
  output.walletImplementation = walletImplementation.address; // ethers v5
  console.log(
    `${walletImplementationContractName} deployed at ` +
      walletImplementation.address // ethers v5
  );

  const WalletFactory = await ethers.getContractFactory(
    walletFactoryContractName,
    walletDeployer
  );
  const walletFactory = await WalletFactory.deploy(
    walletImplementation.address, // ethers v5
    gasParams
  );
  await walletFactory.deployed(); // ethers v5
  output.walletFactory = walletFactory.address; // ethers v5
  console.log(
    `${walletFactoryContractName} deployed at ` + walletFactory.address // ethers v5
  );

  const forwarderTxCount = await ethers.provider.getTransactionCount(forwarderDeployer.address); // ethers v5 (no change needed)

  console.log('Deploying forwarder contracts....');
  console.log('Forwarder Tx Count: ', forwarderTxCount);
  const forwarderSelfTransactions = 234 - forwarderTxCount;

  for (let i = 0; i < forwarderSelfTransactions; i++) {
    const tx = await forwarderDeployer.sendTransaction({
      to: forwarderDeployer.address,
      value: ethers.utils.parseEther('0'), // ethers v5
      gasPrice: gasParams.gasPrice
    });
    await tx.wait();
    console.log(`Self transaction with nonce: ${i} complete`);
  }

  const forwarderImplementationContractName = 'Forwarder';
  const forwarderFactoryContractName = 'ForwarderFactory';

  const ForwarderImplementation = await ethers.getContractFactory(
    forwarderImplementationContractName,
    forwarderDeployer
  );

  const forwarderImplementation = await ForwarderImplementation.deploy(
    gasParams
  );
  await forwarderImplementation.deployed(); // ethers v5
  output.forwarderImplementation = forwarderImplementation.address; // ethers v5

  console.log(
    `${forwarderImplementationContractName} deployed at ` +
      forwarderImplementation.address // ethers v5
  );

  const ForwarderFactory = await ethers.getContractFactory(
    forwarderFactoryContractName,
    forwarderDeployer
  );

  const forwarderFactory = await ForwarderFactory.deploy(
    forwarderImplementation.address, // ethers v5
    gasParams
  );

  await forwarderFactory.deployed(); // ethers v5
  output.forwarderFactory = forwarderFactory.address; // ethers v5
  console.log(
    `${forwarderFactoryContractName} deployed at ` + forwarderFactory.address // ethers v5
  );

  fs.writeFileSync('output.json', JSON.stringify(output));

  // Wait 5 minutes. It takes some time for the etherscan backend to index the transaction and store the contract.
  console.log('Waiting for 5 minutes before verifying....');
  await new Promise((r) => setTimeout(r, 1000 * 300));

  // We have to wait for a minimum of 10 block confirmations before we can call the etherscan api to verify
  // In ethers v6, we get deployment transactions differently
  const walletImplTx = walletImplementation.deploymentTransaction();
  const walletFactoryTx = walletFactory.deploymentTransaction();
  const forwarderImplTx = forwarderImplementation.deploymentTransaction();
  const forwarderFactoryTx = forwarderFactory.deploymentTransaction();

  if (walletImplTx) await walletImplTx.wait(10);
  if (walletFactoryTx) await walletFactoryTx.wait(10);
  if (forwarderImplTx) await forwarderImplTx.wait(10);
  if (forwarderFactoryTx) await forwarderFactoryTx.wait(10);

  console.log('Done waiting, verifying');
  await verifyContract(
    walletImplementationContractName,
    walletImplementation.address, // ethers v5
    []
  );
  await verifyContract('WalletFactory', walletFactory.address, [
    walletImplementation.address // ethers v5
  ]);

  await verifyContract(
    forwarderImplementationContractName,
    forwarderImplementation.address, // ethers v5
    []
  );

  await verifyContract('ForwarderFactory', await forwarderFactory.getAddress(), [ // Updated for ethers v6
    await forwarderImplementation.getAddress() // Updated for ethers v6
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
