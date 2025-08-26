import { CHAIN_IDS } from './chainIds';
const {
  HYPE_EVM_PRIVATE_KEY,
  PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT,
  PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT
} = process.env;

/**
 * Configuration for a chain that supports BigBlocks
 */
export interface BigBlocksChainConfig {
  /** Human-readable name of the network */
  name: string;
  /** Whether this is a testnet or mainnet */
  isTestnet: boolean;
  /** API URL for BigBlocks service */
  apiUrl: string;
  /** RPC URL for the network */
  rpcUrl: string;
  /** Chain ID for BigBlocks service */
  bigBlocksChainId: number;
  /** Environment variable key for private key */
  envKey: string | undefined;
}

/**
 * Map of chain IDs to their BigBlocks configuration
 * Currently only supported on HypeEVM networks
 */
export const BIGBLOCKS_SUPPORTED_CHAINS: Record<number, BigBlocksChainConfig> =
  {
    [CHAIN_IDS.HYPEEVM]: {
      name: 'HypeEVM mainnet',
      isTestnet: false,
      apiUrl: 'https://api.hyperliquid.xyz/exchange',
      rpcUrl: 'https://spectrum-01.simplystaking.xyz/hyperliquid-tn-rpc/evm',
      bigBlocksChainId: 1337,
      envKey: HYPE_EVM_PRIVATE_KEY
    },
    [CHAIN_IDS.HYPEEVM_TESTNET]: {
      name: 'HypeEVM Testnet',
      isTestnet: true,
      apiUrl: 'https://api.hyperliquid-testnet.xyz/exchange',
      rpcUrl: 'https://spectrum-01.simplystaking.xyz/hyperliquid-tn-rpc/evm',
      bigBlocksChainId: 1337,
      envKey: HYPE_EVM_PRIVATE_KEY
    }
  };

/**
 * Get BigBlocks configuration for V4 contract deployment
 * Uses PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT environment variable
 */
export const getBigBlocksConfigForV4Deployment = (
  chainId: number
): BigBlocksChainConfig | undefined => {
  const baseConfig = BIGBLOCKS_SUPPORTED_CHAINS[chainId];
  if (!baseConfig) return undefined;

  return {
    ...baseConfig,
    envKey: PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT
  };
};

/**
 * Get BigBlocks configuration for Batcher contract deployment
 * Uses PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT environment variable
 */
export const getBigBlocksConfigForBatcherDeployment = (
  chainId: number
): BigBlocksChainConfig | undefined => {
  const baseConfig = BIGBLOCKS_SUPPORTED_CHAINS[chainId];
  if (!baseConfig) return undefined;

  return {
    ...baseConfig,
    envKey: PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT
  };
};

/**
 * Check if a given chain ID supports BigBlocks
 * @param chainId The chain ID to check
 * @returns true if the chain supports BigBlocks, false otherwise
 */
export const isBigBlocksSupported = (chainId: number): boolean => {
  return chainId in BIGBLOCKS_SUPPORTED_CHAINS;
};

/**
 * Get the BigBlocks configuration for a chain
 * @param chainId The chain ID to get configuration for
 * @returns The chain's BigBlocks configuration, or undefined if not supported
 */
export const getBigBlocksConfig = (
  chainId: number
): BigBlocksChainConfig | undefined => {
  return BIGBLOCKS_SUPPORTED_CHAINS[chainId];
};
