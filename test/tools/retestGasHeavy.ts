import hre, { ethers } from 'hardhat';
import { getChainConfig, GasParams } from '../../scripts/chainConfig';
import { CHAIN_IDS } from '../../config/chainIds';

async function pickFundedSigner(signers: any[]) {
  const infos = await Promise.all(
    signers.map(async (s, i) => ({
      index: i,
      addr: await s.getAddress(),
      bal: await ethers.provider.getBalance(await s.getAddress())
    }))
  );
  const funded = infos
    .filter((x) => x.bal > 0n)
    .sort((a, b) => (b.bal > a.bal ? 1 : -1))[0];
  if (!funded) throw new Error('No funded signer found');
  return signers[funded.index];
}

async function deployGasHeavy(deployer: any) {
  const f = await ethers.getContractFactory('GasHeavy', deployer);
  const { chainId } = await ethers.provider.getNetwork();
  const chainCfg = await getChainConfig(Number(chainId));
  const feeData = await ethers.provider.getFeeData();

  const txReq = await f.getDeployTransaction();
  const from = await deployer.getAddress();

  function is1559(params: GasParams): boolean {
    return (
      (params as any).maxFeePerGas !== undefined &&
      (params as any).maxPriorityFeePerGas !== undefined
    );
  }

  async function withEstimatedGas(overrides: any, minGasLimit?: number) {
    const est = await deployer.estimateGas({ ...txReq, from, ...overrides });
    const latest = await ethers.provider.getBlock('latest');
    let gl = Number((est * 120n) / 100n);
    if (typeof minGasLimit === 'number') {
      gl = Math.max(gl, minGasLimit);
    }
    if (latest?.gasLimit) {
      const blockLimit = Number(latest.gasLimit);
      if (!minGasLimit || blockLimit > minGasLimit) {
        gl = Math.min(gl, Math.floor(blockLimit * 0.95));
      }
    }
    return { ...overrides, gasLimit: gl };
  }

  // Start with chain-configured gas params
  let primaryOverrides: any = { ...chainCfg.gasParams };

  // Build a generic fallback: if primary is 1559, fallback to legacy gasPrice; else fallback to 1559 from feeData
  let fallbackOverrides: any;
  if (is1559(chainCfg.gasParams)) {
    fallbackOverrides = { gasPrice: feeData.gasPrice ?? 6_000_000_000n };
  } else {
    const minPriority = 1_000_000_000n; // 1 gwei
    const priority =
      (feeData.maxPriorityFeePerGas ?? 0n) > 0n
        ? (feeData.maxPriorityFeePerGas as bigint)
        : minPriority;
    const base = feeData.maxFeePerGas ?? 0n;
    const maxFee = base > priority * 2n ? base : priority * 2n;
    fallbackOverrides = {
      maxFeePerGas: maxFee,
      maxPriorityFeePerGas: priority
    };
  }

  const isSomnia =
    Number(chainId) === CHAIN_IDS.SOMNIA ||
    Number(chainId) === CHAIN_IDS.SOMNIA_TESTNET;
  const MIN_SOMNIA_GAS_LIMIT = 60_000_000;

  try {
    const o1 = await withEstimatedGas(
      primaryOverrides,
      isSomnia ? MIN_SOMNIA_GAS_LIMIT : undefined
    );
    const c = await f.deploy(o1);
    await c.waitForDeployment();
    return c.target as string;
  } catch (e) {
    // Only apply coin-specific fallback on Somnia networks
    if (isSomnia) {
      const o2 = await withEstimatedGas(
        fallbackOverrides,
        MIN_SOMNIA_GAS_LIMIT
      );
      const c2 = await f.deploy(o2);
      await c2.waitForDeployment();
      return c2.target as string;
    }
    throw e;
  }
}

async function main() {
  const signers = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${hre.network.name} (chainId ${network.chainId})`);

  const batcherAddr: string | undefined = process.env.BATCHER_ADDRESS;
  if (!batcherAddr) {
    throw new Error(
      'Missing BATCHER_ADDRESS env var. Set it to the deployed Batcher address.'
    );
  }
  const code = await ethers.provider.getCode(batcherAddr);
  if (!code || code === '0x') {
    throw new Error(
      `No contract code at ${batcherAddr}. Ensure BATCHER_ADDRESS/--batcher points to a deployed Batcher on ${hre.network.name}.`
    );
  }

  let lowLimit = BigInt(process.env.LOW_LIMIT || '2300');
  if (lowLimit < 2300n) {
    console.log(
      `LOW_LIMIT ${lowLimit} is below minimum 2300; clamping to 2300`
    );
    lowLimit = 2300n;
  }
  const highLimit = BigInt(process.env.HIGH_LIMIT || '300000');
  const amountWei = BigInt(process.env.AMOUNT_WEI || '100000000000000');

  // Helper to get the owner signer
  async function tryGetOwnerSigner() {
    let ownerOnChain: string | undefined;
    try {
      const c = await ethers.getContractAt(
        'Batcher',
        batcherAddr as string,
        signers[0]
      );
      ownerOnChain = (await c.owner()).toLowerCase();
    } catch (e: any) {
      console.warn(
        `Warning: failed to read owner() from Batcher at ${batcherAddr}: ${
          e?.shortMessage || e?.message || e
        }`
      );
    }

    if (ownerOnChain) {
      for (const s of signers) {
        if ((await s.getAddress()).toLowerCase() === ownerOnChain) return s;
      }
    }

    const pk =
      process.env.OWNER_PRIVATE_KEY ||
      process.env.OWNER_KEY ||
      process.env.PRIVATE_KEY;
    if (pk && /^0x[0-9a-fA-F]{64}$/.test(pk)) {
      const wallet = new ethers.Wallet(pk, ethers.provider);
      if (!ownerOnChain) {
        console.warn(
          `Owner address not known; using provided OWNER key ${await wallet.getAddress()} without on-chain verification.`
        );
        return wallet;
      }
      if ((await wallet.getAddress()).toLowerCase() === ownerOnChain) {
        return wallet;
      }
      console.warn(
        `Provided OWNER key ${await wallet.getAddress()} does not match on-chain owner ${ownerOnChain}. Ignoring.`
      );
    }
    return undefined;
  }

  let ownerSigner = await tryGetOwnerSigner();
  if (ownerSigner) {
    console.log(`Applying LOW gas (owner call): ${lowLimit} ...`);
    const c = await ethers.getContractAt(
      'Batcher',
      batcherAddr as string,
      ownerSigner
    );
    const tx = await (c as any).changeTransferGasLimit(lowLimit);
    await tx.wait();
  } else {
    console.log(
      'Owner signer not available. Skipping LOW limit change. (Set OWNER_PRIVATE_KEY to enable)'
    );
  }

  let gasHeavy = process.env.GAS_HEAVY;
  if (!gasHeavy) {
    const deployer = await pickFundedSigner(signers);
    console.log('Deploying GasHeavy with', await deployer.getAddress());
    try {
      gasHeavy = await deployGasHeavy(deployer);
      console.log('GasHeavy deployed at', gasHeavy);
    } catch (e: any) {
      // Some RPCs return a revert even when the contract ends up deployed; attempt recovery.
      const receipt = e?.receipt || e?.transaction?.receipt;
      const addr = receipt?.contractAddress;
      console.warn(
        'GasHeavy deployment threw:',
        e?.shortMessage || e?.message || e
      );
      if (addr) {
        try {
          // Retry a couple times in case the RPC is lagging on code availability
          for (let i = 0; i < 3; i++) {
            const codeAt = await ethers.provider.getCode(addr);
            if (codeAt && codeAt !== '0x') {
              console.warn(
                `Contract code detected at ${addr} despite error; proceeding.`
              );
              gasHeavy = addr;
              break;
            }
            await new Promise((r) => setTimeout(r, 500));
          }
        } catch {}
      }
      if (!gasHeavy) {
        console.error(
          'Failed to deploy GasHeavy and no valid address recovered from receipt.'
        );
        console.error(
          'Set GAS_HEAVY env var to a pre-deployed GasHeavy address and re-run.'
        );
        throw e;
      }
    }
  } else {
    console.log('Using existing GasHeavy at', gasHeavy);
  }

  const batchCaller = await pickFundedSigner(signers);
  const batcher = await ethers.getContractAt(
    'Batcher',
    batcherAddr,
    batchCaller
  );
  console.log(
    'Attempting batch with low limit from',
    await batchCaller.getAddress()
  );
  let lowFailed = false;
  try {
    const tx = await (batcher as any).batch([gasHeavy], [amountWei], {
      value: amountWei
    });
    const rc = await tx.wait();
    console.log(
      'Unexpected success at low limit. Tx:',
      tx.hash,
      'status',
      rc.status
    );
  } catch (e: any) {
    console.log(
      'Expected failure at low limit:',
      e?.shortMessage || e?.message || e
    );
    lowFailed = true;
  }

  ownerSigner = ownerSigner || (await tryGetOwnerSigner());
  if (ownerSigner) {
    console.log(`Applying HIGH gas (owner call): ${highLimit} ...`);
    const c = await ethers.getContractAt(
      'Batcher',
      batcherAddr as string,
      ownerSigner
    );
    const tx = await (c as any).changeTransferGasLimit(highLimit);
    await tx.wait();
  } else {
    console.log(
      'Owner signer not available. Skipping HIGH limit change. (Set OWNER_PRIVATE_KEY to enable)'
    );
  }

  console.log('Attempting batch with high limit...');
  const tx3 = await (batcher as any).batch([gasHeavy], [amountWei], {
    value: amountWei
  });
  const rc3 = await tx3.wait();
  console.log('High-limit batch status:', rc3.status, 'Tx:', tx3.hash);

  console.log('\nSummary:');
  console.log('  Low-limit attempt failed as expected:', lowFailed);
  console.log('  High-limit attempt tx:', tx3.hash);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
