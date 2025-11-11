import { expect } from 'chai';
import fs from 'fs';
import sinon from 'sinon';
import { ethers } from 'hardhat';
import { getCreateAddress, BaseContract } from 'ethers';
import {
  loadOutput,
  saveOutput,
  deployIfNeededAtNonce,
  waitAndVerify,
  logger
} from '../deployUtils';
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

    // Suppress logger output during tests
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'config');
    sandbox.stub(logger, 'success');
    sandbox.stub(logger, 'error');
    sandbox.stub(logger, 'warn');
    sandbox.stub(logger, 'step');
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
    const fakeData = JSON.stringify({ walletImplementation: '0xabc' });
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs, 'readFileSync').returns(fakeData);

    const output = loadOutput();
    expect(output).to.deep.equal({ walletImplementation: '0xabc' });
  });

  it('saveOutput writes JSON file with correct structure', () => {
    const writeStub = sandbox.stub(fs, 'writeFileSync').returns();

    const data = { walletFactory: '0xdef' };
    saveOutput(data);
    expect(writeStub.calledWith('output.json', JSON.stringify(data, null, 2)))
      .to.be.true;
  });

  it('saveOutput overwrites file if already exists', () => {
    const writeStub = sandbox.stub(fs, 'writeFileSync').returns();

    saveOutput({ forwarderImplementation: '0x123' });
    expect(writeStub.callCount).to.equal(1);
  });

  it('deployIfNeededAtNonce deploys contract if nonce matches', async () => {
    const Dummy = await ethers.getContractFactory('WalletSimple');
    const contract = await Dummy.deploy();

    await contract.waitForDeployment();

    const contractAddress = await (
      contract as unknown as Contract
    ).getAddress();
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

    const predicted = getCreateAddress({
      from: deployerAddress,
      nonce: expectedNonce
    });

    expect(result).to.equal(predicted);
    expect(deployFn.called).to.be.false;
  });

  describe('waitAndVerify', function () {
    let mockHre: any;
    let mockContract: BaseContract;
    let runStub: sinon.SinonStub;

    beforeEach(() => {
      // Create a stub for the run function
      runStub = sandbox.stub();

      // Mock the flatten task specifically
      runStub
        .withArgs('flatten:get-flattened-sources')
        .resolves(
          '// SPDX-License-Identifier: MIT\npragma solidity 0.8.20; contract WalletSimple {}'
        );

      // Mock HRE object with proper typing
      mockHre = {
        config: {
          sourcify: {
            enabled: false,
            apiUrl: '',
            browserUrl: ''
          },
          etherscan: {
            apiKey: { testnet: 'test_api_key' },
            customChains: [
              {
                network: 'testnet',
                chainId: 1,
                urls: {
                  apiURL: 'https://api.etherscan.io/api',
                  browserURL: 'https://etherscan.io'
                }
              }
            ]
          }
        },
        ethers: {
          provider: {
            getNetwork: sandbox.stub().resolves({ chainId: 1n })
          },
          getContractFactory: sandbox.stub().resolves({
            getDeployTransaction: sandbox.stub().resolves({
              data: '0xencodedargs'
            })
          })
        },
        artifacts: {
          readArtifact: sandbox.stub().resolves({
            sourceName: 'contracts/WalletSimple.sol',
            contractName: 'WalletSimple'
          }),
          getBuildInfo: sandbox.stub().resolves({
            solcVersion: '0.8.20+commit.a1b79de6',
            input: {
              settings: {
                optimizer: { enabled: true, runs: 200 }
              }
            }
          })
        },
        run: runStub
      };

      // Mock contract object
      const mockDeploymentTx = {
        wait: sandbox.stub().resolves()
      };

      mockContract = {
        deploymentTransaction: sandbox.stub().returns(mockDeploymentTx),
        getAddress: sandbox
          .stub()
          .resolves('0x1234567890123456789012345678901234567890')
      } as any;
    });

    it('should throw error if HRE is not defined', async () => {
      await expect(
        waitAndVerify(null as any, mockContract, 'WalletSimple', [])
      ).to.be.rejectedWith('Hardhat Runtime Environment (hre) is not defined.');
    });

    it('should successfully complete verification when standard verification succeeds', async () => {
      runStub.withArgs('verify:verify').resolves();
      await waitAndVerify(mockHre, mockContract, 'WalletSimple', []);
      expect(runStub.calledWith('verify:verify')).to.be.true;
    });

    it('should handle already verified contracts gracefully', async () => {
      const alreadyVerifiedError = new Error('Contract is already verified');
      runStub.withArgs('verify:verify').rejects(alreadyVerifiedError);
      await waitAndVerify(mockHre, mockContract, 'WalletSimple', []);
      expect(runStub.calledWith('verify:verify')).to.be.true;
    });

    it('should wait for block confirmations before verification', async () => {
      const mockDeploymentTx = {
        wait: sandbox.stub().resolves()
      };

      mockContract.deploymentTransaction = sandbox
        .stub()
        .returns(mockDeploymentTx);
      runStub.withArgs('verify:verify').resolves();

      await waitAndVerify(mockHre, mockContract, 'WalletSimple', []);

      expect(mockDeploymentTx.wait.calledWith(5)).to.be.true;
    });

    it('should pass constructor arguments to verification', async () => {
      const constructorArgs = ['0x123', '5', 'true'];
      runStub.withArgs('verify:verify').resolves();

      await waitAndVerify(
        mockHre,
        mockContract,
        'WalletSimple',
        constructorArgs
      );

      expect(
        runStub.calledWith(
          'verify:verify',
          sinon.match({
            constructorArguments: constructorArgs,
            contract: 'contracts/WalletSimple.sol:WalletSimple'
          })
        )
      ).to.be.true;
    });

    it('should attempt verify:sourcify for Hedera mainnet (chainId 295)', async function () {
      this.timeout(5000);

      mockHre.ethers.provider.getNetwork.resolves({ chainId: BigInt(295) });
      runStub.withArgs('verify:sourcify').resolves();

      await waitAndVerify(mockHre, mockContract, 'TestContract', []);

      const allCalls = runStub.getCalls().map((call) => call.args[0]);
      const sourcifyAttempted = allCalls.includes('verify:sourcify');
      const standardAttempted = allCalls.includes('verify:verify');

      expect(sourcifyAttempted).to.be.true;
      expect(standardAttempted).to.be.false;
    });

    it('should attempt verify:sourcify for Hedera testnet (chainId 296)', async function () {
      this.timeout(5000);

      mockHre.ethers.provider.getNetwork.resolves({ chainId: BigInt(296) });
      runStub.withArgs('verify:sourcify').resolves();

      await waitAndVerify(mockHre, mockContract, 'TestContract', []);

      const allCalls = runStub.getCalls().map((call) => call.args[0]);
      const sourcifyAttempted = allCalls.includes('verify:sourcify');
      const standardAttempted = allCalls.includes('verify:verify');

      expect(sourcifyAttempted).to.be.true;
      expect(standardAttempted).to.be.false;
    });

    it('should use standard verification for Ethereum mainnet (chainId 1)', async function () {
      this.timeout(5000);

      mockHre.ethers.provider.getNetwork.resolves({ chainId: BigInt(1) });
      runStub.withArgs('verify:verify').resolves();

      await waitAndVerify(mockHre, mockContract, 'TestContract', []);

      const allCalls = runStub.getCalls().map((call) => call.args[0]);
      const sourcifyAttempted = allCalls.includes('verify:sourcify');
      const standardAttempted = allCalls.includes('verify:verify');

      expect(standardAttempted).to.be.true;
      expect(sourcifyAttempted).to.be.false;
    });
  });
});
