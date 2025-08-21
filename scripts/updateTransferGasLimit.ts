import { ethers } from 'hardhat';
import { getChainConfig } from './chainConfig';
import { logger } from '../deployUtils';

async function main() {
  // Use the first configured signer on the selected network
  const signers = await ethers.getSigners();
  const signer = signers[0];
  const from = await signer.getAddress();

  // Network and gas overrides
  const { chainId } = await ethers.provider.getNetwork();
  const chainConfig = await getChainConfig(Number(chainId));
  const gasOverrides = chainConfig?.gasParams ?? {};

  // Required: BATCHER_ADDRESS env var
  const batcherAddress = (process.env.BATCHER_ADDRESS || '').trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(batcherAddress)) {
    throw new Error(
      'BATCHER_ADDRESS env var is required and must be a valid 0x-prefixed address'
    );
  }
  const code = await ethers.provider.getCode(batcherAddress);
  if (!code || code === '0x') {
    throw new Error(
      `No contract code at ${batcherAddress} on chainId ${chainId}. Check the address and network.`
    );
  }

  // Required: TRANSFER_GAS_LIMIT env var (as number or underscore-formatted)
  const limitRaw = (process.env.TRANSFER_GAS_LIMIT || '')
    .replace(/_/g, '')
    .trim();
  if (!limitRaw) throw new Error('TRANSFER_GAS_LIMIT env var is required');
  const parsed = Number(limitRaw);
  if (!Number.isFinite(parsed)) throw new Error('Invalid TRANSFER_GAS_LIMIT');
  const newLimit = BigInt(parsed);
  if (newLimit < 2300n) throw new Error('newLimit must be >= 2300');

  const batcher = await ethers.getContractAt('Batcher', batcherAddress, signer);

  // Verify ownership (Ownable2Step)
  const owner: string = await batcher.owner();
  if (owner.toLowerCase() !== from.toLowerCase()) {
    throw new Error(`Caller is not owner. Owner=${owner}, Caller=${from}`);
  }

  logger.info(`Network: ${chainId}`);
  logger.info(`Batcher: ${batcherAddress}`);
  logger.info(`Caller:  ${from}`);
  logger.info(`New transferGasLimit: ${newLimit.toString()} (from env)`);

  try {
    const current = await (batcher as any).transferGasLimit();
    logger.info(`Current transferGasLimit: ${current.toString()}`);
  } catch {
    logger.warn('Current transferGasLimit: (getter not found, skipping)');
  }

  const tx = await batcher.changeTransferGasLimit(newLimit, {
    ...gasOverrides
  });
  logger.info(`Tx sent: ${tx.hash}`);
  const rc = await tx.wait();
  logger.success(`Mined in block: ${rc.blockNumber}`);

  try {
    const updated = await (batcher as any).transferGasLimit();
    logger.info(`Updated transferGasLimit: ${updated.toString()}`);
  } catch {
    logger.warn('Updated transferGasLimit: (getter not found, skipped)');
  }

  logger.success('Done ✅');
}

main().catch((err) => {
  logger.error(`Failed: ${err}`);
  process.exit(1);
});
