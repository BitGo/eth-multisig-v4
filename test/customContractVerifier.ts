/**
 * @file Test suite for the customContractVerifier.ts script.
 * @description This file uses Mocha, Chai, and Sinon to test the verification logic
 * by mocking external dependencies like axios and the Hardhat Runtime Environment.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import axios from 'axios';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { verifyOnCustomEtherscan } from '../scripts/customContractVerifier';
import { logger } from '../deployUtils';

describe('customContractVerifier', () => {
  let mockHre: HardhatRuntimeEnvironment;
  let axiosPostStub: sinon.SinonStub;
  let axiosGetStub: sinon.SinonStub;
  let loggerSuccessStub: sinon.SinonStub;
  let loggerWarnStub: sinon.SinonStub;
  let loggerInfoStub: sinon.SinonStub;

  // Before each test, set up the mocks and stubs
  beforeEach(() => {
    // Mock the HRE object and its methods to simulate a real environment
    mockHre = {
      config: {
        etherscan: {
          apiKey: { somniaTestnet: 'test_api_key' },
          customChains: [
            {
              network: 'somniaTestnet',
              chainId: 50312,
              urls: {
                apiURL: 'https://fake-api.somnia.network/api',
                browserURL: 'https://fake-explorer.somnia.network'
              }
            }
          ]
        }
      },
      artifacts: {
        readArtifact: sinon.stub().resolves({
          sourceName: 'contracts/MyContract.sol',
          contractName: 'MyContract'
        }),
        getBuildInfo: sinon.stub().resolves({
          solcVersion: '0.8.20+commit.a1b79de6',
          input: {
            settings: {
              optimizer: { enabled: true, runs: 200 }
            }
          }
        })
      },
      run: sinon
        .stub()
        .withArgs('flatten:get-flattened-sources')
        .resolves(
          '// SPDX-License-Identifier: MIT\npragma solidity 0.8.20; contract MyContract {}'
        ),
      ethers: {
        provider: {
          getNetwork: sinon.stub().resolves({ chainId: 50312 })
        },
        // --- Ethers v6 Fix ---
        // The way constructor arguments are encoded for verification has changed.
        // We now mock `getDeployTransaction` which returns an object with the encoded data.
        // This replaces the older `interface.encodeDeploy` pattern.
        getContractFactory: sinon.stub().resolves({
          getDeployTransaction: sinon.stub().resolves({
            data: '0xencodedargs'
          })
        })
      }
    } as any;

    // Stub axios methods to prevent real network calls
    axiosPostStub = sinon.stub(axios, 'post');
    axiosGetStub = sinon.stub(axios, 'get');

    // Stub logger methods to inspect calls and prevent console output during tests
    loggerSuccessStub = sinon.stub(logger, 'success');
    loggerWarnStub = sinon.stub(logger, 'warn');
    loggerInfoStub = sinon.stub(logger, 'info');
  });

  // After each test, restore the original methods
  afterEach(() => {
    sinon.restore();
  });

  // --- Test Cases ---

  it('should verify a contract successfully on the first attempt', async () => {
    // Arrange: Simulate a successful API response sequence
    axiosPostStub.resolves({ data: { status: '1', result: 'test_guid' } });
    axiosGetStub
      .withArgs(sinon.match.any, {
        params: sinon.match({ action: 'checkverifystatus' })
      })
      .resolves({ data: { status: '1', result: 'Pass - Verified' } });

    // Act
    await verifyOnCustomEtherscan({
      hre: mockHre,
      contractAddress: '0x123',
      contractName: 'MyContract',
      constructorArguments: []
    });

    // Assert: Check that the success message was logged and no warnings were issued
    expect(loggerSuccessStub.calledWith('Contract successfully verified!')).to.be.true;
    expect(loggerWarnStub.called).to.be.false;
  });

  it('should succeed on the fallback check if the initial status check fails', async () => {
    // Arrange: Simulate a primary failure, but a successful fallback
    axiosPostStub.resolves({ data: { status: '1', result: 'test_guid' } });
    // The status check fails...
    axiosGetStub
      .withArgs(sinon.match.any, {
        params: sinon.match({ action: 'checkverifystatus' })
      })
      .rejects(
        new Error('Verification failed. Reason: Fail - Unable to verify')
      );
    // But the getsourcecode fallback succeeds
    axiosGetStub
      .withArgs(sinon.match.any, {
        params: sinon.match({ action: 'getsourcecode' })
      })
      .resolves({
        data: { status: '1', result: [{ SourceCode: 'pragma solidity...' }] }
      });

    // Act
    await verifyOnCustomEtherscan({
      hre: mockHre,
      contractAddress: '0x123',
      contractName: 'MyContract',
      constructorArguments: []
    });

    // Assert: Check that the fallback success message was logged
    expect(
      loggerSuccessStub.calledWith(
        'Fallback check successful: Contract source code is available. Assuming verified.'
      )
    ).to.be.true;
    expect(
      loggerWarnStub.calledWithMatch('Initial verification attempt failed')
    ).to.be.true;
  });

  it('should throw an error if both the initial attempt and fallback check fail', async () => {
    // Arrange: Simulate failure for both the primary and fallback checks
    const initialError = new Error(
      'Verification failed. Reason: Fail - Unable to verify'
    );
    axiosPostStub.resolves({ data: { status: '1', result: 'test_guid' } });
    axiosGetStub
      .withArgs(sinon.match.any, {
        params: sinon.match({ action: 'checkverifystatus' })
      })
      .rejects(initialError);
    // The getsourcecode fallback also fails
    axiosGetStub
      .withArgs(sinon.match.any, {
        params: sinon.match({ action: 'getsourcecode' })
      })
      .resolves({
        data: { status: '0', result: 'Contract source code not verified' }
      });

    // Act & Assert
    try {
      await verifyOnCustomEtherscan({
        hre: mockHre,
        contractAddress: '0x123',
        contractName: 'MyContract',
        constructorArguments: []
      });
      // If it doesn't throw, the test should fail
      expect.fail('Expected verifyOnCustomEtherscan to throw, but it did not.');
    } catch (error: any) {
      expect(error).to.equal(initialError);
      expect(loggerWarnStub.calledWith('Fallback check also failed.')).to.be
        .true;
    }
  });

  it('should handle the "Already Verified" case gracefully during submission', async () => {
    // Arrange: Simulate the API responding with "Already Verified" during submission
    axiosPostStub.rejects(new Error('Contract is already verified.'));

    // Act
    await verifyOnCustomEtherscan({
      hre: mockHre,
      contractAddress: '0x123',
      contractName: 'MyContract',
      constructorArguments: []
    });

    // Assert: Check that the correct success message was logged
    expect(loggerSuccessStub.calledWith('Contract is already verified.')).to.be
      .true;
  });
});
