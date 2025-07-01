import { expect } from 'chai';
import fs from 'fs';
import sinon from 'sinon';
import { ethers } from 'hardhat';
import { loadOutput, saveOutput, deployIfNeededAtNonce } from '../deployUtils';

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
    const fakeData = JSON.stringify({ wallet: '0xabc' });
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs, 'readFileSync').returns(fakeData);

    const output = loadOutput();
    expect(output).to.deep.equal({ wallet: '0xabc' });
  });

  it('saveOutput writes JSON file with correct structure', () => {
    const writeStub = sandbox.stub(fs, 'writeFileSync').returns();
    const data = { wallet: '0xdef' };
    saveOutput(data);
    expect(writeStub.calledWith('output.json', JSON.stringify(data, null, 2)))
      .to.be.true;
  });

  it('saveOutput overwrites file if already exists', () => {
    const writeStub = sandbox.stub(fs, 'writeFileSync').returns();
    saveOutput({ updated: true });
    expect(writeStub.callCount).to.equal(1);
  });

  it('deployIfNeededAtNonce deploys contract if nonce matches', async () => {
    // This simulates: need to deploy at the current nonce
    const Dummy = await ethers.getContractFactory('WalletSimple');
    const contract = await Dummy.deploy();
    await contract.deployed();

    const deployFn = async () => contract.address;

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

    expect(deployedAddress).to.equal(contract.address);
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

    const predicted = ethers.utils.getContractAddress({
      from: deployerAddress,
      nonce: expectedNonce
    });

    expect(result).to.equal(predicted);
    expect(deployFn.called).to.be.false;
  });
});
