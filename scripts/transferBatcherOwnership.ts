import { ContractTransactionResponse } from 'ethers';
import { ethers } from 'hardhat';
import { resolveGasOverrides } from '../config/batcherDeployGasConfig';
import { applyBalanceSafetyBuffer, logger } from '../deployUtils';

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

// Script-authored error carrying a sanitized, log-safe message. Only these are
// printed at the catch site; dependency errors (e.g. ethers mined-revert
// messages embed contract/owner addresses and the tx hash) are replaced by a
// fixed message.
class ScriptError extends Error {}

async function main() {
  // --- 1. Env parsing + validation (fail fast; never embed sensitive values in errors) ---
  const batcherAddress = (process.env.BATCHER_ADDRESS || '').trim();
  if (!ADDRESS_REGEX.test(batcherAddress)) {
    throw new ScriptError(
      'BATCHER_ADDRESS env var is required and must be a valid 0x-prefixed address'
    );
  }

  // Environment selector (passed from the workflow's environment input);
  // decides which owner secret is used.
  const environment = (process.env.BATCHER_ENVIRONMENT || '')
    .trim()
    .toLowerCase();
  if (environment !== 'testnet' && environment !== 'mainnet') {
    throw new ScriptError(
      'BATCHER_ENVIRONMENT env var is required and must be "testnet" or "mainnet"'
    );
  }

  // Environment/network consistency (repo convention: NETWORK names starting
  // with 't' are testnets — same rule as deploy_batcher_contract.yml). A
  // testnet network combined with the mainnet environment would transfer
  // ownership to the wrong (mainnet) owner secret.
  const networkName = (process.env.NETWORK || '').trim();
  if (networkName.startsWith('t') && environment === 'mainnet') {
    throw new ScriptError(
      `NETWORK '${networkName}' is a testnet network but BATCHER_ENVIRONMENT is 'mainnet'; refusing to use the mainnet owner secret`
    );
  }

  const ownerSecretName = `BATCHER_CONTRACT_OWNER_${environment.toUpperCase()}`;

  const newOwnerRaw = (
    (environment === 'testnet'
      ? process.env.BATCHER_CONTRACT_OWNER_TESTNET
      : process.env.BATCHER_CONTRACT_OWNER_MAINNET) || ''
  ).trim();
  if (!ADDRESS_REGEX.test(newOwnerRaw)) {
    throw new ScriptError(
      `${ownerSecretName} secret is required and must be a valid 0x-prefixed address`
    );
  }
  let newOwner: string;
  try {
    newOwner = ethers.getAddress(newOwnerRaw);
  } catch {
    throw new ScriptError(
      `${ownerSecretName} is not a valid eth address (bad checksum)`
    );
  }
  if (newOwner === ethers.ZeroAddress) {
    throw new ScriptError(`${ownerSecretName} must not be the zero address`);
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
    throw new ScriptError(
      'PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT secret is required and must be a valid secp256k1 key'
    );
  }
  const ownerSigner = new ethers.Wallet(ownerKey, ethers.provider);
  const ownerAddress = await ownerSigner.getAddress();

  // Network
  const { chainId } = await ethers.provider.getNetwork();

  // --- 3. On-chain checks ---
  const code = await ethers.provider.getCode(batcherAddress);
  if (!code || code === '0x') {
    throw new ScriptError(
      'No contract code at the given BATCHER_ADDRESS on this network. Check the address and network.'
    );
  }

  const batcher = await ethers.getContractAt(
    'Batcher',
    batcherAddress,
    ownerSigner
  );

  // Verify current ownership (Ownable2Step)
  let owner: string;
  try {
    owner = await batcher.owner();
  } catch {
    throw new ScriptError(
      'Contract at BATCHER_ADDRESS does not respond to owner(); verify the address is a deployed contract on this network'
    );
  }
  if (owner.toLowerCase() !== ownerAddress.toLowerCase()) {
    throw new ScriptError(
      'Signer is not the current owner of the Batcher contract'
    );
  }

  logger.info(`Network chainId: ${chainId}`);

  // Idempotency awareness: a transfer to the new owner may already be pending
  // from a previous run. Re-sending is harmless — transferOwnership replaces
  // the pending transfer — but warn so the operator knows.
  let currentPendingOwner: string;
  try {
    currentPendingOwner = await batcher.pendingOwner();
  } catch {
    throw new ScriptError(
      'Contract at BATCHER_ADDRESS does not implement Ownable2Step (pendingOwner); this script requires an Ownable2Step Batcher'
    );
  }
  if (currentPendingOwner.toLowerCase() === newOwner.toLowerCase()) {
    logger.warn(
      'A pending ownership transfer to the new owner is already active; re-sending transferOwnership (replaces it)'
    );
  }

  // --- 4. Gas resolution (per-chain strategies from batcherDeployGasConfig) ---
  // Reuse the deployment gas config: per-chain fee-model quirks (eip1559-fees /
  // manual-gas / forceLegacy / block-gas caps / min priority fee) are already
  // encoded there. This deliberately does NOT reuse the deployment gasParams,
  // whose deployment-scale gasLimit caused the original failure (5M gasLimit
  // multiplied by maxFeePerGas exceeded the signer's balance and the node
  // rejected the transaction).
  const feeData = await ethers.provider.getFeeData();
  const transferCalldata = batcher.interface.encodeFunctionData(
    'transferOwnership',
    [newOwner]
  );
  const gasOverrides = await resolveGasOverrides(
    Number(chainId),
    feeData,
    ownerSigner,
    { to: batcherAddress, data: transferCalldata },
    ownerAddress
  );
  if (gasOverrides) {
    logger.info(
      'Gas strategy overrides applied (strategy resolved by chain config)'
    );
  } else {
    logger.info('Gas overrides: none (Hardhat auto-detection)');
  }

  // --- 5. Pre-flight gas estimate + balance check (fail fast, sanitized) ---
  // Plain estimate without fee params — accepted by all nodes regardless of
  // fee model (same technique as the manual-gas strategy in
  // batcherDeployGasConfig.ts).
  let estimatedGas: bigint;
  try {
    estimatedGas = await ownerSigner.estimateGas({
      from: ownerAddress,
      to: batcherAddress,
      data: transferCalldata
    });
  } catch {
    throw new ScriptError(
      'Gas estimation failed: transferOwnership would revert on-chain. Verify the signer is the current owner and the target is a Batcher'
    );
  }

  // Worst-case up-front requirement the node enforces: gasLimit * fee cap.
  const effectiveGasPrice =
    gasOverrides?.gasPrice ??
    gasOverrides?.maxFeePerGas ??
    feeData.maxFeePerGas ?? // when overrides are undefined ethers fills maxFeePerGas itself
    feeData.gasPrice ??
    1_000_000_000n;
  const gasLimitForCost =
    gasOverrides?.gasLimit != null
      ? BigInt(gasOverrides.gasLimit)
      : estimatedGas;
  // 1.5x buffer
  const requiredCost = applyBalanceSafetyBuffer(
    gasLimitForCost * effectiveGasPrice
  );
  const signerBalance = await ethers.provider.getBalance(ownerAddress);
  if (signerBalance < requiredCost) {
    throw new ScriptError(
      `Insufficient signer balance for gas: required ~${ethers.formatEther(
        requiredCost
      )} (incl. 1.5x buffer), have ${ethers.formatEther(
        signerBalance
      )}. Fund the signer account and re-run`
    );
  }
  logger.info('Signer balance is sufficient for the transfer (1.5x buffered)');

  // --- 6. Initiate ownership transfer (step 1 of Ownable2Step) ---
  let tx: ContractTransactionResponse;
  try {
    tx = await batcher.transferOwnership(newOwner, gasOverrides ?? {});
  } catch (err) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      err.code === 'INSUFFICIENT_FUNDS'
    ) {
      throw new ScriptError(
        'Signer balance is insufficient for gas (node rejected the transaction); fund the signer account and re-run'
      );
    }
    throw err;
  }
  try {
    await tx.wait();
  } catch {
    throw new ScriptError(
      'The transferOwnership transaction failed to mine (reverted or dropped). Check the latest outgoing transactions of the signer address in the block explorer before re-running'
    );
  }
  const pendingOwner: string = await batcher.pendingOwner();
  if (pendingOwner.toLowerCase() !== newOwner.toLowerCase()) {
    throw new ScriptError(
      'transferOwnership did not set the expected pending owner'
    );
  }
  logger.info('Ownership transfer initiated (tx mined)');

  logger.success(
    'Done ✅ — the new owner must call acceptOwnership on-chain to complete the transfer'
  );
}

main().catch((err) => {
  if (err instanceof ScriptError) {
    logger.error(`Failed: ${err.message}`);
  } else {
    logger.error('Failed: unexpected error (details suppressed)');
  }
  process.exit(1);
});
