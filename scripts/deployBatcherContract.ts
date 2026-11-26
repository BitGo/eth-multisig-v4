import hre, { ethers } from 'hardhat';
import { Contract } from 'ethers';
import { logger, waitAndVerify, checkSufficientBalance } from '../deployUtils';
import fs from 'fs';
import { setupBigBlocksForBatcherDeployment } from './enableBigBlocks';
import { isBigBlocksSupported } from '../config/bigBlocksConfig';
import {
  TxOverrides,
  resolveGasOverrides,
  getChainGasConfig
} from '../config/batcherDeployGasConfig';

async function main() {
  logger.step('🚀 Starting Batcher Contract Deployment 🚀');

  const output = {
    batcher: ''
  };

  const contractName = 'Batcher';
  const transferGasLimit = 200000; // uint256

  // --- 1. Setup & Configuration ---
  logger.step('1. Setting up deployer and network information...');

  // Deployer identity is fixed: the PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT
  // secret, loaded directly instead of via an ethers.getSigners() index lookup
  // (same pattern as scripts/transferBatcherOwnership.ts). Selection is
  // fail-closed: a missing or unfunded key aborts the script. Signer balances
  // are attacker-influenceable (anyone can send funds to an address) and must
  // never determine the deployer/owner identity.
  // Accepts the key with or without the 0x prefix (hardhat config accepts both).
  const deployerKeyRaw = (
    process.env.PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT || ''
  ).trim();
  const deployerKey = deployerKeyRaw.startsWith('0x')
    ? deployerKeyRaw
    : `0x${deployerKeyRaw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(deployerKey)) {
    throw new Error(
      'PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT is required and must be a valid secp256k1 private key'
    );
  }
  const batcherDeployer = new ethers.Wallet(deployerKey, ethers.provider);
  const address = await batcherDeployer.getAddress();

  if ((await ethers.provider.getBalance(address)) === 0n) {
    throw new Error(
      `Batcher deployer ${address} has zero balance; aborting instead of falling ` +
        'back to another signer. Fund the PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT account and retry.'
    );
  }

  // Diagnostic only: log configured signer balances; never used for selection.
  const signers = await ethers.getSigners();
  const signerInfos = await Promise.all(
    signers.map(async (s, i) => {
      const addr = await s.getAddress();
      const bal = await ethers.provider.getBalance(addr);
      return { index: i, addr, balance: bal };
    })
  );
  logger.info('Available signer balances (diagnostics only):');
  signerInfos.forEach((s) =>
    logger.info(
      `  [${s.index}] ${s.addr} balance=${ethers.formatEther(s.balance)} ETH${
        s.addr === address ? ' (deployer)' : ''
      }`
    )
  );

  const { chainId } = await ethers.provider.getNetwork();

  logger.info(`Network: ${hre.network.name} (Chain ID: ${chainId})`);
  logger.info(`Deployer Address: ${address}`);

  // --- 1.5. BigBlocks Setup ---
  logger.step('1.5. Checking and setting up BigBlocks if supported...');

  if (isBigBlocksSupported(Number(chainId))) {
    logger.info('🔍 BigBlocks supported on this chain, checking status...');
    try {
      await setupBigBlocksForBatcherDeployment(Number(chainId), address);
      logger.success('✅ BigBlocks setup completed successfully');
    } catch (error) {
      logger.warn('⚠️ BigBlocks setup failed after all retry attempts');
      logger.warn(`BigBlocks error: ${(error as Error).message}`);
      logger.info('📦 Continuing with deployment without BigBlocks...');
    }
  } else {
    logger.info('ℹ️ BigBlocks not supported on this chain, skipping...');
  }

  // --- 2. Gas Parameter Handling ---
  logger.step('2. Configuring gas parameters for the transaction...');

  const feeData = await ethers.provider.getFeeData();

  // --- 3. Contract Deployment ---
  logger.step("3. Deploying the 'Batcher' contract...");
  const Batcher = await ethers.getContractFactory(
    contractName,
    batcherDeployer
  );

  const erc20BatchLimit = 256;
  const nativeBatchLimit = 256;

  // Build the unsigned deploy transaction so we can pre-estimate gas before deploying.
  const deployTxReq = await Batcher.getDeployTransaction(
    transferGasLimit,
    erc20BatchLimit,
    nativeBatchLimit
  );

  const gasConfig = getChainGasConfig(Number(chainId));
  logger.info(`Gas strategy for chain ${chainId}: '${gasConfig.strategy}'`);

  const gasOverrides = await resolveGasOverrides(
    Number(chainId),
    feeData,
    batcherDeployer,
    deployTxReq,
    address
  );

  if (gasOverrides) {
    logger.info(
      `Gas overrides resolved: ${JSON.stringify(gasOverrides, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v
      )}`
    );
  } else {
    logger.info('Gas overrides: none (Hardhat auto-detection)');
  }

  // --- 3.5. Balance Check ---
  logger.step('3.5. Checking deployer balance before deployment...');

  // Estimate gas and effective price to verify the deployer has sufficient funds.
  // For chains with manual-gas overrides the estimate reuses the resolved gasLimit;
  // for default chains Hardhat auto-estimates here.
  const gasEstimate = await batcherDeployer.estimateGas({
    ...deployTxReq,
    from: address,
    ...gasOverrides
  });

  // Use the effective gas price from overrides when present, otherwise fall back to
  // the live fee data (maxFeePerGas represents the worst-case spend for EIP-1559 txs).
  let gasPrice: bigint;
  if (gasOverrides?.gasPrice) {
    gasPrice = gasOverrides.gasPrice;
  } else if (gasOverrides?.maxFeePerGas) {
    gasPrice = gasOverrides.maxFeePerGas;
  } else {
    gasPrice = feeData.gasPrice ?? 1_000_000_000n;
  }

  const estimatedCost = gasEstimate * gasPrice;

  await checkSufficientBalance(address, estimatedCost, 'Batcher');

  let batcher: Contract;
  if (gasOverrides) {
    batcher = (await Batcher.deploy(
      transferGasLimit,
      erc20BatchLimit,
      nativeBatchLimit,
      gasOverrides
    )) as unknown as Contract; // ethers v6
  } else {
    batcher = (await Batcher.deploy(
      transferGasLimit,
      erc20BatchLimit,
      nativeBatchLimit
    )) as unknown as Contract; // ethers v6
  }

  await batcher.waitForDeployment(); // ethers v6
  const contractAddress = batcher.target as string; // ethers v6
  const deployTx = batcher.deploymentTransaction();

  output.batcher = contractAddress;
  logger.success(`'Batcher' deployed successfully!`);
  logger.info(`     - Contract Address: ${contractAddress}`);
  logger.info(`     - Transaction Hash: ${deployTx?.hash}`);

  fs.writeFileSync('output.json', JSON.stringify(output, null, 2));
  logger.success(`Deployment address saved to output.json`);

  // --- 4. Contract Verification ---
  logger.step('4. Preparing for contract verification...');

  const constructorArgs = [transferGasLimit, erc20BatchLimit, nativeBatchLimit];
  await waitAndVerify(hre, batcher, contractName, constructorArgs.map(String));

  logger.step('🎉 Deployment and Verification Complete! 🎉');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
