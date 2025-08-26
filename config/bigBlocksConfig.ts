import { CHAIN_IDS } from './chainIds';
const { PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT } = process.env;
const { PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT } = process.env;

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
 * Map of chain IDs to their BigBlocks configuration for V4 contracts deployment
 * Currently only supported on HypeEVM networks
 */
export const BIGBLOCKS_SUPPORTED_CHAINS_V4_CONTRACTS: Record<number, BigBlocksChainConfig> =
  {
    [CHAIN_IDS.HYPEEVM]: {
      name: 'HypeEVM mainnet',
      isTestnet: false,
      apiUrl: 'https://api.hyperliquid.xyz/exchange',
      rpcUrl: 'https://spectrum-01.simplystaking.xyz/hyperliquid-tn-rpc/evm',
      bigBlocksChainId: 1337,
      envKey: PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT
    },
    [CHAIN_IDS.HYPEEVM_TESTNET]: {
      name: 'HypeEVM Testnet',
      isTestnet: true,
      apiUrl: 'https://api.hyperliquid-testnet.xyz/exchange',
      rpcUrl: 'https://spectrum-01.simplystaking.xyz/hyperliquid-tn-rpc/evm',
      bigBlocksChainId: 1337,
      envKey: PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT
    }
  };

/**
 * Map of chain IDs to their BigBlocks configuration for Batcher contract deployment
 * Currently only supported on HypeEVM networks
 */
export const BIGBLOCKS_SUPPORTED_CHAINS_BATCHER: Record<number, BigBlocksChainConfig> =
  {
    [CHAIN_IDS.HYPEEVM]: {
      name: 'HypeEVM mainnet',
      isTestnet: false,
      apiUrl: 'https://api.hyperliquid.xyz/exchange',
      rpcUrl: 'https://spectrum-01.simplystaking.xyz/hyperliquid-tn-rpc/evm',
      bigBlocksChainId: 1337,
      envKey: PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT
    },
    [CHAIN_IDS.HYPEEVM_TESTNET]: {
      name: 'HypeEVM Testnet',
      isTestnet: true,
      apiUrl: 'https://api.hyperliquid-testnet.xyz/exchange',
      rpcUrl: 'https://spectrum-01.simplystaking.xyz/hyperliquid-tn-rpc/evm',
      bigBlocksChainId: 1337,
      envKey: PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT
    }
  };

/**
 * Legacy configuration - deprecated, use specific configurations above
 * @deprecated Use BIGBLOCKS_SUPPORTED_CHAINS_V4_CONTRACTS or BIGBLOCKS_SUPPORTED_CHAINS_BATCHER instead
 */
export const BIGBLOCKS_SUPPORTED_CHAINS: Record<number, BigBlocksChainConfig> =
  BIGBLOCKS_SUPPORTED_CHAINS_V4_CONTRACTS;

// V4 Contracts specific functions
/**
 * Check if a given chain ID supports BigBlocks for V4 contracts
 * @param chainId The chain ID to check
 * @returns true if the chain supports BigBlocks for V4 contracts, false otherwise
 */
export const isBigBlocksSupportedV4Contracts = (chainId: number): boolean => {
  return chainId in BIGBLOCKS_SUPPORTED_CHAINS_V4_CONTRACTS;
};

/**
 * Get the BigBlocks configuration for V4 contracts deployment
 * @param chainId The chain ID to get configuration for
 * @returns The chain's BigBlocks configuration for V4 contracts, or undefined if not supported
 */
export const getBigBlocksConfigV4Contracts = (
  chainId: number
): BigBlocksChainConfig | undefined => {
  return BIGBLOCKS_SUPPORTED_CHAINS_V4_CONTRACTS[chainId];
};

// Batcher specific functions
/**
 * Check if a given chain ID supports BigBlocks for Batcher contract
 * @param chainId The chain ID to check
 * @returns true if the chain supports BigBlocks for Batcher contract, false otherwise
 */
export const isBigBlocksSupportedBatcher = (chainId: number): boolean => {
  return chainId in BIGBLOCKS_SUPPORTED_CHAINS_BATCHER;
};

/**
 * Get the BigBlocks configuration for Batcher contract deployment
 * @param chainId The chain ID to get configuration for
 * @returns The chain's BigBlocks configuration for Batcher contract, or undefined if not supported
 */
export const getBigBlocksConfigBatcher = (
  chainId: number
): BigBlocksChainConfig | undefined => {
  return BIGBLOCKS_SUPPORTED_CHAINS_BATCHER[chainId];
};

// Legacy functions - deprecated but kept for backward compatibility
/**
 * Check if a given chain ID supports BigBlocks
 * @param chainId The chain ID to check
 * @returns true if the chain supports BigBlocks, false otherwise
 * @deprecated Use isBigBlocksSupportedV4Contracts or isBigBlocksSupportedBatcher instead
 */
export const isBigBlocksSupported = (chainId: number): boolean => {
  return chainId in BIGBLOCKS_SUPPORTED_CHAINS;
};

/**
 * Get the BigBlocks configuration for a chain
 * @param chainId The chain ID to get configuration for
 * @returns The chain's BigBlocks configuration, or undefined if not supported
 * @deprecated Use getBigBlocksConfigV4Contracts or getBigBlocksConfigBatcher instead
 */
export const getBigBlocksConfig = (
  chainId: number
): BigBlocksChainConfig | undefined => {
  return BIGBLOCKS_SUPPORTED_CHAINS[chainId];
};
