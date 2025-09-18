import hre, { ethers } from 'hardhat';
import fs from 'fs';
import { BaseContract, getCreateAddress } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { verifyOnCustomEtherscan } from './scripts/customContractVerifier';

const OUTPUT_FILE = 'output.json';

// Balance check configuration
/**
 * Safety multiplier for balance checks.
 * A value of 150n with divisor 100n creates a 1.5x safety buffer.
 * This ensures we have 50% more funds than the estimated gas cost.
 */
export const BALANCE_SAFETY_MULTIPLIER = 150n; // 1.5x safety buffer (150/100 = 1.5)
export const BALANCE_SAFETY_DIVISOR = 100n;

/**
 * Calculates the required amount with safety buffer applied.
 * @param estimatedCost - The estimated gas cost in wei
 * @returns The required amount with safety buffer applied
 */
export function applyBalanceSafetyBuffer(estimatedCost: bigint): bigint {
  return (estimatedCost * BALANCE_SAFETY_MULTIPLIER) / BALANCE_SAFETY_DIVISOR;
}

export const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  config: (msg: string) => console.log(`[CONFIG] ${msg}`),
  success: (msg: string) => console.log(`✅ [SUCCESS] ${msg}`),
  error: (msg: string) => console.error(`❌ [ERROR] ${msg}`),
  warn: (msg: string) => console.warn(`⚠️ [WARN] ${msg}`),
  step: (msg: string) => console.log(`\n--- ${msg} ---`)
};

/**
 * Checks if the deployer has sufficient balance for the deployment.
 * Requires 1.5x the estimated gas cost to provide a safety buffer.
 */
export async function checkSufficientBalance(
  deployerAddress: string,
  estimatedGasCost: bigint,
  contractName: string = 'contract'
): Promise<void> {
  const balance = await ethers.provider.getBalance(deployerAddress);
  const requiredAmount = applyBalanceSafetyBuffer(estimatedGasCost);

  logger.info(`💰 Balance check for ${contractName} deployment:`);
  logger.info(`  Deployer balance: ${ethers.formatEther(balance)} ETH`);
  logger.info(
    `  Estimated gas cost: ${ethers.formatEther(estimatedGasCost)} ETH`
  );
  logger.info(
    `  Required (1.5x buffer): ${ethers.formatEther(requiredAmount)} ETH`
  );

  if (balance < requiredAmount) {
    const shortfall = requiredAmount - balance;
    logger.error(`Insufficient funds for ${contractName} deployment!`);
    logger.error(`  Shortfall: ${ethers.formatEther(shortfall)} ETH`);
    logger.error(`  Please fund the deployer account: ${deployerAddress}`);
    throw new Error(
      `Insufficient funds: need ${ethers.formatEther(
        requiredAmount
      )} ETH, have ${ethers.formatEther(balance)} ETH`
    );
  }

  logger.success(
    `✅ Sufficient balance confirmed for ${contractName} deployment`
  );
}

/**
 * Checks balance before individual contract deployment.
 * Estimates gas for a typical contract deployment transaction.
 */
export async function checkIndividualContractBalance(
  deployerAddress: string,
  contractName: string,
  gasOverrides?: any
): Promise<void> {
  try {
    // Get current fee data
    const feeData = await ethers.provider.getFeeData();

    // Estimate typical contract deployment gas (fallback if we can't estimate precisely)
    const estimatedGas = 500000n; // 500k gas - reasonable estimate for contract deployment

    // Calculate gas price
    let gasPrice: bigint;
    if (gasOverrides?.gasPrice) {
      gasPrice = gasOverrides.gasPrice;
    } else if (gasOverrides?.maxFeePerGas) {
      gasPrice = gasOverrides.maxFeePerGas;
    } else {
      gasPrice = feeData.gasPrice || 1_000_000_000n; // 1 gwei fallback
    }

    const estimatedCost = estimatedGas * gasPrice;

    // Check balance with 1.5x buffer
    await checkSufficientBalance(deployerAddress, estimatedCost, contractName);
  } catch (error) {
    logger.warn(
      `⚠️ Could not perform precise balance check for ${contractName}: ${
        (error as Error).message
      }`
    );
    logger.info(
      `🔄 Proceeding with deployment - will fail fast if insufficient funds`
    );
  }
}

export type DeploymentAddresses = {
  walletImplementation?: string;
  walletFactory?: string;
  forwarderImplementation?: string;
  forwarderFactory?: string;
};

/**
 * Attempts to load contract address from output file or by predicting nonce.
 * If neither found, it deploys the contract using the given deploy function.
 */
export async function deployIfNeededAtNonce(
  recordedAddress: string | undefined,
  expectedNonce: number,
  deployerAddress: string,
  contractName: string,
  deployFn: () => Promise<string>,
  gasOverrides?: any
): Promise<string> {
  const predictedAddress = getCreateAddress({
    from: deployerAddress,
    nonce: expectedNonce
  });

  logger.info(
    `🔮 Expecting ${contractName} at nonce ${expectedNonce} -> ${predictedAddress}`
  );

  // 1. Check output.json record
  if (recordedAddress) {
    logger.info(`📁 Found ${contractName} in output.json: ${recordedAddress}`);
    if (await isContractDeployed(recordedAddress)) {
      logger.success(
        `${contractName} already deployed on-chain at ${recordedAddress}. Skipping deployment.`
      );
      return recordedAddress;
    } else {
      logger.warn(
        `${contractName} in output.json not found on-chain. Will fallback to nonce logic.`
      );
    }
  }

  // 2. Check if already deployed at predicted address
  if (await isContractDeployed(predictedAddress)) {
    logger.success(
      `${contractName} already deployed on-chain at predicted address: ${predictedAddress}. Skipping deployment.`
    );
    return predictedAddress;
  }

  // 3. Check if nonce already advanced
  const currentNonce = await ethers.provider.getTransactionCount(
    deployerAddress
  );
  if (currentNonce > expectedNonce) {
    logger.warn(
      `⏩ Skipping deployment of ${contractName}. Current nonce ${currentNonce} is already past expected ${expectedNonce}. Will assume contract exists at ${predictedAddress}`
    );
    return predictedAddress;
  }

  // 4. If currentNonce doesn't match expectedNonce exactly, throw
  if (currentNonce !== expectedNonce) {
    const errorMsg = `Cannot deploy ${contractName}: current nonce is ${currentNonce}, expected ${expectedNonce}.`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 5. Balance check before deployment
  await checkIndividualContractBalance(
    deployerAddress,
    contractName,
    gasOverrides
  );

  // 6. Deploy
  logger.info(`🚀 Deploying ${contractName} at nonce ${expectedNonce}...`);
  return await deployFn();
}

export async function isContractDeployed(address: string) {
  const code = await ethers.provider.getCode(address);
  return code && code !== '0x';
}

export function loadOutput(): DeploymentAddresses {
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    }
  } catch (err) {
    logger.error(`Could not load output file: ${err}`);
  }
  return {};
}

export function saveOutput(output: DeploymentAddresses) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
}

/**
 * Waits for contract confirmation and then verifies it on a block explorer.
 * It first tries the standard Hardhat verifier and falls back to a custom verifier if the first one fails.
 * The entire process is wrapped in a retry loop.
 */
export async function waitAndVerify(
  hre: HardhatRuntimeEnvironment,
  contract: BaseContract,
  contractName: string,
  constructorArguments: string[] = []
) {
  if (!hre) {
    const errorMsg = 'Hardhat Runtime Environment (hre) is not defined.';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  const confirmationCount = 5;
  logger.info(
    `Waiting for ${confirmationCount} block confirmations for ${contractName}...`
  );
  const artifact = await hre.artifacts.readArtifact(contractName);
  const verificationString = `${artifact.sourceName}:${artifact.contractName}`;
  console.log(`Verification string: ${verificationString}`);

  const deployTx = contract.deploymentTransaction();
  await deployTx?.wait(confirmationCount);

  logger.success(
    `Contract ${contractName} confirmed on the network after ${confirmationCount} confirmations.`
  );
  const contractAddress = await contract.getAddress();
  logger.success(`Contract confirmed on the network at ${contractAddress}.`);

  const maxRetries = 20;
  const retryDelay = 180000; // 180 seconds

  for (let i = 0; i < maxRetries; i++) {
    logger.info(`Verification attempt #${i + 1} for ${contractName}...`);
    try {
      // --- Primary Attempt: Standard Verifier ---
      logger.info('Attempting verification with standard Hardhat verifier...');
      await hre.run('verify:verify', {
        address: contractAddress,
        constructorArguments: constructorArguments,
        contract: verificationString
      });
      logger.success('Standard verification successful!');
      return; // Success, exit the loop.
    } catch (standardError: any) {
      logger.warn(`Standard verifier failed: ${standardError.message}`);

      if (standardError.message.toLowerCase().includes('already verified')) {
        logger.success('Contract is already verified.');
        return;
      }

      // --- Fallback Attempt: Custom Verifier ---
      logger.info('Falling back to custom verifier...');
      try {
        await verifyOnCustomEtherscan({
          hre,
          contractAddress: contractAddress, // Use the fetched address
          contractName: contractName,
          constructorArguments: constructorArguments
        });
        logger.success('Custom verifier fallback successful!');
        return; // Success, exit the loop.
      } catch (customError: any) {
        if (customError.message.toLowerCase().includes('already verified')) {
          logger.success('Contract is already verified.');
          return;
        }

        logger.warn(
          `Custom verifier fallback also failed: ${customError.message}`
        );
        if (i < maxRetries - 1) {
          logger.info(
            `Waiting ${
              retryDelay / 1000
            } seconds before retrying entire process...`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          logger.error(
            `All verification retries failed. Please verify manually later.`
          );
        }
      }
    }
  }
}
