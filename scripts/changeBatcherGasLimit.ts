import hre, { ethers } from 'hardhat';
import { logger } from '../deployUtils';

type TxOverrides = {
  gasLimit?: number;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
};

async function main() {
  logger.step('🔧 Starting Batcher Contract Gas Limit Change 🔧');

  const batcherContractAddress = process.env.BATCHER_CONTRACT_ADDRESS;
  const newGasLimitStr = process.env.NEW_GAS_LIMIT;

  if (!batcherContractAddress) {
    throw new Error(
      'BATCHER_CONTRACT_ADDRESS environment variable is required'
    );
  }

  if (!newGasLimitStr) {
    throw new Error('NEW_GAS_LIMIT environment variable is required');
  }

  const newGasLimit = BigInt(newGasLimitStr);

  logger.step('1. Setting up signer and network information...');

  const signers = await ethers.getSigners();
  if (signers.length < 1) {
    throw new Error('No signers available');
  }

  const desiredIndex = process.env.BATCHER_DEPLOYER_INDEX
    ? Number(process.env.BATCHER_DEPLOYER_INDEX)
    : 2;
  let batcherOwner = signers[desiredIndex] || signers[signers.length - 1];

  const signerInfos = await Promise.all(
    signers.map(async (s, i) => {
      const addr = await s.getAddress();
      const bal = await ethers.provider.getBalance(addr);
      return { index: i, addr, balance: bal };
    })
  );

  if (
    !batcherOwner ||
    (await ethers.provider.getBalance(await batcherOwner.getAddress())) === 0n
  ) {
    const funded = signerInfos
      .filter((x) => x.balance > 0n)
      .sort((a, b) => (b.balance > a.balance ? 1 : -1))[0];
    if (!funded) {
      logger.error('No funded signer available for transaction. Aborting.');
      throw new Error('No funded signer');
    }
    batcherOwner = signers[funded.index];
    logger.warn(
      `Selected alternative funded signer index=${funded.index} address=${
        funded.addr
      } (balance=${ethers.formatEther(funded.balance)})`
    );
  }

  const address = await batcherOwner.getAddress();
  const { chainId } = await ethers.provider.getNetwork();

  logger.info(`Network: ${hre.network.name} (Chain ID: ${chainId})`);
  logger.info(`Owner Address: ${address}`);
  logger.info(`Batcher Contract Address: ${batcherContractAddress}`);
  logger.info(`New Gas Limit: ${newGasLimit.toString()}`);

  logger.step('2. Connecting to Batcher contract...');

  const batcherAbi = [
    'function changeTransferGasLimit(uint256 newTransferGasLimit) external',
    'function transferGasLimit() external view returns (uint256)',
    'function owner() external view returns (address)'
  ];

  const batcherContract = new ethers.Contract(
    batcherContractAddress,
    batcherAbi,
    batcherOwner
  );

  logger.step('3. Verifying contract ownership...');

  try {
    const currentOwner = await batcherContract.owner();
    logger.info(`Contract Owner: ${currentOwner}`);

    if (currentOwner.toLowerCase() !== address.toLowerCase()) {
      throw new Error(
        `Signer ${address} is not the owner of the contract. Owner is ${currentOwner}`
      );
    }

    const currentGasLimit = await batcherContract.transferGasLimit();
    logger.info(`Current Gas Limit: ${currentGasLimit.toString()}`);
  } catch (error) {
    logger.error(`Failed to verify contract details:, ${error}`);
    throw error;
  }

  logger.step('4. Configuring gas parameters for the transaction...');

  const eip1559Chains = [10143, 480, 4801, 1946, 1868, 1114, 1112, 1111, 50312];
  const feeData = await ethers.provider.getFeeData();
  let gasOverrides: TxOverrides | undefined = undefined;

  if (Number(chainId) === 50312 || Number(chainId) === 5031) {
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

    const est = await batcherContract.changeTransferGasLimit.estimateGas(
      newGasLimit,
    );

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

  logger.step('5. Calling changeTransferGasLimit function...');

  try {
    let tx;
    if (gasOverrides) {
      tx = await batcherContract.changeTransferGasLimit(
        newGasLimit,
        gasOverrides
      );
    } else {
      tx = await batcherContract.changeTransferGasLimit(newGasLimit);
    }

    logger.info(`Transaction submitted: ${tx.hash}`);
    logger.info('Waiting for transaction confirmation...');

    const receipt = await tx.wait();

    if (receipt.status === 1) {
      logger.success('✅ Transaction confirmed successfully!');
      logger.info(`     - Block Number: ${receipt.blockNumber}`);
      logger.info(`     - Gas Used: ${receipt.gasUsed.toString()}`);
    } else {
      throw new Error('Transaction failed');
    }

    logger.step('6. Verifying the gas limit change...');

    const updatedGasLimit = await batcherContract.transferGasLimit();
    logger.info(`Updated Gas Limit: ${updatedGasLimit.toString()}`);

    if (updatedGasLimit.toString() === newGasLimit.toString()) {
      logger.success('🎉 Gas limit successfully updated! 🎉');
    } else {
      logger.error(
        `Gas limit verification failed. Expected: ${newGasLimit.toString()}, Actual: ${updatedGasLimit.toString()}`
      );
    }
  } catch (error) {
    logger.error(`Failed to change gas limit:', ${error}`);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
