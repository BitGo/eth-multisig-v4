import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { Overrides } from '@ethersproject/contracts/src.ts';
import { BigNumberish } from '@ethersproject/bignumber';
const hre = require('hardhat');
const fs = require('fs');

async function main() {
  const output = {
    batcher: ''
  };

  const contractName = 'Batcher';
  const transferGasLimit = '200000';

  const signers = await ethers.getSigners();
  if (signers.length < 3) {
    throw Error(
      `Found ${signers.length} Signers, expected 3. Cannot deploy batcher contract, please update the script`
    );
  }
  const batcherDeployer = signers[2];
  const Batcher = await ethers.getContractFactory(
    contractName,
    batcherDeployer
  );

  let gasParams: Overrides | undefined = undefined;

  const chainId = await signers[0].getChainId();
  switch (chainId) {
    //Coredao testnet
    case 1114:
    //WEMIX
    case 1112:
    case 1111:
      const feeData = await ethers.provider.getFeeData();
      gasParams = {
        maxFeePerGas: (feeData.maxFeePerGas?.lt(feeData.gasPrice as BigNumber)
          ? feeData.gasPrice
          : feeData.maxFeePerGas) as BigNumberish,
        maxPriorityFeePerGas: (feeData.maxFeePerGas?.lt(
          feeData.gasPrice as BigNumber
        )
          ? feeData.gasPrice
          : feeData.maxPriorityFeePerGas) as BigNumberish,
        gasLimit: BigNumber.from('3000000')
      };
      break;
  }

  let batcher = null;
  const erc20BatchLimit = 256;
  if (gasParams != undefined) {
    batcher = await Batcher.deploy(
      transferGasLimit,
      erc20BatchLimit,
      gasParams
    );
  } else {
    batcher = await Batcher.deploy(transferGasLimit, erc20BatchLimit);
  }
  await batcher.deployed();
  output.batcher = batcher.address;
  console.log('Batcher deployed at ' + batcher.address);

  fs.writeFileSync('output.json', JSON.stringify(output));

  // Wait 5 minutes. It takes some time for the etherscan backend to index the transaction and store the contract.
  console.log('Waiting for 5 minutes before verifying.....');
  await new Promise((r) => setTimeout(r, 1000 * 300));

  console.log('Done waiting, verifying');
  await verifyContract(contractName, batcher.address, [
    transferGasLimit,
    erc20BatchLimit
  ]);
  console.log('Contracts verified');
}

async function verifyContract(
  contractName: string,
  contractAddress: string,
  constructorArguments: [string, number],
  contract?: string
) {
  try {
    const verifyContractArgs: {
      address: string;
      constructorArguments: [string, number];
      contract?: string;
    } = {
      address: contractAddress,
      constructorArguments: constructorArguments
    };

    if (contract) {
      verifyContractArgs.contract = contract;
    }

    await hre.run('verify:verify', verifyContractArgs);
  } catch (e) {
    // @ts-ignore
    // We get a failure API response if the source code has already been uploaded, don't throw in this case.
    if (!e.message.toLowerCase().includes('already verified')) {
      throw e;
    }
  }
  console.log(`Verified ${contractName} on explorer!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
