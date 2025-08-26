import hre, { ethers } from 'hardhat';
import { getChainConfig } from './chainConfig';
import {
  deployIfNeededAtNonce,
  waitAndVerify,
  loadOutput,
  saveOutput,
  DeploymentAddresses
} from '../deployUtils';
import { enableBigBlocks } from './enableBigBlocks';
import {
  getBigBlocksConfigV4Contracts,
  isBigBlocksSupportedV4Contracts
} from '../config/bigBlocksConfig';

const NONCE = {
  WALLET: 0,
  WALLET_FACTORY: 1,
  FORWARDER: 2,
  FORWARDER_FACTORY: 3
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
  const config = getBigBlocksConfigV4Contracts(chainId);
  if (!config) {
    throw new Error(`Chain with ID ${chainId} is not supported for BigBlocks.`);
  }
  console.log('Useradd' + userAddress);
  console.log(
    `Checking BigBlocks status for ${userAddress} on ${config.name}...`
  );
  console.log(`Making RPC call to: ${config.rpcUrl}`);
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

    console.log(result);

    if (result.error) {
      throw new Error(
        `RPC Error: ${result.error.code} - ${result.error.message}`
      );
    }

    return result.result || false;
  } catch (err) {
    console.error('Failed to fetch BigBlocks status.');
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
      console.log(
        ` Attempt ${attempt}/${maxRetries}: Enabling BigBlocks on ${config.name}`
      );
      await enableBigBlocks(config.envKey, true, chainId);
      console.log(` BigBlocks enabled on ${config.name} (attempt ${attempt})`);
      return;
    } catch (error) {
      console.log(
        `Attempt ${attempt}/${maxRetries} failed:`,
        (error as Error).message
      );

      if (attempt === maxRetries) {
        throw new Error(
          `Failed to enable BigBlocks on ${
            config.name
          } after ${maxRetries} attempts: ${(error as Error).message}`
        );
      }

      // Wait 2 seconds before retry
      console.log(' Waiting 2 seconds before retry...');
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
  const config = getBigBlocksConfigV4Contracts(chainId);
  if (!config) return;

  if (!config.envKey) {
    throw new Error(`Please set the private key for ${config.name}.`);
  }

  console.log(` Checking BigBlocks status on ${config.name}...`);

  // Check if BigBlocks is already enabled
  const isEnabled = await checkBigBlocksStatus(deployerAddress, chainId);

  if (isEnabled) {
    console.log(`BigBlocks already enabled on ${config.name}`);
    return;
  }

  console.log(
    ` BigBlocks not enabled on ${config.name}, attempting to enable...`
  );

  // Try to enable BigBlocks with retry mechanism
  await enableBigBlocksWithRetry(config, chainId, 3);

  // Verify it was enabled successfully
  console.log(`Verifying BigBlocks was enabled...`);
  const isEnabledAfter = await checkBigBlocksStatus(deployerAddress, chainId);

  if (!isEnabledAfter) {
    throw new Error(
      `BigBlocks enable command succeeded but verification failed on ${config.name}`
    );
  }

  console.log(`BigBlocks successfully verified as enabled on ${config.name}`);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const currentNonce = await ethers.provider.getTransactionCount(
    deployerAddress
  );
  const { chainId } = await ethers.provider.getNetwork();
  const chainConfig = await getChainConfig(Number(chainId));
  const output: DeploymentAddresses = loadOutput();

  const gasOverrides = chainConfig.gasParams;

  // Handle BigBlocks setup automatically if supported
  if (isBigBlocksSupportedV4Contracts(Number(chainId))) {
    console.log('🔍 BigBlocks supported on this chain, checking status...');
    await setupBigBlocks(Number(chainId), deployerAddress);
  }

  console.log(
    `🚀 Deployer: ${deployerAddress} (nonce: ${currentNonce}) on chain ${chainId}`
  );

  // Deploy Wallet Implementation
  const walletAddress = await deployIfNeededAtNonce(
    output.walletImplementation,
    NONCE.WALLET,
    deployerAddress,
    chainConfig.walletImplementationContractName,
    async () => {
      const WalletSimple = await ethers.getContractFactory(
        chainConfig.walletImplementationContractName
      );
      const constructorArgs: string[] = [];

      const contract = await WalletSimple.deploy(
        ...constructorArgs,
        gasOverrides
      );
      await contract.waitForDeployment();

      console.log(
        `✅ ${chainConfig.walletImplementationContractName} deployed at ${contract.target}`
      );
      await waitAndVerify(
        hre,
        contract,
        chainConfig.walletImplementationContractName,
        constructorArgs
      );
      output.walletImplementation = contract.target as string;
      saveOutput(output);
      return contract.target as string;
    }
  );

  // Deploy Wallet Factory
  await deployIfNeededAtNonce(
    output.walletFactory,
    NONCE.WALLET_FACTORY,
    deployerAddress,
    chainConfig.walletFactoryContractName,
    async () => {
      const WalletFactory = await ethers.getContractFactory(
        chainConfig.walletFactoryContractName
      );
      const contract = await WalletFactory.deploy(walletAddress, gasOverrides);
      await contract.waitForDeployment();
      console.log(
        `✅ ${chainConfig.walletFactoryContractName} deployed at ${contract.target}`
      );
      await waitAndVerify(
        hre,
        contract,
        chainConfig.walletFactoryContractName,
        [walletAddress]
      );
      output.walletFactory = contract.target as string;
      saveOutput(output);
      return contract.target as string;
    }
  );

  // Deploy Forwarder
  const forwarderAddress = await deployIfNeededAtNonce(
    output.forwarderImplementation,
    NONCE.FORWARDER,
    deployerAddress,
    chainConfig.forwarderContractName,
    async () => {
      const Forwarder = await ethers.getContractFactory(
        chainConfig.forwarderContractName
      );
      const contract = await Forwarder.deploy(gasOverrides);
      await contract.waitForDeployment();
      console.log(
        `✅ ${chainConfig.forwarderContractName} deployed at ${contract.target}`
      );
      await waitAndVerify(hre, contract, chainConfig.forwarderContractName, []);
      output.forwarderImplementation = contract.target as string;
      saveOutput(output);
      return contract.target as string;
    }
  );

  // Deploy Forwarder Factory
  await deployIfNeededAtNonce(
    output.forwarderFactory,
    NONCE.FORWARDER_FACTORY,
    deployerAddress,
    chainConfig.forwarderFactoryContractName,
    async () => {
      const ForwarderFactory = await ethers.getContractFactory(
        chainConfig.forwarderFactoryContractName
      );
      const contract = await ForwarderFactory.deploy(
        forwarderAddress,
        gasOverrides
      );
      await contract.waitForDeployment();
      console.log(
        `✅ ${chainConfig.forwarderFactoryContractName} deployed at ${contract.target}`
      );
      await waitAndVerify(
        hre,
        contract,
        chainConfig.forwarderFactoryContractName,
        [forwarderAddress]
      );
      output.forwarderFactory = contract.target as string;
      saveOutput(output);
      return contract.target as string;
    }
  );

  console.log(`🎉 All contracts deployed and verified!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
