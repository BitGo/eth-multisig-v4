import { ethers } from 'hardhat';
import { getCoinLimits } from '../../config/coinBatcherLimits';

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  const coin = (process.env.COIN || 'stt').toLowerCase();
  const limits = getCoinLimits(coin)[Number(chainId)] || {};
  let addr: string | undefined = process.env.BATCHER || limits.batcher;
  if (!addr) {
    try {
      const output = require('../../output.json');
      addr = output.batcher;
    } catch {}
  }
  if (!addr) {
    throw new Error(
      `Missing BATCHER and no registry entry for coin='${coin}' chainId=${chainId}`
    );
  }
  const signers = await ethers.getSigners();
  const s = signers[2] || signers[0];
  const c = await ethers.getContractAt('Batcher', addr, s);
  const owner = await c.owner();
  const lim = await (c as any).transferGasLimit();
  console.log(
    JSON.stringify({ addr, owner, transferGasLimit: lim.toString() }, null, 2)
  );
}

// Only execute when run directly (not when required by Mocha)
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
