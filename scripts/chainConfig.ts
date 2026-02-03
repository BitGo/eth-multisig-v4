import { CHAIN_IDS } from '../config/chainIds';
import { ethers } from 'hardhat';

export interface ChainConfig {
  walletImplementationContractName: string;
  walletFactoryContractName: string;
  forwarderContractName: string;
  forwarderFactoryContractName: string;
  contractPath: string;
  gasParams: GasParams;
}

export type GasParams = {
  gasLimit: number;
} & (
  | {
      maxFeePerGas: bigint;
      maxPriorityFeePerGas: bigint;
      gasPrice?: never;
    }
  | {
      gasPrice: bigint;
      maxFeePerGas?: never;
      maxPriorityFeePerGas?: never;
    }
);

export async function getChainConfig(chainId: number): Promise<ChainConfig> {
  const feeData = await ethers.provider.getFeeData();
  const GWEI = 1_000_000_000n;

  let gasParams: GasParams;
  if (feeData.maxFeePerGas != null && feeData.maxPriorityFeePerGas != null) {
    gasParams = {
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      gasLimit: 3_000_000
    };
  } else {
    gasParams = {
      gasPrice: feeData.gasPrice ?? 0n,
      gasLimit: 3_000_000
    };
  }

  let walletImplementationContractName = 'WalletSimple';
  let walletFactoryContractName = 'WalletFactory';
  let forwarderContractName = 'Forwarder';
  let forwarderFactoryContractName = 'ForwarderFactoryV4';
  let contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;

  switch (chainId) {
    case CHAIN_IDS.ETH_MAINNET:
    case CHAIN_IDS.POLYGON_MAINNET:
    case CHAIN_IDS.POLYGON_AMOY:
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    case CHAIN_IDS.HOODI:
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    case CHAIN_IDS.BSC_MAINNET:
    case CHAIN_IDS.BSC_TESTNET:
    case CHAIN_IDS.ARBITRUM_ONE:
    case CHAIN_IDS.ARBITRUM_SEPOLIA:
    case CHAIN_IDS.OPTIMISM:
    case CHAIN_IDS.OPTIMISM_SEPOLIA:
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    case CHAIN_IDS.opBNB_TESTNET:
    case CHAIN_IDS.opBNB:
      forwarderContractName = 'Forwarder';
      forwarderFactoryContractName = 'ForwarderFactory';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    case CHAIN_IDS.ftm:
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;

    case CHAIN_IDS.BASE_SEPOLIA:
    case CHAIN_IDS.BASE:
      gasParams = {
        maxFeePerGas: 10_000_000_000n,
        maxPriorityFeePerGas: 10_000_000_000n,
        gasLimit: 3_000_000
      };
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;

    case CHAIN_IDS.BERA:
    case CHAIN_IDS.BERA_TESTNET:
    case CHAIN_IDS.PLASMA_MAINNET:
    case CHAIN_IDS.PLASMA_TESTNET:
    case CHAIN_IDS.SEIEVM:
    case CHAIN_IDS.SEIEVM_TESTNET:
    case CHAIN_IDS.KAIA:
    case CHAIN_IDS.KAIA_TESTNET:
    case CHAIN_IDS.IRYS:
    case CHAIN_IDS.IRYS_TESTNET:
    case CHAIN_IDS.PHAROS:
    case CHAIN_IDS.PHAROS_TESTNET:
    case CHAIN_IDS.APECHAIN:
    case CHAIN_IDS.APECHAIN_TESTNET:
    case CHAIN_IDS.CORE_DAO:
    case CHAIN_IDS.CORE_DAO_TESTNET:
    case CHAIN_IDS.LINEAETH:
    case CHAIN_IDS.LINEAETH_TESTNET:
    case CHAIN_IDS.IP:
    case CHAIN_IDS.IP_TESTNET:
    case CHAIN_IDS.OG:
    case CHAIN_IDS.OG_TESTNET:
    case CHAIN_IDS.FLUENTETH:
    case CHAIN_IDS.FLUENTETH_TESTNET:
      gasParams = {
        maxFeePerGas: 30_000_000_000n,
        maxPriorityFeePerGas: 30_000_000_000n,
        gasLimit: 3_000_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;
    case CHAIN_IDS.HYPEEVM:
    case CHAIN_IDS.HYPEEVM_TESTNET:
      gasParams = {
        maxFeePerGas: 30_000_000_000n,
        maxPriorityFeePerGas: 30_000_000_000n,
        gasLimit: 3_000_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;
    case CHAIN_IDS.WORLD:
    case CHAIN_IDS.WORLD_TESTNET:
      gasParams = {
        maxFeePerGas: 5n * GWEI,
        maxPriorityFeePerGas: 2n * GWEI,
        gasLimit: 3_000_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case CHAIN_IDS.MONAD_TESTNET:
    case CHAIN_IDS.MONAD:

    case CHAIN_IDS.FLARE:
    case CHAIN_IDS.FLARE_TESTNET:
    case CHAIN_IDS.SONEIUM_TESTNET:
    case CHAIN_IDS.SONEIUM:
      gasParams.gasLimit = 5_000_000;
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    // gas params suggested by Mantle foundation
    case CHAIN_IDS.MANTLE:
    case CHAIN_IDS.MANTLE_TESTNET:
      gasParams = {
        maxFeePerGas: 20_000_000n, // 0.02 gwei
        maxPriorityFeePerGas: 0n, // 0 gwei (no tip needed)
        gasLimit: 100_000_000_000 // 1e11
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case CHAIN_IDS.SOMNIA:
    case CHAIN_IDS.SOMNIA_TESTNET:
      // Special gas handling for Somnia networks - they require very high gas limits
      if (
        feeData.maxFeePerGas != null &&
        feeData.maxPriorityFeePerGas != null
      ) {
        const minPriority = 1_000_000_000n; // 1 gwei
        const priority =
          feeData.maxPriorityFeePerGas > 0n
            ? feeData.maxPriorityFeePerGas
            : minPriority;
        const base = feeData.maxFeePerGas ?? 0n;
        const maxFee = base > priority * 2n ? base : priority * 2n;
        gasParams = {
          maxFeePerGas: maxFee,
          maxPriorityFeePerGas: priority,
          gasLimit: 60_000_000 // Much higher gas limit for Somnia
        };
      } else {
        gasParams = {
          gasPrice: feeData.gasPrice ?? 6_000_000_000n, // 6 gwei fallback
          gasLimit: 60_000_000 // Much higher gas limit for Somnia
        };
      }
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case CHAIN_IDS.SONGBIRD:
    case CHAIN_IDS.SONGBIRD_TESTNET:
    case CHAIN_IDS.OAS_TESTNET:
    case CHAIN_IDS.OAS:
    case CHAIN_IDS.AVALANCHE:
    case CHAIN_IDS.AVALANCHE_TESTNET:
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case CHAIN_IDS.XDC:
    case CHAIN_IDS.XDC_TESTNET:
    case CHAIN_IDS.KAVAEVM_TESTNET:
    case CHAIN_IDS.KAVAEVM:
      gasParams = {
        gasPrice: feeData.gasPrice ?? 0n,
        gasLimit: 3_000_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case CHAIN_IDS.PLUME_TESTNET:
    case CHAIN_IDS.PLUME:
    case CHAIN_IDS.JOVAYETH:
    case CHAIN_IDS.JOVAYETH_TESTNET:
    case CHAIN_IDS.OKB:
    case CHAIN_IDS.OKB_TESTNET:
      gasParams = {
        gasPrice: feeData.gasPrice ?? 0n,
        gasLimit: 7_000_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case CHAIN_IDS.ZKSYNCERA:
    case CHAIN_IDS.ZKSYNCERA_TESTNET:
      gasParams = {
        maxFeePerGas: ethers.parseUnits('1', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('0.25', 'gwei'),
        gasLimit: 30_000_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case CHAIN_IDS.MEGAETH_TESTNET:

    case CHAIN_IDS.HBAREVM:
    case CHAIN_IDS.HBAREVM_TESTNET:

    case CHAIN_IDS.FLOW_TESTNET:
    case CHAIN_IDS.FLOW:
    case CHAIN_IDS.CREDITCOIN_TESTNET:
    case CHAIN_IDS.CREDITCOIN:
    case CHAIN_IDS.WEMIX_TESTNET:
    case CHAIN_IDS.WEMIX:
      // For these chains, check if we should override EIP-1559 params with gasPrice
      if (
        'maxPriorityFeePerGas' in gasParams &&
        gasParams.maxPriorityFeePerGas !== undefined &&
        (feeData.gasPrice ?? 0n) > gasParams.maxPriorityFeePerGas
      ) {
        gasParams = {
          maxFeePerGas: feeData.gasPrice!,
          maxPriorityFeePerGas: feeData.gasPrice!,
          gasLimit: 3_000_000
        };
      } else {
        gasParams.gasLimit = 3_000_000;
      }
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case CHAIN_IDS.SONIC:
    case CHAIN_IDS.SONIC_TESTNET:
      gasParams = {
        maxFeePerGas: 30_000_000_0000n,
        maxPriorityFeePerGas: 30_000_000_0000n,
        gasLimit: 3_500_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case CHAIN_IDS.DOGEOS_TESTNET:
    case CHAIN_IDS.DOGEOS:
      gasParams = {
        gasPrice: feeData.gasPrice ?? 0n,
        gasLimit: 7_000_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case CHAIN_IDS.MORPHETH_TESTNET:
    case CHAIN_IDS.MORPHETH:
      gasParams = {
        gasPrice: feeData.gasPrice ?? 0n,
        gasLimit: 7_000_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;
  }

  return {
    walletImplementationContractName,
    walletFactoryContractName,
    forwarderContractName,
    forwarderFactoryContractName,
    contractPath,
    gasParams
  };
}
