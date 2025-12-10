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

  const signers = await ethers.getSigners();
  const walletDeployer = signers[0];
  const forwarderDeployer = signers[1] || signers[0]; // Use first signer if second is not available

  const gasParams = {
    gasPrice: (feeData.gasPrice ?? 0n) * 2n // Use bigint arithmetic for ethers v6
  };
  const walletTxCount = await ethers.provider.getTransactionCount(
    await walletDeployer.getAddress()
  ); // Updated for ethers v6

  console.log('Deploying wallet contracts....');
  console.log('Wallet Tx Count: ', walletTxCount);
  const walletSelfTransactions = 2 - walletTxCount;
  for (let i = 0; i < walletSelfTransactions; i++) {
    const tx = await walletDeployer.sendTransaction({
      to: await walletDeployer.getAddress(),
      value: ethers.parseEther('0'), // ethers v6
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
  await walletImplementation.waitForDeployment(); // ethers v6
  output.walletImplementation = await walletImplementation.getAddress(); // ethers v6
  console.log(
    `${walletImplementationContractName} deployed at ` +
      (await walletImplementation.getAddress()) // ethers v6
  );

  const WalletFactory = await ethers.getContractFactory(
    walletFactoryContractName,
    walletDeployer
  );
  const walletFactory = await WalletFactory.deploy(
    await walletImplementation.getAddress(), // ethers v6
    gasParams
  );
  await walletFactory.waitForDeployment(); // ethers v6
  output.walletFactory = await walletFactory.getAddress(); // ethers v6
  console.log(
    `${walletFactoryContractName} deployed at ` +
      (await walletFactory.getAddress()) // ethers v6
  );

  const forwarderTxCount = await ethers.provider.getTransactionCount(
    await forwarderDeployer.getAddress()
  ); // ethers v6

  console.log('Deploying forwarder contracts....');
  console.log('Forwarder Tx Count: ', forwarderTxCount);
  const forwarderSelfTransactions = 234 - forwarderTxCount;

  for (let i = 0; i < forwarderSelfTransactions; i++) {
    const tx = await forwarderDeployer.sendTransaction({
      to: await forwarderDeployer.getAddress(),
      value: ethers.parseEther('0'), // ethers v6
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
  await forwarderImplementation.waitForDeployment(); // ethers v6
  output.forwarderImplementation = await forwarderImplementation.getAddress(); // ethers v6

  console.log(
    `${forwarderImplementationContractName} deployed at ` +
      (await forwarderImplementation.getAddress()) // ethers v6
  );

  const ForwarderFactory = await ethers.getContractFactory(
    forwarderFactoryContractName,
    forwarderDeployer
  );

  const forwarderFactory = await ForwarderFactory.deploy(
    await forwarderImplementation.getAddress(), // ethers v6
    gasParams
  );

  await forwarderFactory.waitForDeployment(); // ethers v6
  output.forwarderFactory = await forwarderFactory.getAddress(); // ethers v6
  console.log(
    `${forwarderFactoryContractName} deployed at ` +
      (await forwarderFactory.getAddress()) // ethers v6
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
    await walletImplementation.getAddress(), // ethers v6
    []
  );
  await verifyContract('WalletFactory', await walletFactory.getAddress(), [
    await walletImplementation.getAddress() // ethers v6
  ]);

  await verifyContract(
    forwarderImplementationContractName,
    await forwarderImplementation.getAddress(), // ethers v6
    []
  );

  await verifyContract(
    'ForwarderFactory',
    await forwarderFactory.getAddress(),
    [
      // Updated for ethers v6
      await forwarderImplementation.getAddress() // Updated for ethers v6
    ]
  );

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
