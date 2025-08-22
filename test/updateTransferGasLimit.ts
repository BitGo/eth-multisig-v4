import { expect } from 'chai';
import { ethers } from 'hardhat';

/**
 * Tests for Batcher.changeTransferGasLimit
 * - owner can update the gas limit
 * - emits TransferGasLimitChange with correct values
 * - reverts for values < 2300
 * - non-owner cannot update
 */
describe('Batcher.changeTransferGasLimit', function () {
  it('owner can update transferGasLimit and event is emitted', async function () {
    const [owner] = await ethers.getSigners();

    const Batcher = await ethers.getContractFactory('Batcher');
    const initialTransferGasLimit = 5000n;
    const initialBatchLimit = 100n;
    const initialNativeBatchLimit = 100n;

    const batcher = (await Batcher.deploy(
      initialTransferGasLimit,
      initialBatchLimit,
      initialNativeBatchLimit
    )) as unknown as any;
    await batcher.waitForDeployment();

    expect(await batcher.transferGasLimit()).to.equal(initialTransferGasLimit);

    const newLimit = 6000n;
    await expect(batcher.connect(owner).changeTransferGasLimit(newLimit))
      .to.emit(batcher, 'TransferGasLimitChange')
      .withArgs(initialTransferGasLimit, newLimit);

    expect(await batcher.transferGasLimit()).to.equal(newLimit);
  });

  it('reverts when setting transferGasLimit below 2300', async function () {
    const Batcher = await ethers.getContractFactory('Batcher');
    const batcher = (await Batcher.deploy(5000n, 100n, 100n)) as unknown as any;
    await batcher.waitForDeployment();

    await expect(batcher.changeTransferGasLimit(2299n)).to.be.revertedWith(
      'Transfer gas limit too low'
    );
  });

  it('non-owner cannot update transferGasLimit', async function () {
    const [owner, attacker] = await ethers.getSigners();

    const Batcher = await ethers.getContractFactory('Batcher');
    const batcher = (await Batcher.deploy(5000n, 100n, 100n)) as unknown as any;
    await batcher.waitForDeployment();

    // OZ Ownable2Step (v5) custom error: OwnableUnauthorizedAccount(address)
    // Use custom error matcher when available, else generic revert.
    await expect(batcher.connect(attacker).changeTransferGasLimit(6000n)).to.be
      .reverted;
  });
});
