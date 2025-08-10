import { expect } from 'chai';
import fs from 'fs';
import sinon from 'sinon';
import { ethers } from 'hardhat';
import { loadOutput, saveOutput, deployIfNeededAtNonce } from '../deployUtils';
import { Contract } from 'ethers'; // Import the generic Contract type for assertions

describe('deployUtils (using Hardhat)', function () {
  let deployerAddress: string;
  let sandbox: sinon.SinonSandbox;
  const deployFn = sinon.fake.resolves('0xdummy');

  before(async () => {
    const [deployer] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('loadOutput returns empty if file does not exist', () => {
    sandbox.stub(fs, 'existsSync').returns(false);
    const output = loadOutput();
    expect(output).to.deep.equal({});
  });

  it('loadOutput reads JSON from file correctly', () => {
    // --- Fix: Use a valid property from the DeploymentAddresses type ---
    const fakeData = JSON.stringify({ walletImplementation: '0xabc' });
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs, 'readFileSync').returns(fakeData);

    const output = loadOutput();
    expect(output).to.deep.equal({ walletImplementation: '0xabc' });
  });

  it('saveOutput writes JSON file with correct structure', () => {
    const writeStub = sandbox.stub(fs, 'writeFileSync').returns();
    // --- Fix: Use a valid property from the DeploymentAddresses type ---
    const data = { walletFactory: '0xdef' };
    saveOutput(data);
    expect(writeStub.calledWith('output.json', JSON.stringify(data, null, 2)))
      .to.be.true;
  });

  it('saveOutput overwrites file if already exists', () => {
    const writeStub = sandbox.stub(fs, 'writeFileSync').returns();
    // --- Fix: Use a valid property from the DeploymentAddresses type ---
    saveOutput({ forwarderImplementation: '0x123' });
    expect(writeStub.callCount).to.equal(1);
  });

  it('deployIfNeededAtNonce deploys contract if nonce matches', async () => {
    const Dummy = await ethers.getContractFactory('WalletSimple');
    const contract = await Dummy.deploy();
    // --- Ethers v6 Fix: Use waitForDeployment() instead of deployed() ---
    await contract.waitForDeployment();

    // --- Ethers v6 / TypeScript Fix: Use getAddress() with a type assertion ---
    const contractAddress = await (contract as unknown as Contract).getAddress();
    const deployFn = async () => contractAddress;

    const currentNonce = await ethers.provider.getTransactionCount(
      deployerAddress
    );
    const deployedAddress = await deployIfNeededAtNonce(
      undefined,
      currentNonce,
      deployerAddress,
      'WalletSimple',
      deployFn
    );

    expect(deployedAddress).to.equal(contractAddress);
  });

  it('skips deployment if nonce is higher', async () => {
    const currentNonce = await ethers.provider.getTransactionCount(
      deployerAddress
    );
    const expectedNonce = currentNonce - 1; // to simulate nonce already past

    const result = await deployIfNeededAtNonce(
      undefined,
      expectedNonce,
      deployerAddress,
      'WalletSimple',
      deployFn
    );

    // --- Ethers v6 Fix: Use getCreateAddress instead of the manual helper ---
    // We use `(ethers as any)` to bypass a common TypeScript type resolution issue with Hardhat.
    const predicted = (ethers as any).getCreateAddress({
      from: deployerAddress,
      nonce: expectedNonce
    });

    expect(result).to.equal(predicted);
    expect(deployFn.called).to.be.false;
  });
});
