import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import { CHAIN_IDS } from '../config/chainIds';

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
      maxFeePerGas: BigNumber;
      maxPriorityFeePerGas: BigNumber;
      gasPrice?: never;
    }
  | {
      gasPrice: BigNumber;
      maxFeePerGas?: never;
      maxPriorityFeePerGas?: never;
    }
);
export async function getChainConfig(chainId: number): Promise<ChainConfig> {
  const feeData = await ethers.provider.getFeeData();
  const GWEI = BigNumber.from('1000000000');

  let gasParams: GasParams;
  if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
    gasParams = {
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      gasLimit: 3_000_000
    };
  } else {
    gasParams = {
      gasPrice: feeData.gasPrice || BigNumber.from('0'),
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

    case CHAIN_IDS.ZKSYNC_ERA:
    case CHAIN_IDS.ZKSYNC_SEPOLIA:
      walletImplementationContractName = 'ZkethWalletSimple';
      contractPath = `contracts/coins/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;

    case CHAIN_IDS.BASE_SEPOLIA:
    case CHAIN_IDS.BASE:
      gasParams = {
        maxFeePerGas: BigNumber.from('10000000000'),
        maxPriorityFeePerGas: BigNumber.from('10000000000'),
        gasLimit: 3_000_000
      };
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;

    case CHAIN_IDS.BERA:
    case CHAIN_IDS.BERA_TESTNET:
    case CHAIN_IDS.SONIC:
    case CHAIN_IDS.SONIC_TESTNET:
    case CHAIN_IDS.SEIEVM:
    case CHAIN_IDS.SEIEVM_TESTNET:
    case CHAIN_IDS.PHAROS:
    case CHAIN_IDS.PHAROS_TESTNET:
    case CHAIN_IDS.HYPEEVM:
    case CHAIN_IDS.HYPEEVM_TESTNET:
    case CHAIN_IDS.APECHAIN:
    case CHAIN_IDS.APECHAIN_TESTNET:
    case CHAIN_IDS.CORE_DAO:
    case CHAIN_IDS.CORE_DAO_TESTNET:
    case CHAIN_IDS.LINEAETH:
    case CHAIN_IDS.LINEAETH_TESTNET:
      gasParams = {
        maxFeePerGas: BigNumber.from('30000000000'),
        maxPriorityFeePerGas: BigNumber.from('30000000000'),
        gasLimit: 3_000_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case CHAIN_IDS.WORLD:
    case CHAIN_IDS.WORLD_TESTNET:
      gasParams = {
        maxFeePerGas: GWEI.mul(5),
        maxPriorityFeePerGas: GWEI.mul(2),
        gasLimit: 3_000_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case CHAIN_IDS.MONAD:
      const monadFeeData = await ethers.provider.getFeeData();
      const baseFee =
        monadFeeData.lastBaseFeePerGas || BigNumber.from('30000000000');
      gasParams = {
        maxFeePerGas: baseFee.add(GWEI.mul(1)),
        maxPriorityFeePerGas: GWEI.mul(1),
        gasLimit: 3_000_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';

      const estimatedTxCost = ethers.utils.formatEther(
        gasParams.maxFeePerGas.mul(gasParams.gasLimit)
      );
      console.log('💸 Estimated Max Deployment Cost:', estimatedTxCost, 'ETH');
      break;

    case CHAIN_IDS.FLARE:
    case CHAIN_IDS.FLARE_TESTNET:
    case CHAIN_IDS.SONEIUM_TESTNET:
    case CHAIN_IDS.SONEIUM:
    case CHAIN_IDS.SOMNIA_TESTNET:
      gasParams.gasLimit = 5_000_000;
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
      gasParams = {
        gasPrice: feeData.gasPrice!,
        gasLimit: 3_000_000,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case CHAIN_IDS.CREDITCOIN_TESTNET:
    case CHAIN_IDS.CREDITCOIN:
    case CHAIN_IDS.WEMIX_TESTNET:
    case CHAIN_IDS.WEMIX:
      if (feeData.gasPrice?.gt(gasParams.maxPriorityFeePerGas || 0)) {
        gasParams.maxFeePerGas = feeData.gasPrice!;
        gasParams.maxPriorityFeePerGas = feeData.gasPrice!;
      }
      gasParams.gasLimit = 3_000_000;
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
