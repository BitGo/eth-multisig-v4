import { ContractTransactionResponse } from 'ethers';
import hre, { ethers } from 'hardhat';
import { Artifact } from 'hardhat/types';
import { BATCHER_CHAINS } from '../config/batcherChains';
import { resolveGasOverrides } from '../config/batcherDeployGasConfig';
import { applyBalanceSafetyBuffer, logger } from '../deployUtils';

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

// Script-authored error carrying a sanitized, log-safe message. Only these are
// printed at the catch site; dependency errors (e.g. ethers mined-revert
// messages embed contract/owner addresses and the tx hash) are replaced by a
// fixed message.
class ScriptError extends Error {}

type ChainOutcome =
  | { network: string; status: 'transferred' }
  | { network: string; status: 'no-op'; reason: string }
  | { network: string; status: 'failed'; reason: string };

// Immutable per-run context built by main() from the environment; every chain
// in the sweep shares it.
type ChainContext = {
  batcherAddress: string;
  newOwner: string;
  ownerWallet: ethers.Wallet;
  ownerAddress: string;
  batcherArtifact: Artifact;
};

// Resolve a hardhat HTTP network entry without unchecked casts. Only entries
// with a string `url` and numeric `chainId` are usable by the sweep.
function getHttpNetworkConfig(
  name: string
): { url: string; chainId: number } | undefined {
  const config: unknown = hre.config.networks[name];
  if (
    typeof config !== 'object' ||
    config === null ||
    !('url' in config) ||
    !('chainId' in config)
  ) {
    return undefined;
  }
  if (typeof config.url !== 'string' || typeof config.chainId !== 'number') {
    return undefined;
  }
  return { url: config.url, chainId: config.chainId };
}

async function processChain(
  network: string,
  ctx: ChainContext
): Promise<ChainOutcome> {
  const cfg = getHttpNetworkConfig(network);
  if (!cfg) {
    throw new ScriptError(
      `'${network}' is not a configured HTTP network in hardhat.config.ts`
    );
  }
  const provider = new ethers.JsonRpcProvider(cfg.url, cfg.chainId);
  try {
    // The provider verifies the RPC's actual chainId against the expected one
    // on first use; surface an unreachable/mismatched RPC as a sanitized
    // per-chain failure.
    let chainId: bigint;
    try {
      ({ chainId } = await provider.getNetwork());
      if (Number(chainId) !== cfg.chainId) {
        throw new Error();
      }
    } catch {
      throw new ScriptError(
        'RPC unreachable or returned an unexpected chainId'
      );
    }

    const signer = ctx.ownerWallet.connect(provider);
    const batcher = new ethers.Contract(
      ctx.batcherAddress,
      ctx.batcherArtifact.abi,
      signer
    );

    // --- On-chain checks ---
    const code = await provider.getCode(ctx.batcherAddress);
    if (!code || code === '0x') {
      throw new ScriptError(
        'No contract code at the given BATCHER_ADDRESS on this network. Check the address and network.'
      );
    }

    // Verify current ownership (Ownable2Step)
    let owner: string;
    try {
      owner = await batcher.owner();
    } catch {
      throw new ScriptError(
        'Contract at BATCHER_ADDRESS does not respond to owner(); verify the address is a deployed contract on this network'
      );
    }
    if (owner.toLowerCase() === ctx.newOwner.toLowerCase()) {
      return {
        network,
        status: 'no-op',
        reason: 'ownership is already transferred to the new owner'
      };
    }
    if (owner.toLowerCase() !== ctx.ownerAddress.toLowerCase()) {
      throw new ScriptError(
        'Signer is not the current owner of the Batcher contract'
      );
    }

    logger.info(`[${network}] Network chainId: ${chainId}`);

    // Idempotency awareness: a pending transfer to the new owner from a
    // previous run is a no-op (nothing to send). A pending transfer to a
    // DIFFERENT address is replaced (transferOwnership overrides it).
    let currentPendingOwner: string;
    try {
      currentPendingOwner = await batcher.pendingOwner();
    } catch {
      throw new ScriptError(
        'Contract at BATCHER_ADDRESS does not implement Ownable2Step (pendingOwner); this script requires an Ownable2Step Batcher'
      );
    }
    if (currentPendingOwner.toLowerCase() === ctx.newOwner.toLowerCase()) {
      return {
        network,
        status: 'no-op',
        reason: 'pending owner is already set to new owner'
      };
    }
    if (currentPendingOwner !== ethers.ZeroAddress) {
      logger.warn(
        `[${network}] an existing pending transfer to a different address will be replaced`
      );
    }

    // --- Gas resolution (per-chain strategies from batcherDeployGasConfig) ---
    // Reuse the deployment gas config: per-chain fee-model quirks
    // (eip1559-fees / manual-gas / forceLegacy / block-gas caps / min priority
    // fee) are already encoded there. The deployment gasParams are NOT reused:
    // their deployment-scale gasLimit caused a real failure (5M gasLimit
    // multiplied by maxFeePerGas exceeded the signer's balance and the node
    // rejected the transaction).
    const feeData = await provider.getFeeData();
    const transferCalldata = batcher.interface.encodeFunctionData(
      'transferOwnership',
      [ctx.newOwner]
    );
    const gasOverrides = await resolveGasOverrides(
      Number(chainId),
      feeData,
      signer,
      { to: ctx.batcherAddress, data: transferCalldata },
      ctx.ownerAddress
    );
    if (gasOverrides) {
      logger.info(
        `[${network}] Gas strategy overrides applied (strategy resolved by chain config)`
      );
    } else {
      logger.info(`[${network}] Gas overrides: none (Hardhat auto-detection)`);
    }

    // --- Pre-flight gas estimate + balance check (fail fast, sanitized) ---
    // Plain estimate without fee params — accepted by all nodes regardless of
    // fee model (same technique as the manual-gas strategy in
    // batcherDeployGasConfig.ts).
    let estimatedGas: bigint;
    try {
      estimatedGas = await signer.estimateGas({
        from: ctx.ownerAddress,
        to: ctx.batcherAddress,
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
    const signerBalance = await provider.getBalance(ctx.ownerAddress);
    if (signerBalance < requiredCost) {
      throw new ScriptError(
        `Insufficient signer balance for gas: required ~${ethers.formatEther(
          requiredCost
        )} (incl. 1.5x buffer), have ${ethers.formatEther(
          signerBalance
        )}. Fund the signer account and re-run`
      );
    }
    logger.info(
      `[${network}] Signer balance is sufficient for the transfer (1.5x buffered)`
    );

    // --- Initiate ownership transfer (step 1 of Ownable2Step) ---
    let tx: ContractTransactionResponse;
    try {
      tx = await batcher.transferOwnership(ctx.newOwner, gasOverrides ?? {});
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
    if (pendingOwner.toLowerCase() !== ctx.newOwner.toLowerCase()) {
      throw new ScriptError(
        'transferOwnership did not set the expected pending owner'
      );
    }
    return { network, status: 'transferred' };
  } finally {
    provider.destroy();
  }
}

async function main() {
  // --- 1. Env parsing + validation (fail fast; never embed sensitive values in errors) ---
  const batcherAddress = (process.env.BATCHER_ADDRESS || '').trim();
  if (!ADDRESS_REGEX.test(batcherAddress)) {
    throw new ScriptError(
      'BATCHER_ADDRESS env var is required and must be a valid 0x-prefixed address'
    );
  }

  // Environment selector (passed from the workflow's environment input);
  // decides which owner secret is used and which chain set is swept.
  const environment = (process.env.BATCHER_ENVIRONMENT || '')
    .trim()
    .toLowerCase();
  if (environment !== 'testnet' && environment !== 'mainnet') {
    throw new ScriptError(
      'BATCHER_ENVIRONMENT env var is required and must be "testnet" or "mainnet"'
    );
  }

  // Optional single-chain filter (passed from the workflow's network input as
  // an env var, never interpolated into the shell). Empty/absent: sweep all
  // supported chains for the environment.
  const networkFilter = (process.env.NETWORK || '').trim();
  if (networkFilter && !BATCHER_CHAINS[environment].includes(networkFilter)) {
    throw new ScriptError(
      `NETWORK '${networkFilter}' is not a supported chain for environment '${environment}'`
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

  // Current owner: the PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT secret (the
  // Batcher deployer key), loaded directly instead of via an
  // ethers.getSigners() index lookup. Accepts the key with or without the 0x
  // prefix (hardhat config accepts both).
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
  const ownerWallet = new ethers.Wallet(ownerKey);
  const ownerAddress = ownerWallet.address;

  const batcherArtifact = await hre.artifacts.readArtifact('Batcher');
  const ctx: ChainContext = {
    batcherAddress,
    newOwner,
    ownerWallet,
    ownerAddress,
    batcherArtifact
  };

  const chains = networkFilter
    ? [networkFilter]
    : [...BATCHER_CHAINS[environment]];
  logger.info(
    `Sweeping ${chains.length} chain(s) for environment '${environment}'`
  );

  // --- 2. Sequential sweep; a chain failure never aborts the run ---
  const results: ChainOutcome[] = [];
  for (const network of chains) {
    let outcome: ChainOutcome;
    try {
      outcome = await processChain(network, ctx);
    } catch (err) {
      outcome = {
        network,
        status: 'failed',
        reason:
          err instanceof ScriptError
            ? err.message
            : 'unexpected error (details suppressed)'
      };
    }
    if (outcome.status === 'failed') {
      logger.error(`[${network}] FAILED: ${outcome.reason}`);
    } else if (outcome.status === 'no-op') {
      logger.info(`[${network}] no-op — ${outcome.reason}`);
    } else {
      logger.success(`[${network}] ownership transfer initiated (tx mined)`);
    }
    results.push(outcome);
  }

  // --- 3. Summary (failures logged a second time here; no sensitive info) ---
  logger.step('Batcher ownership transfer summary');
  for (const r of results) {
    if (r.status === 'transferred') {
      logger.success(`  [${r.network}] transferred`);
    } else if (r.status === 'no-op') {
      logger.info(`  [${r.network}] no-op — ${r.reason}`);
    } else {
      logger.error(`  [${r.network}] FAILED — ${r.reason}`);
    }
  }
  const failed = results.filter((r) => r.status === 'failed').length;
  const noops = results.filter((r) => r.status === 'no-op').length;
  const ok = results.filter((r) => r.status === 'transferred').length;
  logger.info(
    `Chains processed: ${results.length} | transferred: ${ok} | no-op: ${noops} | failed: ${failed}`
  );
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  if (err instanceof ScriptError) {
    logger.error(`Failed: ${err.message}`);
  } else {
    logger.error('Failed: unexpected error (details suppressed)');
  }
  process.exit(1);
});
