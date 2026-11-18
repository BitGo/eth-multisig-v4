import fs from 'fs';
import { ethers } from 'hardhat';
import { getChainConfig } from './chainConfig';
import { assertBytecodeMatchesArtifact } from '../deployUtils';

/**
 * Post-deployment verification gate (INFOSEC-617 / Cantina #887).
 * Asserts that every contract recorded in output.json exists on-chain with
 * code matching its artifact, and that both factories point at the
 * implementations recorded alongside them. Run after deploy.ts from CI:
 *   npx hardhat run scripts/verifyDeployment.ts --network <network>
 */
async function main() {
  const output = JSON.parse(fs.readFileSync('output.json', 'utf-8'));
  const { chainId } = await ethers.provider.getNetwork();
  const chainConfig = await getChainConfig(Number(chainId));

  const deployments: Array<[string | undefined, string, string]> = [
    [
      output.walletImplementation,
      'wallet implementation',
      chainConfig.walletImplementationContractName
    ],
    [
      output.walletFactory,
      'wallet factory',
      chainConfig.walletFactoryContractName
    ],
    [
      output.forwarderImplementation,
      'forwarder implementation',
      chainConfig.forwarderContractName
    ],
    [
      output.forwarderFactory,
      'forwarder factory',
      chainConfig.forwarderFactoryContractName
    ]
  ];

  for (const [address, label, contractName] of deployments) {
    if (!address) {
      throw new Error(`output.json missing ${label} address`);
    }
    await assertBytecodeMatchesArtifact(address, contractName);
  }

  const factoryAbi = [
    'function implementationAddress() view returns (address)'
  ];
  const walletFactory = await ethers.getContractAt(
    factoryAbi,
    output.walletFactory
  );
  const walletFactoryImpl: string = await walletFactory.getFunction(
    'implementationAddress'
  )();
  if (
    walletFactoryImpl.toLowerCase() !==
    output.walletImplementation.toLowerCase()
  ) {
    throw new Error(
      `WalletFactory implementation mismatch: ${walletFactoryImpl} vs ${output.walletImplementation}`
    );
  }

  const forwarderFactory = await ethers.getContractAt(
    factoryAbi,
    output.forwarderFactory
  );
  const forwarderFactoryImpl: string = await forwarderFactory.getFunction(
    'implementationAddress'
  )();
  if (
    forwarderFactoryImpl.toLowerCase() !==
    output.forwarderImplementation.toLowerCase()
  ) {
    throw new Error(
      `ForwarderFactory implementation mismatch: ${forwarderFactoryImpl} vs ${output.forwarderImplementation}`
    );
  }

  console.log('Deployment verification PASS (INFOSEC-617 gate)');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
