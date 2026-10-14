import { ethers } from 'hardhat';
import { getChainConfig } from './chainConfig';
import { logger } from '../deployUtils';

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

async function main() {
  // --- 1. Env parsing + validation (fail fast; never embed sensitive values in errors) ---
  const batcherAddress = (process.env.BATCHER_ADDRESS || '').trim();
  if (!ADDRESS_REGEX.test(batcherAddress)) {
    throw new Error(
      'BATCHER_ADDRESS env var is required and must be a valid 0x-prefixed address'
    );
  }

  // Environment selector (passed from the workflow's environment input);
  // decides which owner secret is used.
  const environment = (process.env.BATCHER_ENVIRONMENT || '')
    .trim()
    .toLowerCase();
  if (environment !== 'testnet' && environment !== 'mainnet') {
    throw new Error(
      'BATCHER_ENVIRONMENT env var is required and must be "testnet" or "mainnet"'
    );
  }
  const ownerSecretName = `BATCHER_CONTRACT_OWNER_${environment.toUpperCase()}`;

  const newOwnerRaw = (
    (environment === 'testnet'
      ? process.env.BATCHER_CONTRACT_OWNER_TESTNET
      : process.env.BATCHER_CONTRACT_OWNER_MAINNET) || ''
  ).trim();
  if (!ADDRESS_REGEX.test(newOwnerRaw)) {
    throw new Error(
      `${ownerSecretName} secret is required and must be a valid 0x-prefixed address`
    );
  }
  let newOwner: string;
  try {
    newOwner = ethers.getAddress(newOwnerRaw);
  } catch {
    throw new Error(
      `${ownerSecretName} is not a valid eth address (bad checksum)`
    );
  }
  if (newOwner === ethers.ZeroAddress) {
    throw new Error(`${ownerSecretName} must not be the zero address`);
  }

  // --- 2. Signer ---
  // Current owner: the PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT secret (the Batcher
  // deployer key), loaded directly instead of via an ethers.getSigners() index lookup.
  // Accepts the key with or without the 0x prefix (hardhat config accepts both).
  const ownerKeyRaw = (
    process.env.PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT || ''
  ).trim();
  const ownerKey = ownerKeyRaw.startsWith('0x')
    ? ownerKeyRaw
    : `0x${ownerKeyRaw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(ownerKey)) {
    throw new Error(
      'PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT secret is required and must be a valid secp256k1 key'
    );
  }
  const ownerSigner = new ethers.Wallet(ownerKey, ethers.provider);

  // Network and gas overrides
  const { chainId } = await ethers.provider.getNetwork();
  const chainConfig = await getChainConfig(Number(chainId));
  const gasOverrides = chainConfig?.gasParams ?? {};

  // --- 3. On-chain checks ---
  const code = await ethers.provider.getCode(batcherAddress);
  if (!code || code === '0x') {
    throw new Error(
      'No contract code at the given BATCHER_ADDRESS on this network. Check the address and network.'
    );
  }

  const batcher = await ethers.getContractAt(
    'Batcher',
    batcherAddress,
    ownerSigner
  );

  // Verify current ownership (Ownable2Step)
  const owner: string = await batcher.owner();
  if (owner.toLowerCase() !== (await ownerSigner.getAddress()).toLowerCase()) {
    throw new Error('Signer is not the current owner of the Batcher contract');
  }

  logger.info(`Network chainId: ${chainId}`);

  // Idempotency awareness: a transfer to the new owner may already be pending
  // from a previous run. Re-sending is harmless — transferOwnership replaces
  // the pending transfer — but warn so the operator knows.
  const currentPendingOwner: string = await batcher.pendingOwner();
  if (currentPendingOwner.toLowerCase() === newOwner.toLowerCase()) {
    logger.warn(
      'A pending ownership transfer to the new owner is already active; re-sending transferOwnership (replaces it)'
    );
  }

  // --- 4. Initiate ownership transfer (step 1 of Ownable2Step) ---
  const tx = await batcher.transferOwnership(newOwner, { ...gasOverrides });
  await tx.wait();
  const pendingOwner: string = await batcher.pendingOwner();
  if (pendingOwner.toLowerCase() !== newOwner.toLowerCase()) {
    throw new Error('transferOwnership did not set the expected pending owner');
  }
  logger.info('Ownership transfer initiated (tx mined)');

  logger.success(
    'Done ✅ — the new owner must call acceptOwnership on-chain to complete the transfer'
  );
}

main().catch((err) => {
  logger.error(`Failed: ${err.message}`);
  process.exit(1);
});
