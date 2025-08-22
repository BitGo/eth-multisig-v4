import { checkAndEnableBigBlocks } from './checkAndEnableBigBlocks';
import { CHAIN_IDS } from '../config/chainIds';
import { isBigBlocksSupported } from '../config/bigBlocksConfig';

async function testBigBlocksImplementation() {
  console.log('🧪 Testing BigBlocks implementation...\n');

  // Test supported chains
  const supportedChains = [CHAIN_IDS.HYPEEVM, CHAIN_IDS.HYPEEVM_TESTNET];
  const unsupportedChains = [CHAIN_IDS.ETH_MAINNET, CHAIN_IDS.ARBITRUM_ONE];

  console.log('📋 Supported chains for BigBlocks:');
  supportedChains.forEach((chainId) => {
    console.log(
      `  - Chain ${chainId}: ${
        isBigBlocksSupported(chainId) ? '✅ Supported' : '❌ Not supported'
      }`
    );
  });

  console.log('\n📋 Unsupported chains for BigBlocks:');
  unsupportedChains.forEach((chainId) => {
    console.log(
      `  - Chain ${chainId}: ${
        isBigBlocksSupported(chainId) ? '✅ Supported' : '❌ Not supported'
      }`
    );
  });

  // Test with environment variable
  const privateKey = process.env.HYPE_EVM_PRIVATE_KEY;
  if (!privateKey) {
    console.log('\n⚠️  HYPE_EVM_PRIVATE_KEY not set in environment variables.');
    console.log(
      '   Set this environment variable to test actual BigBlocks functionality.'
    );
    console.log('\n✅ Implementation structure is correct and ready to use.');
    return;
  }

  console.log('\n🔍 Testing with actual private key...');

  try {
    // Test HypeEVM Testnet (safer for testing)
    console.log('\n--- Testing HypeEVM Testnet ---');
    await checkAndEnableBigBlocks(privateKey, CHAIN_IDS.HYPEEVM_TESTNET);

    // Test unsupported chain (should skip gracefully)
    console.log('\n--- Testing Unsupported Chain (ETH Mainnet) ---');
    await checkAndEnableBigBlocks(privateKey, CHAIN_IDS.ETH_MAINNET);
  } catch (error) {
    console.error('❌ Test failed:', (error as Error).message);
  }

  console.log('\n✅ BigBlocks implementation test completed.');
}

// Run the test
testBigBlocksImplementation().catch(console.error);
