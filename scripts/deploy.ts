import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import { getChainConfig } from './chainConfig';
import {
  deployIfNeededAtNonce,
  waitAndVerify,
  loadOutput,
  saveOutput,
  DeploymentAddresses
} from '../deployUtils';

const NONCE = {
  WALLET: 0,
  WALLET_FACTORY: 1,
  FORWARDER: 2,
  FORWARDER_FACTORY: 3
};

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
      const contract = await WalletSimple.deploy(chainConfig.gasParams);
      await contract.deployed();
      console.log(
        `✅ ${chainConfig.walletImplementationContractName} deployed at ${contract.address}`
      );
      await waitAndVerify(
        chainConfig.walletImplementationContractName,
        contract
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
      await waitAndVerify(chainConfig.walletFactoryContractName, contract, [
        walletAddress
      ]);
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
      await waitAndVerify(chainConfig.forwarderContractName, contract);
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
      await waitAndVerify(chainConfig.forwarderFactoryContractName, contract, [
        forwarderAddress
      ]);
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
