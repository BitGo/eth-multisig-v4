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

const VERIFICATION_CONFIG = {
  CONFIRMATION_BLOCKS: 5,
  MAX_RETRIES: 10,
  RETRY_DELAY_MS: 60_000 // 1 minute
} as const;

/**
 * Checks if an error indicates the contract is already verified
 */
function isAlreadyVerifiedError(error: any): boolean {
  return error.message.toLowerCase().includes('already verified');
}

/**
 * Creates a delay for the specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits for contract confirmations
 */
async function waitForConfirmations(
  contract: BaseContract,
  contractName: string,
  confirmationBlocks: number = VERIFICATION_CONFIG.CONFIRMATION_BLOCKS
): Promise<string> {
  logger.info(
    `Waiting for ${confirmationBlocks} block confirmations for ${contractName}...`
  );

  const deployTx = contract.deploymentTransaction();
  await deployTx?.wait(confirmationBlocks);

  const contractAddress = await contract.getAddress();
  logger.success(
    `Contract ${contractName} confirmed after ${confirmationBlocks} confirmations at ${contractAddress}`
  );

  return contractAddress;
}

/**
 * Checks if the current network supports Sourcify verification
 */
async function isSourcifyNetwork(
  hre: HardhatRuntimeEnvironment
): Promise<boolean> {
  const { sourcifyNetworks } = await import('./hardhat.config');
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  return chainId in sourcifyNetworks;
}

/**
 * Gets the Sourcify configuration for a specific network
 */
async function getSourcifyConfig(hre: HardhatRuntimeEnvironment): Promise<{
  enabled: boolean;
  apiUrl: string;
  browserUrl: string;
}> {
  const { sourcifyNetworks } = await import('./hardhat.config');
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  // Check if network has custom Sourcify configuration
  const networkConfig = (
    sourcifyNetworks as Record<number, { apiUrl: string; browserUrl: string }>
  )[chainId];
  if (networkConfig) {
    return {
      enabled: true,
      apiUrl: networkConfig.apiUrl,
      browserUrl: networkConfig.browserUrl
    };
  } else {
    throw new Error('No Sourcify configuration available for this network');
  }
}

/**
 * Attempts standard Hardhat verification
 */
async function attemptStandardVerification(
  hre: HardhatRuntimeEnvironment,
  contractAddress: string,
  contractName: string,
  constructorArguments: string[]
): Promise<void> {
  const artifact = await hre.artifacts.readArtifact(contractName);
  const verificationString = `${artifact.sourceName}:${artifact.contractName}`;

  logger.info('Attempting verification with standard Hardhat verifier...');

  await hre.run('verify:verify', {
    address: contractAddress,
    constructorArguments,
    contract: verificationString
  });

  logger.success('Standard verification successful!');
}

/**
 * Attempts custom Etherscan verification as fallback
 */
async function attemptCustomVerification(
  hre: HardhatRuntimeEnvironment,
  contractAddress: string,
  contractName: string,
  constructorArguments: string[]
): Promise<void> {
  logger.info('Falling back to custom verifier...');

  await verifyOnCustomEtherscan({
    hre,
    contractAddress,
    contractName,
    constructorArguments
  });

  logger.success('Custom verifier fallback successful!');
}

/**
 * Attempts Sourcify verification via hardhat-verify with dynamic configuration
 */
async function attemptSourcifyVerification(
  hre: HardhatRuntimeEnvironment,
  contractAddress: string,
  contractName: string,
  constructorArguments: string[]
): Promise<void> {
  logger.info('Using Sourcify verification...');

  // Get the appropriate Sourcify configuration for this network
  const sourcifyConfig = await getSourcifyConfig(hre);

  const originalConfig = hre.config.sourcify;
  hre.config.sourcify = sourcifyConfig;

  try {
    const artifact = await hre.artifacts.readArtifact(contractName);
    const verificationString = `${artifact.sourceName}:${artifact.contractName}`;

    logger.info(`Verifying with fully qualified name: ${verificationString}`);
    logger.info(`Using Sourcify API: ${sourcifyConfig.apiUrl}`);

    await hre.run('verify:sourcify', {
      address: contractAddress,
      constructorArguments,
      contract: verificationString
    });
    logger.success('Sourcify verification successful!');
  } finally {
    hre.config.sourcify = originalConfig;
  }
}

/**
 * Attempts a single verification (standard + custom + hedera fallback)
 * Returns true if successful, false if should retry, throws if already verified
 */
async function attemptVerification(
  hre: HardhatRuntimeEnvironment,
  contractAddress: string,
  contractName: string,
  constructorArguments: string[]
): Promise<boolean> {
  // Try sourcify verification if network supports it
  try {
    if (await isSourcifyNetwork(hre)) {
      await attemptSourcifyVerification(
        hre,
        contractAddress,
        contractName,
        constructorArguments
      );
      return true; // Success
    }
  } catch (sourcifyError: any) {
    if (isAlreadyVerifiedError(sourcifyError)) {
      logger.success('Contract is already verified.');
      throw new Error('ALREADY_VERIFIED');
    }
    logger.warn(`Sourcify verification failed: ${sourcifyError.message}`);
    return false; // Should retry
  }

  // Try standard verification
  try {
    await attemptStandardVerification(
      hre,
      contractAddress,
      contractName,
      constructorArguments
    );
    return true; // Success
  } catch (standardError: any) {
    if (isAlreadyVerifiedError(standardError)) {
      logger.success('Contract is already verified.');
      throw new Error('ALREADY_VERIFIED');
    }

    logger.warn(`Standard verifier failed: ${standardError.message}`);
  }

  // Try custom verification as fallback
  try {
    await attemptCustomVerification(
      hre,
      contractAddress,
      contractName,
      constructorArguments
    );
    return true; // Success
  } catch (customError: any) {
    if (isAlreadyVerifiedError(customError)) {
      logger.success('Contract is already verified.');
      throw new Error('ALREADY_VERIFIED'); // Special error to indicate success
    }

    logger.warn(`Custom verifier fallback also failed: ${customError.message}`);
  }

  return false; // Should retry
}

/**
 * Waits for contract confirmation and then verifies it on a block explorer.
 * Uses standard Hardhat verifier, custom verifier, and Sourcify verification.
 */
export async function waitAndVerify(
  hre: HardhatRuntimeEnvironment,
  contract: BaseContract,
  contractName: string,
  constructorArguments: string[] = []
): Promise<void> {
  if (!hre) {
    const errorMsg = 'Hardhat Runtime Environment (hre) is not defined.';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Wait for block confirmations
  const contractAddress = await waitForConfirmations(contract, contractName);

  // Perform verification with retry logic
  for (let attempt = 1; attempt <= VERIFICATION_CONFIG.MAX_RETRIES; attempt++) {
    logger.info(`Verification attempt #${attempt} for ${contractName}...`);

    try {
      const success = await attemptVerification(
        hre,
        contractAddress,
        contractName,
        constructorArguments
      );

      if (success) {
        logger.success(`Verification succeeded on attempt #${attempt}.`);
        return; // Verification succeeded
      }
    } catch (error: any) {
      if (error.message === 'ALREADY_VERIFIED') {
        logger.success(`Contract already verified on attempt #${attempt}.`);
        return; // Already verified - success
      } else {
        logger.warn(`Unexpected error during verification: ${error.message}`);
      }
    }

    // If we get here, verification failed and we should retry
    if (attempt < VERIFICATION_CONFIG.MAX_RETRIES) {
      const delaySeconds = VERIFICATION_CONFIG.RETRY_DELAY_MS / 1000;
      logger.info(`Waiting ${delaySeconds} seconds before retrying...`);
      await delay(VERIFICATION_CONFIG.RETRY_DELAY_MS);
    }
  }

  logger.error(`Verification process failed: Please verify manually later.`);
}
