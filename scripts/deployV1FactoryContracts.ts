import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
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
    gasPrice: feeData.gasPrice!.mul('2'),
    gasLimit: 4500000
  };
  const walletTxCount = await walletDeployer.getTransactionCount();

  console.log('Deploying wallet contracts....');
  console.log('Wallet Tx Count: ', walletTxCount);
  const walletSelfTransactions = 2 - walletTxCount;
  for (let i = 0; i < walletSelfTransactions; i++) {
    const tx = await walletDeployer.sendTransaction({
      to: walletDeployer.address,
      value: ethers.utils.parseEther('0'),
      gasPrice: gasParams.gasPrice
    });
    await tx.wait();
    console.log(`Self transaction with nonce: ${i} complete`);
  }

  // const walletImplementationContractName = 'AvaxcWalletSimple';
  const walletFactoryContractName = 'WalletFactory';

  // const WalletImplementation = await ethers.getContractFactory(
  //   walletImplementationContractName,
  //   walletDeployer
  // );
  // const walletImplementation = await WalletImplementation.deploy(gasParams);
  // await walletImplementation.deployed();
  // output.walletImplementation = walletImplementation.address;
  // console.log(
  //   `${walletImplementationContractName} deployed at ` +
  //     walletImplementation.address
  // );

  const WalletFactory = await ethers.getContractFactory(
    walletFactoryContractName,
    walletDeployer
  );
  const walletFactory = await WalletFactory.deploy(
    '0xE8E847cf573Fc8ed75621660A36AffD18c543d7E',
    gasParams
  );
  await walletFactory.deployed();
  output.walletFactory = walletFactory.address;
  console.log(
    `${walletFactoryContractName} deployed at ` + walletFactory.address
  );

  const forwarderTxCount = await forwarderDeployer.getTransactionCount();

  console.log('Deploying forwarder contracts....');
  console.log('Forwarder Tx Count: ', forwarderTxCount);
  const forwarderSelfTransactions = 234 - forwarderTxCount;

  for (let i = 0; i < forwarderSelfTransactions; i++) {
    const tx = await forwarderDeployer.sendTransaction({
      to: forwarderDeployer.address,
      value: ethers.utils.parseEther('0'),
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

  //await walletImplementation.deployTransaction.wait(10);
  await walletFactory.deployTransaction.wait(10);
  await forwarderImplementation.deployTransaction.wait(10);
  await forwarderFactory.deployTransaction.wait(10);

  console.log('Done waiting, verifying');
  // await verifyContract(
  //   walletImplementationContractName,
  //   walletImplementation.address,
  //   []
  // );
  await verifyContract('WalletFactory', walletFactory.address, [
    '0xE8E847cf573Fc8ed75621660A36AffD18c543d7E'
  ]);

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
