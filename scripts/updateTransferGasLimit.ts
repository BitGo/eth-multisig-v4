import { ethers } from 'hardhat';
import { getChainConfig } from './chainConfig';
import { getBatcherGasParams } from '../config/configGasParams';
import { getCoinLimits } from '../config/coinBatcherLimits';

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  // Choose signer: --signer-index N or --from 0xAddress; default to first signer
  const signers = await ethers.getSigners();
  const fromArg = getArg('--from')?.toLowerCase();
  const idxArg = getArg('--signer-index');
  let signer = signers[0];
  if (idxArg) {
    const idx = Number(idxArg);
    if (!Number.isInteger(idx) || idx < 0 || idx >= signers.length) {
      throw new Error(
        `Invalid --signer-index ${idxArg}. Available: 0..${signers.length - 1}`
      );
    }
    signer = signers[idx];
  } else if (fromArg) {
    const found = await Promise.all(
      signers.map(async (s, i) => ({
        i,
        addr: (await s.getAddress()).toLowerCase(),
        s
      }))
    );
    const match = found.find((x) => x.addr === fromArg);
    if (!match) {
      const addrs = await Promise.all(signers.map((s) => s.getAddress()));
      throw new Error(
        `--from ${fromArg} not in configured signers. Available: ${addrs.join(
          ', '
        )}`
      );
    }
    signer = match.s;
  }
  let from = await signer.getAddress();
  const { chainId } = await ethers.provider.getNetwork();
  const chainConfig = await getChainConfig(Number(chainId));
  const gasOverrides = chainConfig?.gasParams ?? {};

  // coin can be provided; defaults to 'stt' to match your example
  const coin = (getArg('--coin') || process.env.COIN || 'stt').toLowerCase();
  const coinLimits = getCoinLimits(coin);
  const preconfigured = coinLimits[Number(chainId)] || {};

  // Try CLI/env, then coin registry
  // Allow both BATCHER_ADDRESS and legacy BATCHER env var
  const fromArgs =
    getArg('--batcher') || process.env.BATCHER_ADDRESS || process.env.BATCHER;
  let batcherAddress = fromArgs || preconfigured.batcher;
  if (!batcherAddress) {
    throw new Error(
      `Missing batcher address. Options:\n` +
        `  - Pass --batcher <address>\n` +
        `  - Set BATCHER_ADDRESS env var\n` +
        `  - Add an entry for coin '${coin}' and chainId ${chainId} in config/coinBatcherLimits.ts`
    );
  }

  // Auto-pick the owner signer if no explicit signer provided
  if (!idxArg && !fromArg) {
    try {
      const tmp = await ethers.getContractAt(
        'Batcher',
        batcherAddress,
        signers[0]
      );
      const ownerOnChain = (await tmp.owner()).toLowerCase();
      const addrs = await Promise.all(
        signers.map(async (s) => (await s.getAddress()).toLowerCase())
      );
      const ownerIdx = addrs.findIndex((a) => a === ownerOnChain);
      if (ownerIdx !== -1) {
        signer = signers[ownerIdx];
        from = await signer.getAddress();
      }
    } catch (e) {
      // ignore auto-pick failures; ownership check below will handle errors
    }
  }

  // Determine the limit from TS config (coin/chain specific) unless an env override is provided (for CI/workflow use).
  const fallbackLimit =
    preconfigured.transferGasLimit ??
    getBatcherGasParams(Number(chainId)).transferGasLimit;

  const envOverrideRaw =
    process.env.TRANSFER_GAS_LIMIT ??
    process.env.GAS_LIMIT ??
    process.env.BATCHER_TRANSFER_GAS_LIMIT ??
    undefined;
  const usingOverride =
    envOverrideRaw != null && String(envOverrideRaw).trim() !== '';
  const normalized = usingOverride
    ? String(envOverrideRaw).replace(/_/g, '').trim()
    : undefined;
  const parsed = usingOverride ? Number(normalized) : fallbackLimit;
  if (Number.isNaN(parsed)) throw new Error('Invalid gas limit override');
  const newLimit = BigInt(parsed);
  if (newLimit < 2300n) throw new Error('newLimit must be >= 2300');

  const batcher = await ethers.getContractAt('Batcher', batcherAddress, signer);

  // Verify ownership (Ownable2Step)
  const owner: string = await batcher.owner();
  if (owner.toLowerCase() !== from.toLowerCase()) {
    throw new Error(`Caller is not owner. Owner=${owner}, Caller=${from}`);
  }

  console.log(`Network: ${chainId}`);
  console.log(`Batcher: ${batcherAddress}`);
  console.log(`Caller:  ${from}`);
  console.log(
    `New transferGasLimit: ${newLimit.toString()} (${
      usingOverride ? 'from env override' : 'from TS config'
    })`
  );

  try {
    const current = await (batcher as any).transferGasLimit();
    console.log(`Current transferGasLimit: ${current.toString()}`);
  } catch {
    console.log('Current transferGasLimit: (getter not found, skipping)');
  }

  const tx = await batcher.changeTransferGasLimit(newLimit, {
    ...gasOverrides
  });
  console.log(`Tx sent: ${tx.hash}`);
  const rc = await tx.wait();
  console.log(`Mined in block: ${rc.blockNumber}`);

  try {
    const updated = await (batcher as any).transferGasLimit();
    console.log(`Updated transferGasLimit: ${updated.toString()}`);
  } catch {
    console.log('Updated transferGasLimit: (getter not found, skipped)');
  }

  console.log('Done ✅');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
