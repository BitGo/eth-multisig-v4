import { BigNumber } from 'ethers';
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
 * Configure BigBlocks for HypeEVM network
 */
async function setupBigBlocks(chainId: number): Promise<void> {
  const config = getBigBlocksConfig(chainId);
  if (!config) return;

  if (!config.envKey) {
    throw new Error(`Please set the private key for ${config.name}.`);
  }

  console.log(`Using BigBlocks on ${config.name}`);
  try {
    await enableBigBlocks(config.envKey, true, chainId);
  } catch (error) {
    throw new Error(
      `Failed to setup BigBlocks on ${config.name}: ${(error as Error).message}`
    );
  }
}

async function main() {
  const feeData = await ethers.provider.getFeeData();
  type LegacyGasParams = {
    gasPrice: BigNumber | null;
    gasLimit?: number;
  };

  const legacyGasParams: LegacyGasParams = {
    gasPrice: feeData.gasPrice
  };

  type Eip1559GasParams = {
    maxFeePerGas: BigNumber | null;
    maxPriorityFeePerGas: BigNumber | null;
    gasLimit?: number;
  };

  const eip1559GasParams: Eip1559GasParams = {
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
  };

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const currentNonce = await deployer.getTransactionCount();
  const chainId = await deployer.getChainId();
  const chainConfig = await getChainConfig(chainId);
  let output: DeploymentAddresses = loadOutput();

  if (isBigBlocksSupported(chainId)) {
    console.log('🔄 Setting up BigBlocks...');
    await setupBigBlocks(chainId);
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
        chainConfig.gasParams
      );
      await contract.deployed();
      console.log(
        `✅ ${chainConfig.walletImplementationContractName} deployed at ${contract.address}`
      );
      await waitAndVerify(
        hre,
        contract,
        chainConfig.walletImplementationContractName,
        constructorArgs
      );
      output.walletImplementation = contract.address;
      saveOutput(output);
      return contract.address;
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
      const contract = await WalletFactory.deploy(
        walletAddress,
        chainConfig.gasParams
      );
      await contract.deployed();
      console.log(
        `✅ ${chainConfig.walletFactoryContractName} deployed at ${contract.address}`
      );
      await waitAndVerify(
        hre,
        contract,
        chainConfig.walletFactoryContractName,
        [walletAddress]
      );
      output.walletFactory = contract.address;
      saveOutput(output);
      return contract.address;
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
      const contract = await Forwarder.deploy(chainConfig.gasParams);
      await contract.deployed();
      console.log(
        `✅ ${chainConfig.forwarderContractName} deployed at ${contract.address}`
      );
      await waitAndVerify(hre, contract, chainConfig.forwarderContractName, []);
      output.forwarderImplementation = contract.address;
      saveOutput(output);
      return contract.address;
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
        chainConfig.gasParams
      );
      await contract.deployed();
      console.log(
        `✅ ${chainConfig.forwarderFactoryContractName} deployed at ${contract.address}`
      );
      await waitAndVerify(
        hre,
        contract,
        chainConfig.forwarderFactoryContractName,
        [forwarderAddress]
      );
      output.forwarderFactory = contract.address;
      saveOutput(output);
      return contract.address;
    }
  );

  console.log(`🎉 All contracts deployed and verified!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
