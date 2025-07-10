import hre, { ethers } from 'hardhat';
import fs from 'fs';
import { Contract } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { verifyOnCustomEtherscan } from './scripts/customContractVerifier';

const OUTPUT_FILE = 'output.json';

export const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  config: (msg: string) => console.log(`[CONFIG] ${msg}`),
  success: (msg: string) => console.log(`✅ [SUCCESS] ${msg}`),
  error: (msg: string) => console.error(`❌ [ERROR] ${msg}`),
  warn: (msg: string) => console.warn(`⚠️ [WARN] ${msg}`),
  step: (msg: string) => console.log(`\n--- ${msg} ---`)
};

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
  deployFn: () => Promise<string>
): Promise<string> {
  const predictedAddress = ethers.utils.getContractAddress({
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

  // 5. Deploy
  logger.info(`🚀 Deploying ${contractName} at nonce ${expectedNonce}...`);
  return await deployFn();
}

async function isContractDeployed(address: string) {
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
  contract: Contract,
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
  await contract.deployTransaction.wait(confirmationCount);
  logger.success(`Contract confirmed on the network at ${contract.address}.`);

  const maxRetries = 20;
  const retryDelay = 180000; // 180 seconds

  for (let i = 0; i < maxRetries; i++) {
    logger.info(`Verification attempt #${i + 1} for ${contractName}...`);
    try {
      // --- Primary Attempt: Standard Verifier ---
      logger.info('Attempting verification with standard Hardhat verifier...');
      await hre.run('verify:verify', {
        address: contract.address,
        constructorArguments
      });
      logger.success('Standard verification successful!');
      return; // Success, exit the loop.
    } catch (standardError: any) {
      logger.warn(`Standard verifier failed: ${standardError.message}`);

      // If already verified by standard verifier, we're done.
      if (standardError.message.toLowerCase().includes('already verified')) {
        logger.success('Contract is already verified.');
        return;
      }

      // --- Fallback Attempt: Custom Verifier ---
      logger.info('Falling back to custom verifier...');
      try {
        await verifyOnCustomEtherscan({
          hre,
          contractAddress: contract.address,
          contractName: contractName,
          constructorArguments: constructorArguments
        });
        logger.success('Custom verifier fallback successful!');
        return; // Success, exit the loop.
      } catch (customError: any) {
        // If already verified by custom verifier, we're done.
        if (customError.message.toLowerCase().includes('already verified')) {
          logger.success('Contract is already verified.');
          return;
        }

        // Log the custom verifier failure and decide whether to retry the whole process
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
