import { BigNumber } from 'ethers';
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
    case 1:
    case 560048:
    case 137:
    case 80002:
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;

    case 56:
    case 97:
    case 42161:
    case 421614:
    case 10:
    case 11155420:
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;

    case 324:
    case 300:
      walletImplementationContractName = 'ZkethWalletSimple';
      contractPath = `contracts/coins/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;

    case 84532:
    case 8453:
      gasParams = {
        maxFeePerGas: BigNumber.from('10000000000'),
        maxPriorityFeePerGas: BigNumber.from('10000000000'),
        gasLimit: 3_000_000
      };
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;

    case 80000:
    case 80094:
    case 33111:
    case 33139:
    case 57054:
    case 146:
    case 688688:
    case 1114:
    case 1116:
      gasParams = {
        maxFeePerGas: BigNumber.from('30000000000'),
        maxPriorityFeePerGas: BigNumber.from('30000000000'),
        gasLimit: 3_000_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case 480:
    case 4801:
      gasParams = {
        maxFeePerGas: GWEI.mul(5),
        maxPriorityFeePerGas: GWEI.mul(2),
        gasLimit: 3_000_000
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case 10143:
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

    case 14:
    case 114:
    case 1946:
    case 1868:
    case 50312:
      gasParams.gasLimit = 5_000_000;
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case 19:
    case 16:
    case 9372:
    case 248:
    case 43114:
    case 43113:
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case 50:
    case 51:
      gasParams = {
        gasPrice: feeData.gasPrice!,
        gasLimit: 3_000_000,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined
      };
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;

    case 102031:
    case 102030:
    case 1112:
    case 1111:
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
