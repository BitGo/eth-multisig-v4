import hre, { ethers } from 'hardhat';
import { Contract } from 'ethers';
import { logger, waitAndVerify } from '../deployUtils';
import fs from 'fs';


async function main() {
  logger.step('🚀 Starting Batcher Contract Deployment 🚀');

  const output = {
    batcher: ''
  };

  const contractName = 'Batcher';
  const transferGasLimit = '200000';

  // --- 1. Setup & Configuration ---
  logger.step('1. Setting up deployer and network information...');

  const signers = await ethers.getSigners();
  if (signers.length < 3) {
    const errorMsg = `Found ${signers.length} Signers, expected 3. Cannot deploy batcher contract, please update the script`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  const batcherDeployer = signers[2];
  const address = await batcherDeployer.getAddress();
  const { chainId } = await ethers.provider.getNetwork();

  logger.info(`Network: ${hre.network.name} (Chain ID: ${chainId})`);
  logger.info(`Deployer Address: ${address}`);

  // --- 2. Gas Parameter Handling ---
  logger.step('2. Configuring gas parameters for the transaction...');
  logger.info(`Using default gas parameters provided by Ethers v6 for this network.`);

  // --- 3. Contract Deployment ---
  logger.step("3. Deploying the 'Batcher' contract...");
  const Batcher = await ethers.getContractFactory(
    contractName,
    batcherDeployer
  );

  const erc20BatchLimit = 256;
  const nativeBatchLimit = 256;
  const constructorArgs = [transferGasLimit, erc20BatchLimit, nativeBatchLimit] as const;

  const batcher = await Batcher.deploy(...constructorArgs);
  
  await batcher.deployed(); // ethers v5
  output.batcher = batcher.address; // ethers v5
  const deployTx = batcher.deploymentTransaction();

  logger.success(`'Batcher' deployed successfully!`);
  logger.info(`     - Contract Address: ${output.batcher}`);
  logger.info(`     - Transaction Hash: ${deployTx?.hash}`);

  fs.writeFileSync('output.json', JSON.stringify(output, null, 2));
  logger.success(`Deployment address saved to output.json`);

  // --- 4. Contract Verification ---
  logger.step('4. Preparing for contract verification...');
  
  await waitAndVerify(hre, batcher as unknown as Contract, contractName, [...constructorArgs].map(String));

  logger.step('🎉 Deployment and Verification Complete! 🎉');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
