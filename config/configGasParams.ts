import { CHAIN_IDS } from './chainIds';

// Defaults; add overrides only when required by a chain.
export type BatcherGasParams = {
  transferGasLimit: number; // stipend per recipient for native transfers
  erc20BatchLimit: number; // max recipients per ERC20 batch
  nativeBatchTransferLimit: number; // max recipients per native batch
};

const DEFAULTS: BatcherGasParams = {
  transferGasLimit: 300_000,
  erc20BatchLimit: 256,
  nativeBatchTransferLimit: 256
};

// Chain-specific overrides.
const OVERRIDES: Partial<Record<number, Partial<BatcherGasParams>>> = {
  // Somnia requires higher limits
  [CHAIN_IDS.SOMNIA]: { transferGasLimit: 800_000 },
  [CHAIN_IDS.SOMNIA_TESTNET]: { transferGasLimit: 800_000 }
};

export function getBatcherGasParams(chainId: number): BatcherGasParams {
  const o = OVERRIDES[chainId] || {};
  return {
    transferGasLimit: o.transferGasLimit ?? DEFAULTS.transferGasLimit,
    erc20BatchLimit: o.erc20BatchLimit ?? DEFAULTS.erc20BatchLimit,
    nativeBatchTransferLimit:
      o.nativeBatchTransferLimit ?? DEFAULTS.nativeBatchTransferLimit
  };
}
