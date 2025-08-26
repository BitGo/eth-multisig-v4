import hre, { ethers } from 'hardhat';
import { Contract } from 'ethers';
import { logger, waitAndVerify } from '../deployUtils';
import fs from 'fs';
import { enableBigBlocks } from './enableBigBlocks';
import {
  getBigBlocksConfigBatcher,
  isBigBlocksSupportedBatcher
} from '../config/bigBlocksConfig';

// Minimal tx override type compatible with ethers v6
type TxOverrides = {
  gasLimit?: number;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
};

// Add interface for JSON RPC response
interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: boolean;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Check if BigBlocks is already enabled using RPC call
 */
async function checkBigBlocksStatus(
  userAddress: string,
  chainId: number
): Promise<boolean> {
  const config = getBigBlocksConfigBatcher(chainId);
  if (!config) {
    throw new Error(`Chain with ID ${chainId} is not supported for BigBlocks.`);
  }

  logger.info(
    `🔍 Checking BigBlocks status for ${userAddress} on ${config.name}...`
  );
  logger.info(`📡 Making RPC call to: ${config.rpcUrl}`);

  try {
    const requestBody = {
      jsonrpc: '2.0',
      id: 0,
      method: 'eth_usingBigBlocks',
      params: [userAddress]
    };

    const res = await fetch(config.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status} ${await res.text()}`);
    }

    const result = (await res.json()) as JsonRpcResponse;
    logger.info(`📥 RPC Response: ${JSON.stringify(result)}`);

    if (result.error) {
      throw new Error(
        `RPC Error: ${result.error.code} - ${result.error.message}`
      );
    }

    return result.result || false;
  } catch (err) {
    logger.error(
      `❌ Failed to fetch BigBlocks status: ${(err as Error).message}`
    );
    throw err;
  }
}

/**
 * Enable BigBlocks with retry mechanism
 */
async function enableBigBlocksWithRetry(
  config: any,
  chainId: number,
  maxRetries: number = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(
        `🔄 Attempt ${attempt}/${maxRetries}: Enabling BigBlocks on ${config.name}`
      );
      await enableBigBlocks(config.envKey, true, chainId);
      logger.success(
        `✅ BigBlocks enabled on ${config.name} (attempt ${attempt})`
      );
      return;
    } catch (error) {
      logger.warn(
        `❌ Attempt ${attempt}/${maxRetries} failed: ${
          (error as Error).message
        }`
      );

      if (attempt === maxRetries) {
        throw new Error(
          `Failed to enable BigBlocks on ${
            config.name
          } after ${maxRetries} attempts: ${(error as Error).message}`
        );
      }

      // Wait 2 seconds before retry
      logger.info('⏳ Waiting 2 seconds before retry...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

/**
 * Setup BigBlocks for a specific chain
 */
async function setupBigBlocks(
  chainId: number,
  deployerAddress: string
): Promise<void> {
  const config = getBigBlocksConfigBatcher(chainId);
  if (!config) return;

  if (!config.envKey) {
    throw new Error(`Please set the private key for ${config.name}.`);
  }

  logger.info(`🔧 Checking BigBlocks status on ${config.name}...`);

  // Check if BigBlocks is already enabled
  const isEnabled = await checkBigBlocksStatus(deployerAddress, chainId);

  if (isEnabled) {
    logger.success(`✅ BigBlocks already enabled on ${config.name}`);
    return;
  }

  logger.info(
    `🔄 BigBlocks not enabled on ${config.name}, attempting to enable...`
  );

  // Try to enable BigBlocks with retry mechanism
  await enableBigBlocksWithRetry(config, chainId, 3);

  // Verify it was enabled successfully
  logger.info(`🔍 Verifying BigBlocks was enabled...`);
  const isEnabledAfter = await checkBigBlocksStatus(deployerAddress, chainId);

  if (!isEnabledAfter) {
    throw new Error(
      `BigBlocks enable command succeeded but verification failed on ${config.name}`
    );
  }

  logger.success(
    `🎉 BigBlocks successfully verified as enabled on ${config.name}`
  );
}

async function main() {
  logger.step('🚀 Starting Batcher Contract Deployment 🚀');

  const output = {
    batcher: ''
  };

  const contractName = 'Batcher';
  const transferGasLimit = 200000; // uint256

  // --- 1. Setup & Configuration ---
  logger.step('1. Setting up deployer and network information...');

  const signers = await ethers.getSigners();
  if (signers.length < 1) {
    throw new Error('No signers available');
  }

  // New: dynamic deployer selection (env override / fallback / funded account)
  const desiredIndex = process.env.BATCHER_DEPLOYER_INDEX
    ? Number(process.env.BATCHER_DEPLOYER_INDEX)
    : 2; // legacy default
  let batcherDeployer = signers[desiredIndex] || signers[signers.length - 1];

  // Gather balances to ensure we pick a funded account (EOA must have funds)
  const signerInfos = await Promise.all(
    signers.map(async (s, i) => {
      const addr = await s.getAddress();
      const bal = await ethers.provider.getBalance(addr);
      return { index: i, addr, balance: bal };
    })
  );

  if (
    !batcherDeployer ||
    (await ethers.provider.getBalance(await batcherDeployer.getAddress())) ===
      0n
  ) {
    const funded = signerInfos
      .filter((x) => x.balance > 0n)
      .sort((a, b) => (b.balance > a.balance ? 1 : -1))[0];
    if (!funded) {
      logger.error(
        'No funded signer available for batcher deployment. Aborting.'
      );
      throw new Error('No funded signer');
    }
    batcherDeployer = signers[funded.index];
    logger.warn(
      `Selected alternative funded signer index=${funded.index} address=${
        funded.addr
      } (balance=${ethers.formatEther(funded.balance)})`
    );
  }

  logger.info('Available signer balances:');
  signerInfos.forEach((s) =>
    logger.info(
      `  [${s.index}] ${s.addr} balance=${ethers.formatEther(s.balance)} ETH${
        s.index === desiredIndex ? ' (desired)' : ''
      }${s.addr === (batcherDeployer as any)?._address ? ' (using)' : ''}`
    )
  );

  const address = await batcherDeployer.getAddress();
  const { chainId } = await ethers.provider.getNetwork();

  logger.info(`Network: ${hre.network.name} (Chain ID: ${chainId})`);
  logger.info(`Deployer Address: ${address}`);

  // --- 1.5. BigBlocks Setup ---
  logger.step('1.5. Checking and setting up BigBlocks if supported...');

  if (isBigBlocksSupportedBatcher(Number(chainId))) {
    logger.info('🔍 BigBlocks supported on this chain, checking status...');
    try {
      await setupBigBlocks(Number(chainId), address);
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

  // Maintain the legacy behavior: selectively set fee overrides for specific chains
  const eip1559Chains = [10143, 480, 4801, 1946, 1868, 1114, 1112, 1111, 50312];
  const feeData = await ethers.provider.getFeeData();
  let gasOverrides: TxOverrides | undefined = undefined;

  // --- 3. Contract Deployment ---
  logger.step("3. Deploying the 'Batcher' contract...");
  const Batcher = await ethers.getContractFactory(
    contractName,
    batcherDeployer
  );

  const erc20BatchLimit = 256;
  const nativeBatchLimit = 256;

  // Build the deploy transaction request for estimation
  const deployTxReq = await Batcher.getDeployTransaction(
    transferGasLimit,
    erc20BatchLimit,
    nativeBatchLimit
  );

  if (Number(chainId) === 50312 || Number(chainId) === 5031) {
    // Somnia testnet & mainnet quirks: ensure non-zero priority fee; estimate gas and cap to block gas limit
    const latestBlock = await ethers.provider.getBlock('latest');
    const has1559 =
      feeData.maxFeePerGas != null && feeData.maxPriorityFeePerGas != null;

    if (has1559) {
      const minPriority = 1_000_000_000n; // 1 gwei
      const priority =
        (feeData.maxPriorityFeePerGas ?? 0n) > 0n
          ? (feeData.maxPriorityFeePerGas as bigint)
          : minPriority;
      const base = feeData.maxFeePerGas ?? 0n;
      const maxFee = base > priority * 2n ? base : priority * 2n;
      gasOverrides = { maxFeePerGas: maxFee, maxPriorityFeePerGas: priority };
      logger.info(
        `EIP-1559 params (Somnia): maxFeePerGas=${String(
          maxFee
        )}, maxPriorityFeePerGas=${String(priority)}`
      );
    } else {
      const fallbackGasPrice = feeData.gasPrice ?? 6_000_000_000n; // 6 gwei fallback
      gasOverrides = { gasPrice: fallbackGasPrice };
      logger.info(
        `Legacy gasPrice (Somnia): gasPrice=${String(fallbackGasPrice)}`
      );
    }

    // Estimate gas for contract creation
    const est = await batcherDeployer.estimateGas({
      ...deployTxReq,
      from: address,
      ...gasOverrides
    });

    const estWithBuffer = (est * 120n) / 100n; // +20%
    let chosenGasLimit = Number(estWithBuffer);
    if (latestBlock?.gasLimit) {
      const blockLimit = Number(latestBlock.gasLimit);
      chosenGasLimit = Math.min(chosenGasLimit, Math.floor(blockLimit * 0.95));
    }
    gasOverrides.gasLimit = chosenGasLimit;
    logger.info(
      `Estimated gas: ${est.toString()}, using gasLimit=${chosenGasLimit}`
    );
  } else if (eip1559Chains.includes(Number(chainId))) {
    gasOverrides = {
      maxFeePerGas: feeData.maxFeePerGas ?? feeData.gasPrice ?? undefined,
      maxPriorityFeePerGas:
        feeData.maxPriorityFeePerGas ?? feeData.gasPrice ?? undefined
    };
    logger.info(
      `Gas params set: maxFeePerGas=${String(
        gasOverrides.maxFeePerGas ?? ''
      )}, maxPriorityFeePerGas=${String(
        gasOverrides.maxPriorityFeePerGas ?? ''
      )}, gasLimit=<auto>`
    );
  } else {
    logger.info(`Using default gas parameters for this network.`);
  }

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
