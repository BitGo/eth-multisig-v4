import { ethers } from 'hardhat';
import { getChainConfig } from './chainConfig';
import { logger } from '../deployUtils';

// The Batcher owner is being migrated to a TSS custody wallet (COINS-1281).
//
// This constant is the sole source of truth for the new owner address. It
// must only ever be set via a reviewed, merged PR -- never taken from a CLI
// argument, an env var, or any other runtime input. It is cross-checked
// against the BATCHER_NEW_OWNER_ADDRESS secret (set by DevOps once the
// custody wallet is provisioned, see COINS-1280) before any transaction is
// sent, so a disagreement between the two aborts the run instead of silently
// transferring ownership to the wrong address.
//
// TODO(COINS-1280): fill in with the custody wallet's base address once
// DevOps hands it back. Left empty until then so the script refuses to run.
const NEW_OWNER_ADDRESS = '';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

async function main() {
  // Use the third configured signer on the selected network (same signer
  // index as updateTransferGasLimit.ts and the deploy scripts --
  // PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT).
  const signers = await ethers.getSigners();
  const signer = signers[2];
  const from = await signer.getAddress();

  const { chainId } = await ethers.provider.getNetwork();
  const chainConfig = await getChainConfig(Number(chainId));
  const gasOverrides = chainConfig?.gasParams ?? {};

  // Required: BATCHER_ADDRESS env var
  const batcherAddress = (process.env.BATCHER_ADDRESS || '').trim();
  if (!isValidAddress(batcherAddress)) {
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

  // The new owner address must never come from user input -- see the
  // comment on NEW_OWNER_ADDRESS above. Cross-check the reviewed constant
  // against the DevOps-provided secret before doing anything else.
  if (!isValidAddress(NEW_OWNER_ADDRESS)) {
    throw new Error(
      'NEW_OWNER_ADDRESS constant is not set. Fill it in with the custody ' +
        'wallet base address (COINS-1280) via a reviewed PR before running ' +
        'this script.'
    );
  }

  if (NEW_OWNER_ADDRESS.toLowerCase() === ZERO_ADDRESS) {
    throw new Error('NEW_OWNER_ADDRESS cannot be the zero address');
  }

  const secretAddress = (process.env.BATCHER_NEW_OWNER_ADDRESS || '').trim();
  if (!secretAddress) {
    throw new Error(
      'BATCHER_NEW_OWNER_ADDRESS env var is required (set by DevOps once ' +
        'the custody wallet is provisioned).'
    );
  }
  if (!isValidAddress(secretAddress)) {
    throw new Error(
      `BATCHER_NEW_OWNER_ADDRESS is not a valid address: ${secretAddress}`
    );
  }
  if (secretAddress.toLowerCase() !== NEW_OWNER_ADDRESS.toLowerCase()) {
    throw new Error(
      'New owner address mismatch -- aborting. ' +
        `hardcoded=${NEW_OWNER_ADDRESS} secret=${secretAddress}. ` +
        'These must match exactly before any transaction is sent.'
    );
  }

  const batcher = await ethers.getContractAt('Batcher', batcherAddress, signer);

  // Verify ownership (Ownable2Step) -- the caller must be the current owner.
  const owner: string = await batcher.owner();
  if (owner.toLowerCase() !== from.toLowerCase()) {
    throw new Error(`Caller is not owner. Owner=${owner}, Caller=${from}`);
  }

  const currentPendingOwner: string = await batcher.pendingOwner();

  logger.info(`Network: ${chainId}`);
  logger.info(`Batcher: ${batcherAddress}`);
  logger.info(`Caller:  ${from}`);
  logger.info(`Current owner():        ${owner}`);
  logger.info(`Current pendingOwner(): ${currentPendingOwner}`);
  logger.info(`New pendingOwner:       ${NEW_OWNER_ADDRESS}`);

  if (currentPendingOwner.toLowerCase() === NEW_OWNER_ADDRESS.toLowerCase()) {
    logger.warn(
      'pendingOwner() already equals the intended new owner. Re-sending ' +
        'is harmless (transferOwnership replaces the pending transfer) but ' +
        'unnecessary.'
    );
  }

  const tx = await batcher.transferOwnership(NEW_OWNER_ADDRESS, {
    ...gasOverrides
  });
  logger.info(`Tx sent: ${tx.hash}`);
  const rc = await tx.wait();
  logger.success(`Mined in block: ${rc.blockNumber}`);

  const updatedPendingOwner: string = await batcher.pendingOwner();
  if (updatedPendingOwner.toLowerCase() !== NEW_OWNER_ADDRESS.toLowerCase()) {
    throw new Error(
      `Post-send verification failed: pendingOwner()=${updatedPendingOwner}, ` +
        `expected ${NEW_OWNER_ADDRESS}. Do not proceed to acceptOwnership().`
    );
  }
  logger.success(`pendingOwner() confirmed: ${updatedPendingOwner}`);
  logger.success('Done ✅');
}

main().catch((err) => {
  logger.error(`Failed: ${err}`);
  process.exit(1);
});
