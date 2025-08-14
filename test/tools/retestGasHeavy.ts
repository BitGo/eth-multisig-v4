import hre, { ethers } from 'hardhat';

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
  const feeData = await ethers.provider.getFeeData();
  const f = await ethers.getContractFactory('GasHeavy', deployer);
  const { chainId } = await ethers.provider.getNetwork();
  if (Number(chainId) === 50312 || Number(chainId) === 5031) {
    const minPriority = 1_000_000_000n; // 1 gwei
    const priority =
      (feeData.maxPriorityFeePerGas ?? 0n) > 0n
        ? (feeData.maxPriorityFeePerGas as bigint)
        : minPriority;
    const base = feeData.maxFeePerGas ?? 0n;
    const maxFee = base > priority * 2n ? base : priority * 2n;
    const overridesLocal: any = {
      maxFeePerGas: maxFee,
      maxPriorityFeePerGas: priority
    };
    const txReq = await f.getDeployTransaction();
    const est = await deployer.estimateGas({
      ...txReq,
      from: await deployer.getAddress(),
      ...overridesLocal
    });
    const latest = await ethers.provider.getBlock('latest');
    let gl = Number((est * 120n) / 100n);
    if (latest && latest.gasLimit)
      gl = Math.min(gl, Math.floor(Number(latest.gasLimit) * 0.95));
    overridesLocal.gasLimit = gl;
    const c = await f.deploy(overridesLocal);
    await c.waitForDeployment();
    return c.target as string;
  }
  const c = await f.deploy();
  await c.waitForDeployment();
  return c.target as string;
}

async function main() {
  const signers = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${hre.network.name} (chainId ${network.chainId})`);

  function getArg(name: string): string | undefined {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
  }
  const batcherAddr: string | undefined =
    getArg('--batcher') ||
    getArg('--address') ||
    getArg('--addr') ||
    process.env.BATCHER_ADDRESS ||
    process.env.BATCHER;
  if (!batcherAddr) {
    throw new Error(
      'Missing batcher address. Usage: npx hardhat run test/tools/retestGasHeavy.ts --network <net> -- --batcher <address>'
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
    const c = await ethers.getContractAt(
      'Batcher',
      batcherAddr as string,
      signers[0]
    );
    const ownerOnChain = (await c.owner()).toLowerCase();
    for (const s of signers) {
      if ((await s.getAddress()).toLowerCase() === ownerOnChain) return s;
    }
    const argKey = getArg('--owner-key');
    const pk =
      argKey ||
      process.env.OWNER_PRIVATE_KEY ||
      process.env.OWNER_KEY ||
      process.env.PRIVATE_KEY;
    if (pk && /^0x[0-9a-fA-F]{64}$/.test(pk)) {
      const wallet = new ethers.Wallet(pk, ethers.provider);
      if ((await wallet.getAddress()).toLowerCase() === ownerOnChain) {
        return wallet;
      }
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
    gasHeavy = await deployGasHeavy(deployer);
    console.log('GasHeavy deployed at', gasHeavy);
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
