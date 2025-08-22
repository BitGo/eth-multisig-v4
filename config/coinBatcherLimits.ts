/*
  Coin registry: coin -> chainId -> { batcher?, transferGasLimit? }.
  Keep addresses as constants here (defaults). The admin script uses these unless overridden by:
    - CLI flag: --batcher 0x...
    - Env var: BATCHER_ADDRESS (e.g., set by the GitHub workflow per network)
    - Legacy: BATCHER (env)
  If unset everywhere, it will error and ask to add the address here.
*/
type Limits = Record<number, { batcher?: string; transferGasLimit?: number }>;
import { CHAIN_IDS } from './chainIds';

// Fill with deployed Batcher addresses.
const SOMNIA_TESTNET_BATCHER: string | undefined =
  '0xebe27913fcc7510eAdf10643A8F86Bf5492A9541';
const SOMNIA_MAINNET_BATCHER: string | undefined =
  '0x3E1e5d78e44f15593B3B61ED278f12C27F0fF33e';

// Somnia (stt)
const STT: Limits = {
  [CHAIN_IDS.SOMNIA_TESTNET]: {
    batcher: SOMNIA_TESTNET_BATCHER,
    // Default stipend per recipient; set here to override per-coin/chain.
    // Otherwise per-chain defaults come from configGasParams.
    transferGasLimit: 300000
  },
  [CHAIN_IDS.SOMNIA]: {
    batcher: SOMNIA_MAINNET_BATCHER,
    transferGasLimit: 300000
  }
};

const REGISTRY: Record<string, Limits> = {
  stt: STT
  // Add more coins here, e.g., 'eth': { ... }
};

export function getCoinLimits(coin: string): Limits {
  // Case-insensitive lookup; returns {} when unknown (caller uses fallbacks).
  return REGISTRY[coin.toLowerCase()] || {};
}
