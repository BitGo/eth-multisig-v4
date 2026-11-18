import hre, { ethers } from 'hardhat';
import { getChainConfig } from './chainConfig';
import {
  deployIfNeededAtNonce,
  waitAndVerify,
  loadOutput,
  saveOutput,
  DeploymentAddresses,
  checkSufficientBalance,
  isContractDeployed
} from '../deployUtils';
import { setupBigBlocksForV4Deployment } from './enableBigBlocks';
import { isBigBlocksSupported } from '../config/bigBlocksConfig';

const NONCE = {
  WALLET: 0,
  WALLET_FACTORY: 1,
  FORWARDER: 2,
  FORWARDER_FACTORY: 3
};

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
  if (isBigBlocksSupported(Number(chainId))) {
    console.log('🔍 BigBlocks supported on this chain, checking status...');
    await setupBigBlocksForV4Deployment(Number(chainId), deployerAddress);
  }

  console.log(
    `🚀 Deployer: ${deployerAddress} (nonce: ${currentNonce}) on chain ${chainId}`
  );

  // Pre-deployment balance check - estimate total cost for all contracts
  console.log('\n--- Checking deployer balance ---');

  // Estimate gas costs for all potential deployments
  let totalEstimatedCost = 0n;

  // For chains with very high gas limits (like Mantle), skip estimation and use configured limit
  const useConfiguredGasLimit = gasOverrides.gasLimit > 10_000_000_000; // > 10 billion

  if (useConfiguredGasLimit) {
    console.log(
      `⚠️  Using configured gas limit (${gasOverrides.gasLimit}) instead of estimation for this chain`
    );
  }

  // Only estimate if we need to deploy (not already deployed)
  if (
    !output.walletImplementation ||
    !(await isContractDeployed(output.walletImplementation))
  ) {
    if (useConfiguredGasLimit) {
      totalEstimatedCost += BigInt(gasOverrides.gasLimit);
    } else {
      const WalletSimple = await ethers.getContractFactory(
        chainConfig.walletImplementationContractName
      );
      const walletGas = await deployer.estimateGas({
        ...(await WalletSimple.getDeployTransaction(...[], gasOverrides)),
        from: deployerAddress
      });
      totalEstimatedCost += walletGas;
    }
  }

  if (
    !output.walletFactory ||
    !(await isContractDeployed(output.walletFactory))
  ) {
    if (useConfiguredGasLimit) {
      totalEstimatedCost += BigInt(gasOverrides.gasLimit);
    } else {
      const WalletFactory = await ethers.getContractFactory(
        chainConfig.walletFactoryContractName
      );
      const factoryGas = await deployer.estimateGas({
        ...(await WalletFactory.getDeployTransaction(
          deployerAddress,
          gasOverrides
        )), // Use deployer address as placeholder
        from: deployerAddress
      });
      totalEstimatedCost += factoryGas;
    }
  }

  if (
    !output.forwarderImplementation ||
    !(await isContractDeployed(output.forwarderImplementation))
  ) {
    if (useConfiguredGasLimit) {
      totalEstimatedCost += BigInt(gasOverrides.gasLimit);
    } else {
      const ForwarderV4 = await ethers.getContractFactory(
        chainConfig.forwarderContractName
      );
      const forwarderGas = await deployer.estimateGas({
        ...(await ForwarderV4.getDeployTransaction(gasOverrides)),
        from: deployerAddress
      });
      totalEstimatedCost += forwarderGas;
    }
  }

  if (
    !output.forwarderFactory ||
    !(await isContractDeployed(output.forwarderFactory))
  ) {
    if (useConfiguredGasLimit) {
      totalEstimatedCost += BigInt(gasOverrides.gasLimit);
    } else {
      const ForwarderFactory = await ethers.getContractFactory(
        chainConfig.forwarderFactoryContractName
      );
      const forwarderFactoryGas = await deployer.estimateGas({
        ...(await ForwarderFactory.getDeployTransaction(
          deployerAddress,
          gasOverrides
        )), // Use deployer address as placeholder
        from: deployerAddress
      });
      totalEstimatedCost += forwarderFactoryGas;
    }
  }

  if (totalEstimatedCost > 0n) {
    // Get gas price for cost calculation
    const feeData = await ethers.provider.getFeeData();
    let gasPrice: bigint;

    if (gasOverrides?.gasPrice) {
      gasPrice = gasOverrides.gasPrice;
    } else if (gasOverrides?.maxFeePerGas) {
      gasPrice = gasOverrides.maxFeePerGas;
    } else {
      gasPrice = feeData.gasPrice || 1_000_000_000n; // 1 gwei fallback
    }

    const estimatedCost = totalEstimatedCost * gasPrice;

    await checkSufficientBalance(
      deployerAddress,
      estimatedCost,
      'all V4 contracts'
    );
  } else {
    console.log('✅ All contracts already deployed, skipping balance check');
  }

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
    },
    gasOverrides
  );

  // Deploy Wallet Factory
  const walletFactoryAddress = await deployIfNeededAtNonce(
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
    },
    gasOverrides
  );
  const walletFactoryContract = await ethers.getContractAt(
    chainConfig.walletFactoryContractName,
    walletFactoryAddress
  );
  const walletFactoryImpl: string = await walletFactoryContract.getFunction(
    'implementationAddress'
  )();
  if (walletFactoryImpl.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error(
      `${chainConfig.walletFactoryContractName} at ${walletFactoryAddress} has implementationAddress=${walletFactoryImpl} but expected ${walletAddress}`
    );
  }

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
    },
    gasOverrides
  );

  // Deploy Forwarder Factory
  const forwarderFactoryAddress = await deployIfNeededAtNonce(
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
    },
    gasOverrides
  );
  const forwarderFactoryContract = await ethers.getContractAt(
    chainConfig.forwarderFactoryContractName,
    forwarderFactoryAddress
  );
  const forwarderFactoryImpl: string =
    await forwarderFactoryContract.getFunction('implementationAddress')();
  if (forwarderFactoryImpl.toLowerCase() !== forwarderAddress.toLowerCase()) {
    throw new Error(
      `${chainConfig.forwarderFactoryContractName} at ${forwarderFactoryAddress} has implementationAddress=${forwarderFactoryImpl} but expected ${forwarderAddress}`
    );
  }

  console.log(`🎉 All contracts deployed and verified!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
