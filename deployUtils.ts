import hre, { ethers } from 'hardhat';
import fs from 'fs';
import { Contract } from 'ethers';
const OUTPUT_FILE = 'output.json';

export type DeploymentAddresses = {
  walletImplementation?: string;
  walletFactory?: string;
  forwarderImplementation?: string;
  forwarderFactory?: string;
};
/**
 * Attempts to load contract address from output file or by predicting nonce.
 * If neither found, it deploys the contract using the given deploy function.
 */
// Core reusable function
export async function deployIfNeededAtNonce(
  recordedAddress: string | undefined,
  expectedNonce: number,
  deployerAddress: string,
  contractName: string,
  deployFn: () => Promise<string>
): Promise<string> {
  const predictedAddress = ethers.utils.getContractAddress({
    from: deployerAddress,
    nonce: expectedNonce
  });

  console.log(
    `🔮 Expecting ${contractName} at nonce ${expectedNonce} -> ${predictedAddress}`
  );

  // 1. Check output.json record
  if (recordedAddress) {
    console.log(`📁 Found ${contractName} in output.json: ${recordedAddress}`);
    if (await isContractDeployed(recordedAddress)) {
      console.log(
        `✅ ${contractName} already deployed on-chain at ${recordedAddress}. Skipping deployment.`
      );
      return recordedAddress;
    } else {
      console.log(
        `⚠️ ${contractName} in output.json not found on-chain. Will fallback to nonce logic.`
      );
    }
  }

  // 2. Check if already deployed at predicted address
  if (await isContractDeployed(predictedAddress)) {
    console.log(
      `✅ ${contractName} already deployed on-chain at predicted address: ${predictedAddress}. Skipping deployment.`
    );
    return predictedAddress;
  }

  // 3. Check if nonce already advanced
  const currentNonce = await ethers.provider.getTransactionCount(
    deployerAddress
  );
  if (currentNonce > expectedNonce) {
    console.log(
      `⏩ Skipping deployment of ${contractName}. Current nonce ${currentNonce} is already past expected ${expectedNonce}. Will assume contract exists at ${predictedAddress}`
    );
    return predictedAddress;
  }

  // 4. If currentNonce doesn't match expectedNonce exactly, throw
  if (currentNonce !== expectedNonce) {
    throw new Error(
      `❌ Cannot deploy ${contractName}: current nonce is ${currentNonce}, expected ${expectedNonce}.`
    );
  }

  // 5. Deploy
  console.log(`🚀 Deploying ${contractName} at nonce ${expectedNonce}...`);
  return await deployFn();
}

async function isContractDeployed(address: string) {
  const code = await ethers.provider.getCode(address);
  return code && code !== '0x';
}

export function loadOutput(): DeploymentAddresses {
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('⚠️ Could not load output file:', err);
  }
  return {};
}

export function saveOutput(output: DeploymentAddresses) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
}

export async function waitAndVerify(
  contractName: string,
  contract: Contract,
  constructorArguments: string[] = []
) {
  console.log(`⏳ Waiting for 10 confirmations of ${contractName} TX...`);
  await contract.deployTransaction.wait(10);

  console.log(`🚀 Now verifying ${contractName} on explorer...`);
  try {
    await hre.run('verify:verify', {
      address: contract.address,
      constructorArguments
    });
    console.log(
      `✅ Verified ${contractName} at ${contract.address} on explorer!`
    );
  } catch (e: any) {
    if (!e.message.toLowerCase().includes('already verified')) {
      throw e;
    }
    console.log(`⚠️ Already verified: ${contractName}`);
  }
}
