import hre, { ethers } from 'hardhat';
import { BigNumber, Contract } from 'ethers';
import { Overrides } from '@ethersproject/contracts';
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
  const chainId = await signers[0].getChainId();

  logger.info(`Network: ${hre.network.name} (Chain ID: ${chainId})`);
  logger.info(`Deployer Address: ${address}`);

  // --- 2. Gas Parameter Handling ---
  logger.step('2. Configuring gas parameters for the transaction...');
  let gasParams: Overrides | undefined = undefined;
  const eip1559Chains = [10143, 480, 4801, 1946, 1868, 1114, 1112, 1111, 50312];

  if (eip1559Chains.includes(chainId)) {
    logger.info(`EIP-1559 chain detected. Fetching custom fee data...`);
    const feeData = await ethers.provider.getFeeData();
    gasParams = {
      maxFeePerGas: feeData.maxFeePerGas ?? feeData.gasPrice ?? undefined,
      maxPriorityFeePerGas:
        feeData.maxPriorityFeePerGas ?? feeData.gasPrice ?? undefined,
      gasLimit:
        chainId === 50312
          ? BigNumber.from('5000000')
          : BigNumber.from('3000000')
    };
    logger.info(
      `Gas params set: maxFeePerGas=${gasParams.maxFeePerGas}, maxPriorityFeePerGas=${gasParams.maxPriorityFeePerGas}`
    );
  } else {
    logger.info(`Using default gas parameters for this network.`);
  }

  // --- 3. Contract Deployment ---
  logger.step("3. Deploying the 'Batcher' contract...");
  const Batcher = await ethers.getContractFactory(
    contractName,
    batcherDeployer
  );

  const erc20BatchLimit = 256;
  const nativeBatchLimit = 256;
  const constructorArgs = [transferGasLimit, erc20BatchLimit, nativeBatchLimit];

  let batcher: Contract;
  const deployTxArgs = [...constructorArgs];
  if (gasParams) {
    deployTxArgs.push(gasParams);
  }

  batcher = await Batcher.deploy(...deployTxArgs);
  await batcher.deployed();

  output.batcher = batcher.address;

  logger.success(`'Batcher' deployed successfully!`);
  logger.info(`     - Contract Address: ${batcher.address}`);
  logger.info(`     - Transaction Hash: ${batcher.deployTransaction.hash}`);

  fs.writeFileSync('output.json', JSON.stringify(output, null, 2));
  logger.success(`Deployment address saved to output.json`);

  // --- 4. Contract Verification ---
  logger.step('4. Preparing for contract verification...');
  await waitAndVerify(hre, batcher, contractName, constructorArgs);

  logger.step('🎉 Deployment and Verification Complete! 🎉');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
