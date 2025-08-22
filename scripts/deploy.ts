import hre, { ethers } from 'hardhat';
import { getChainConfig } from './chainConfig';
import {
  deployIfNeededAtNonce,
  waitAndVerify,
  loadOutput,
  saveOutput,
  DeploymentAddresses
} from '../deployUtils';
import { checkAndEnableBigBlocks } from './checkAndEnableBigBlocks';
import {
  getBigBlocksConfig,
  isBigBlocksSupported
} from '../config/bigBlocksConfig';

const NONCE = {
  WALLET: 0,
  WALLET_FACTORY: 1,
  FORWARDER: 2,
  FORWARDER_FACTORY: 3
};

/**
 * Configure BigBlocks for HypeEVM network - checks status first and only enables if needed
 */
async function setupBigBlocks(chainId: number): Promise<void> {
  const config = getBigBlocksConfig(chainId);
  if (!config) return;

  if (!config.envKey) {
    throw new Error(`Please set the private key for ${config.name}.`);
  }

  console.log(`Setting up BigBlocks on ${config.name}`);
  try {
    await checkAndEnableBigBlocks(config.envKey, chainId);
  } catch (error) {
    throw new Error(
      `Failed to setup BigBlocks on ${config.name}: ${(error as Error).message}`
    );
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const currentNonce = await ethers.provider.getTransactionCount(
    deployerAddress
  );
  const { chainId } = await ethers.provider.getNetwork(); // More direct way to get chainId
  const chainConfig = await getChainConfig(Number(chainId));
  const output: DeploymentAddresses = loadOutput();

  const gasOverrides = chainConfig.gasParams;

  if (isBigBlocksSupported(Number(chainId))) {
    console.log('🔄 Setting up BigBlocks...');
    await setupBigBlocks(Number(chainId));
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
      const contract = await WalletFactory.deploy(walletAddress, gasOverrides); // constructor args + overrides
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
      const contract = await Forwarder.deploy(gasOverrides); // overrides only
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
      ); // constructor args + overrides
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
