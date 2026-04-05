import { FeeData } from 'ethers';
import { ethers } from 'hardhat';
import { CHAIN_IDS } from './chainIds';

/** Transaction override fields accepted by ethers v6 ContractFactory.deploy(). */
export type TxOverrides = {
  gasLimit?: number;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
};

/**
 * Gas strategies for batcher contract deployment.
 *
 * default
 *   Hardhat auto-detects the fee model and estimates gas via eth_estimateGas.
 *   Suitable for any chain whose node accepts EIP-1559 (type-2) estimation params.
 *
 * eip1559-fees
 *   Hardhat auto-estimates gasLimit, but maxFeePerGas / maxPriorityFeePerGas are
 *   supplied explicitly. Use when a chain's eth_feeHistory is unreliable but
 *   eth_estimateGas still works correctly with type-2 params.
 *
 * manual-gas
 *   Both fee params and gasLimit are supplied explicitly.
 *   Required when eth_estimateGas rejects type-2 params (causing Hardhat's internal
 *   estimation to hang or fail). Gas is pre-estimated with a plain { from, data }
 *   call, which all nodes accept regardless of fee model.
 *   Use forceLegacy: true when the node also rejects type-2 send transactions
 *   (i.e. it advertises EIP-1559 fee data but only mines legacy type-0 txs).
 */
export type GasStrategy = 'default' | 'eip1559-fees' | 'manual-gas';

type ChainGasConfig =
  | { strategy: 'default' }
  | { strategy: 'eip1559-fees' }
  | {
      strategy: 'manual-gas';
      /** Minimum priority fee in gwei; prevents zero-tip txs on chains that require it. Default: 1. */
      minPriorityFeeGwei?: number;
      /** Extra gas added on top of the estimate as a percentage, e.g. 20 = +20%. Default: 20. */
      gasBufferPct?: number;
      /** Cap the final gasLimit to 95% of the latest block's gas limit. Default: false. */
      capToBlockGasLimit?: boolean;
      /**
       * Force a legacy type-0 transaction (gasPrice only) even when the node reports
       * EIP-1559 fee data. Required for chains whose mempool advertises EIP-1559 support
       * but silently drops type-2 transactions (e.g. Hemi).
       */
      forceLegacy?: boolean;
    };

/**
 * Per-chain gas configuration for batcher contract deployment.
 * Add an entry here whenever a new chain requires non-default gas handling.
 */
const CHAIN_GAS_CONFIGS: Partial<Record<number, ChainGasConfig>> = {
  // eip1559-fees — node fee data is unreliable; supply explicit EIP-1559 params,
  // let Hardhat estimate the gasLimit via eth_estimateGas.
  [CHAIN_IDS.MONAD_TESTNET]: { strategy: 'eip1559-fees' },
  [CHAIN_IDS.WORLD]: { strategy: 'eip1559-fees' },
  [CHAIN_IDS.WORLD_TESTNET]: { strategy: 'eip1559-fees' },
  [CHAIN_IDS.SONEIUM]: { strategy: 'eip1559-fees' },
  [CHAIN_IDS.SONEIUM_TESTNET]: { strategy: 'eip1559-fees' },
  [CHAIN_IDS.WEMIX]: { strategy: 'eip1559-fees' },
  [CHAIN_IDS.WEMIX_TESTNET]: { strategy: 'eip1559-fees' },

  // manual-gas — eth_estimateGas hangs or fails with type-2 params on these chains;
  // gas is pre-estimated with a plain { from, data } call and passed explicitly.
  //
  // Hemi: node advertises EIP-1559 fee data but only mines legacy (type-0) txs,
  // so forceLegacy ensures we always send gasPrice instead of maxFeePerGas.
  [CHAIN_IDS.HEMIETH]: { strategy: 'manual-gas', forceLegacy: true },
  [CHAIN_IDS.HEMIETH_TESTNET]: { strategy: 'manual-gas', forceLegacy: true },
  // Somnia: block gas limit is low; cap the gasLimit to avoid exceeding it.
  [CHAIN_IDS.SOMNIA]: { strategy: 'manual-gas', capToBlockGasLimit: true },
  [CHAIN_IDS.SOMNIA_TESTNET]: {
    strategy: 'manual-gas',
    capToBlockGasLimit: true
  }
};

export function getChainGasConfig(chainId: number): ChainGasConfig {
  return CHAIN_GAS_CONFIGS[chainId] ?? { strategy: 'default' };
}

/**
 * Resolves the final TxOverrides for Batcher.deploy() based on the chain's gas strategy.
 *
 * @param chainId    - Current network chain ID
 * @param feeData    - Result of provider.getFeeData()
 * @param deployer   - The signer that will send the deploy tx
 * @param deployTxReq - The unsigned deploy transaction (from ContractFactory.getDeployTransaction)
 * @param fromAddress - The deployer's address string
 */
export async function resolveGasOverrides(
  chainId: number,
  feeData: FeeData,
  deployer: Awaited<ReturnType<typeof ethers.getSigner>>,
  deployTxReq: { data?: string | null },
  fromAddress: string
): Promise<TxOverrides | undefined> {
  const config = getChainGasConfig(chainId);

  if (config.strategy === 'default') {
    return undefined;
  }

  if (config.strategy === 'eip1559-fees') {
    return {
      maxFeePerGas: feeData.maxFeePerGas ?? feeData.gasPrice ?? undefined,
      maxPriorityFeePerGas:
        feeData.maxPriorityFeePerGas ?? feeData.gasPrice ?? undefined
    };
  }

  // manual-gas: pre-estimate gas with a plain { from, data } call (no fee-model params),
  // then pass the result as an explicit gasLimit. This bypasses Hardhat's internal
  // eth_estimateGas, which sends type-2 params and hangs on chains like Hemi and Somnia.
  const minPriorityFee =
    BigInt(config.minPriorityFeeGwei ?? 1) * 1_000_000_000n;
  const gasBufferPct = BigInt(config.gasBufferPct ?? 20);

  const has1559 =
    feeData.maxFeePerGas != null && feeData.maxPriorityFeePerGas != null;

  let overrides: TxOverrides;

  if (has1559 && !config.forceLegacy) {
    const priority =
      (feeData.maxPriorityFeePerGas ?? 0n) > 0n
        ? (feeData.maxPriorityFeePerGas as bigint)
        : minPriorityFee;
    const base = feeData.maxFeePerGas ?? feeData.gasPrice ?? minPriorityFee;
    const maxFee = base > priority * 2n ? base : priority * 2n;
    overrides = { maxFeePerGas: maxFee, maxPriorityFeePerGas: priority };
  } else {
    overrides = {
      gasPrice: feeData.gasPrice ?? 6_000_000_000n
    };
  }

  // Estimate gas without fee-model params so the call succeeds on nodes that
  // reject type-2 estimation requests.
  const est = await deployer.estimateGas({
    ...deployTxReq,
    from: fromAddress
  });
  const estWithBuffer = (est * (100n + gasBufferPct)) / 100n;
  let chosenGasLimit = Number(estWithBuffer);

  if (config.capToBlockGasLimit) {
    const latestBlock = await ethers.provider.getBlock('latest');
    if (latestBlock?.gasLimit) {
      const blockLimit = Number(latestBlock.gasLimit);
      chosenGasLimit = Math.min(chosenGasLimit, Math.floor(blockLimit * 0.95));
    }
  }

  overrides.gasLimit = chosenGasLimit;
  return overrides;
}
