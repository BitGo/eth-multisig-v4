/**
 * @file customContractVerifier.ts
 * @description A production-ready, modular utility to verify contracts on Etherscan-compatible explorers.
 * This script attempts to verify and uses a source-code check as a fallback before failing.
 */

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import axios from 'axios';
import querystring from 'querystring';
import { logger } from '../deployUtils';

const INITIAL_CHECK_DELAY_MS = 15000; // 15 seconds to wait after submission before the first check.

class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationError';
  }
}

/**
 * Introduces a delay.
 * @param ms - The delay duration in milliseconds.
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retrieves Etherscan configuration from the Hardhat config.
 * @param hre - The Hardhat Runtime Environment.
 * @param chainId - The ID of the target chain.
 * @returns The API URL and API key for the specified chain.
 */
async function getEtherscanConfig(
  hre: HardhatRuntimeEnvironment,
  chainId: number
) {
  const { etherscan } = hre.config;
  const { apiKey, customChains } = etherscan;

  const customChain = customChains.find((chain) => chain.chainId === chainId);
  if (!customChain || !customChain.urls || !customChain.urls.apiURL) {
    throw new VerificationError(
      `Configuration for chainId ${chainId} not found in hardhat.config.ts etherscan.customChains`
    );
  }

  const networkName = customChain.network;
  const apiUrl = customChain.urls.apiURL;

  const etherscanApiKey =
    typeof apiKey === 'object' ? apiKey[networkName] : apiKey;
  if (!etherscanApiKey) {
    throw new VerificationError(
      `Etherscan API key for network '${networkName}' not found in hardhat.config.ts.`
    );
  }

  return { apiUrl, etherscanApiKey, networkName };
}

/**
 * Parses the SPDX license identifier from the contract source code.
 * @param sourceCode The flattened source code.
 * @returns The corresponding license type number for the Etherscan API.
 */
function getLicenseType(sourceCode: string): string {
  const licenseIdentifiers = {
    Unlicense: '1',
    MIT: '3',
    'GPL-2.0': '4',
    'GPL-3.0': '5',
    'LGPL-2.1': '6',
    'LGPL-3.0': '7',
    'BSD-2-Clause': '8',
    'BSD-3-Clause': '9',
    'MPL-2.0': '10',
    'OSL-3.0': '11',
    'Apache-2.0': '12',
    'AGPL-3.0': '13'
  };
  const match = sourceCode.match(/SPDX-License-Identifier:\s*([^\s\n\r]+)/);
  if (
    match &&
    match[1] &&
    licenseIdentifiers[match[1] as keyof typeof licenseIdentifiers]
  ) {
    const license =
      licenseIdentifiers[match[1] as keyof typeof licenseIdentifiers];
    logger.info(
      `[DEBUG] Detected SPDX License: ${match[1]} (API Code: ${license})`
    );
    return license;
  }
  logger.warn(
    '[DEBUG] No SPDX license identifier found or it is not supported. Defaulting to "No License".'
  );
  return '2'; // 2 = Not-licensed
}

/**
 * Gathers all necessary contract artifacts for verification.
 * @param hre - The Hardhat Runtime Environment.
 * @param contractName - The simple name of the contract.
 * @returns An object containing the source code, ABI, version, and other build info.
 */
async function getContractArtifacts(
  hre: HardhatRuntimeEnvironment,
  contractName: string
) {
  logger.info('[DEBUG] Reading contract artifact...');
  const artifact = await hre.artifacts.readArtifact(contractName);
  const fullyQualifiedName = `${artifact.sourceName}:${artifact.contractName}`;
  logger.info(`[DEBUG] Found fully qualified name: ${fullyQualifiedName}`);

  const buildInfo = await hre.artifacts.getBuildInfo(fullyQualifiedName);
  if (!buildInfo) {
    throw new VerificationError(
      `Could not find build info for ${fullyQualifiedName}. Please compile your contracts first.`
    );
  }

  // logger.info('[DEBUG] Flattening source code...');
  const rawSourceCode = await hre.run('flatten:get-flattened-sources', {
    files: [artifact.sourceName]
  });
  // logger.info(`[DEBUG] Source code flattened: ${rawSourceCode}`);
  const cleanedSourceCode = rawSourceCode.replace(
    /^\/\/ Sources flattened with hardhat v[^\n]+\n\s*/,
    ''
  );
  logger.info(
    `[DEBUG] Source code flattened and cleaned. Length: ${
      cleanedSourceCode.length
    }. Preview (first 200 chars): ${cleanedSourceCode.substring(0, 200)}...`
  );

  const solcVersion = buildInfo.solcVersion;
  const optimizationSettings = buildInfo.input.settings.optimizer;

  const isOptimized = optimizationSettings?.enabled ?? false;
  const optimizationRuns = optimizationSettings?.runs ?? 200;

  logger.info(`[DEBUG] Compiler Version: ${solcVersion}`);
  logger.info(`[DEBUG] Optimization Enabled: ${isOptimized}`);
  logger.info(`[DEBUG] Optimization Runs: ${optimizationRuns}`);

  return {
    sourceCode: cleanedSourceCode, // Use the cleaned source code
    solcVersion,
    isOptimized,
    optimizationRuns,
    fullyQualifiedName
  };
}

/**
 * Prepares the data payload for the Etherscan API.
 * @param params - The parameters for the payload.
 * @returns The prepared data object for the POST request.
 */
function prepareVerificationPayload(params: {
  apiKey: string;
  contractAddress: string;
  sourceCode: string;
  fullyQualifiedName: string;
  solcVersion: string;
  isOptimized: boolean;
  optimizationRuns: number;
  encodedConstructorArgs: string;
}) {
  const postData = {
    apikey: params.apiKey,
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: params.contractAddress,
    sourceCode: params.sourceCode,
    codeformat: 'solidity-single-file',
    contractname: params.fullyQualifiedName,
    compilerversion: `v${params.solcVersion}`,
    optimizationUsed: params.isOptimized ? 1 : 0,
    runs: params.optimizationRuns,
    constructorArguements: params.encodedConstructorArgs,
    licenseType: getLicenseType(params.sourceCode)
  };

  logger.info(
    `[DEBUG] Preparing verification payload (first 200 chars of source): ${JSON.stringify(
      { ...postData, sourceCode: postData.sourceCode.substring(0, 200) + '...' }
    )}`
  );
  return querystring.stringify(postData);
}

/**
 * Submits the contract source code for verification.
 * @param apiUrl - The Etherscan API URL.
 * @param payload - The verification data payload.
 * @returns The GUID of the verification submission.
 */
async function submitForVerification(
  apiUrl: string,
  payload: string
): Promise<string> {
  logger.info('Submitting source code for verification...');
  const response = await axios.post(apiUrl, payload, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  logger.info(
    `[DEBUG] Submission API Response: ${JSON.stringify(response.data)}`
  );

  if (response.data.status === '1') {
    const guid = response.data.result;
    logger.success(
      `Verification request submitted successfully. GUID: ${guid}`
    );
    return guid;
  }

  if (response.data.result.toLowerCase().includes('already verified')) {
    throw new VerificationError('Contract is already verified.');
  }

  throw new VerificationError(
    `API Error during submission: ${response.data.message} - ${response.data.result}`
  );
}

/**
 * Checks the verification status a single time.
 * @param apiUrl - The Etherscan API URL.
 * @param apiKey - The Etherscan API key.
 * @param guid - The GUID of the submission to check.
 */
async function checkVerificationStatus(
  apiUrl: string,
  apiKey: string,
  guid: string
): Promise<void> {
  logger.info('Checking verification status...');
  const statusCheckParams = {
    guid,
    module: 'contract',
    action: 'checkverifystatus',
    apikey: apiKey
  };

  const statusResponse = await axios.get(apiUrl, {
    params: statusCheckParams
  });

  logger.info(
    `[DEBUG] Status Check API Response: ${JSON.stringify(statusResponse.data)}`
  );
  const resultMessage = statusResponse.data.result;
  const apiStatus = statusResponse.data.status;

  if (apiStatus === '1') {
    if (resultMessage.toLowerCase().includes('pass - verified')) {
      logger.success(`Contract successfully verified!`);
      logger.info(`Status: ${resultMessage}`);
      return; // Success
    }
    throw new VerificationError(
      `Verification failed. Reason: ${resultMessage}`
    );
  } else {
    if (resultMessage.includes('Pending in queue')) {
      throw new VerificationError('Verification is still pending.');
    }
    throw new VerificationError(
      `API Error checking status. Reason: ${resultMessage}`
    );
  }
}

/**
 * Fallback check to see if a contract's source code is available.
 * @param apiUrl - The Etherscan API URL.
 * @param apiKey - The Etherscan API key.
 * @param address - The contract address.
 * @returns True if the source code is available, false otherwise.
 */
async function checkSourceCode(
  apiUrl: string,
  apiKey: string,
  address: string
): Promise<boolean> {
  try {
    const sourceCodeParams = {
      module: 'contract',
      action: 'getsourcecode',
      address: address,
      apikey: apiKey
    };
    logger.info(
      `[DEBUG] Executing fallback check with params: ${JSON.stringify(
        sourceCodeParams,
        null,
        2
      )}`
    );
    const response = await axios.get(apiUrl, { params: sourceCodeParams });
    logger.info(
      `[DEBUG] Fallback Check API Response: ${JSON.stringify(response.data)}`
    );
    if (response.data.status === '1' && response.data.result[0]?.SourceCode) {
      return true;
    }
    return false;
  } catch (e: any) {
    logger.error(`Fallback source code check failed: ${e.message}`);
    return false;
  }
}

/**
 * Interface for the main verification function parameters.
 */
interface IVerifyParams {
  hre: HardhatRuntimeEnvironment;
  contractAddress: string;
  contractName: string;
  constructorArguments: string[];
}

/**
 * Main function to coordinate the contract verification process.
 * @param params - The verification parameters.
 */
export async function verifyOnCustomEtherscan(
  params: IVerifyParams
): Promise<void> {
  const { hre, contractAddress, contractName, constructorArguments } = params;

  if (!hre || !hre.ethers) {
    throw new VerificationError(
      'Hardhat Runtime Environment (hre) is not valid or was not passed correctly.'
    );
  }

  const { chainId } = await hre.ethers.provider.getNetwork();
  const { apiUrl, etherscanApiKey, networkName } = await getEtherscanConfig(
    hre,
    chainId
  );

  logger.info(
    `Starting verification for contract ${contractName} at ${contractAddress} on network ${networkName}...`
  );

  try {
    const artifacts = await getContractArtifacts(hre, contractName);

    let encodedConstructorArgs = '';
    if (constructorArguments.length > 0) {
      logger.info('[DEBUG] Encoding constructor arguments...');
      const factory = await hre.ethers.getContractFactory(
        artifacts.fullyQualifiedName
      );
      encodedConstructorArgs = factory.interface
        .encodeDeploy(constructorArguments)
        .substring(2);
      logger.info(
        `[DEBUG] Encoded args (first 50 chars): ${encodedConstructorArgs.substring(
          0,
          50
        )}...`
      );
    }

    const payload = prepareVerificationPayload({
      apiKey: etherscanApiKey,
      contractAddress,
      sourceCode: artifacts.sourceCode,
      fullyQualifiedName: artifacts.fullyQualifiedName,
      solcVersion: artifacts.solcVersion,
      isOptimized: artifacts.isOptimized,
      optimizationRuns: artifacts.optimizationRuns,
      encodedConstructorArgs
    });

    const guid = await submitForVerification(apiUrl, payload);

    logger.info(
      `Waiting ${
        INITIAL_CHECK_DELAY_MS / 1000
      } seconds before checking status...`
    );
    await delay(INITIAL_CHECK_DELAY_MS);

    await checkVerificationStatus(apiUrl, etherscanApiKey, guid);
  } catch (error: any) {
    if (error.message.toLowerCase().includes('already verified')) {
      logger.success(error.message);
      return;
    }

    logger.warn(
      `Initial verification attempt failed: "${error.message}". Attempting fallback source code check...`
    );
    const isActuallyVerified = await checkSourceCode(
      apiUrl,
      etherscanApiKey,
      contractAddress
    );

    if (isActuallyVerified) {
      logger.success(
        'Fallback check successful: Contract source code is available. Assuming verified.'
      );
    } else {
      logger.warn(`Fallback check also failed.`);
      throw error;
    }
  }
}
