import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
const hre = require('hardhat');
const fs = require('fs');

async function main() {
  const output = {
    walletImplementation: '',
    walletFactory: '',
    forwarderImplementation: '',
    forwarderFactory: ''
  };

  const feeData = await ethers.provider.getFeeData();

  type LegacyGasParams = {
    gasPrice: BigNumber | null;
    gasLimit?: number;
  };

  const legacyGasParams: LegacyGasParams = {
    gasPrice: feeData.gasPrice
  };

  type Eip1559GasParams = {
    maxFeePerGas: BigNumber | null;
    maxPriorityFeePerGas: BigNumber | null;
    gasLimit?: number;
  };

  const eip1559GasParams: Eip1559GasParams = {
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
  };

  let gasParams: Eip1559GasParams | LegacyGasParams = eip1559GasParams;

  let deployWalletContracts = false,
    deployForwarderContracts = false;
  const [deployer] = await ethers.getSigners();
  const txCount = await deployer.getTransactionCount();

  if (txCount === 1 || txCount === 3) {
    throw Error('Cannot deploy contracts, please update the script');
  }

  if (txCount === 0) {
    deployWalletContracts = true;
    deployForwarderContracts = true;
  } else if (txCount === 2) {
    deployForwarderContracts = true;
  }

  let walletImplementationContractName = '';
  let walletFactoryContractName = 'WalletFactory';
  let forwarderContractName = 'Forwarder';
  let forwarderFactoryContractName = 'ForwarderFactory';
  let contractPath = `contracts/WalletSimple.sol:WalletSimple`;
  const chainId = await deployer.getChainId();
  switch (chainId) {
    // https://chainlist.org/
    //eth
    case 1:
    //hteth
    case 17000:
      walletImplementationContractName = 'WalletSimple';
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    //matic
    case 137:
    //tmatic
    case 80002:
      walletImplementationContractName = 'WalletSimple';
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    // bsc
    case 56:
    // tbsc
    case 97:
      walletImplementationContractName = 'WalletSimple';
      walletFactoryContractName = 'WalletFactory';
      forwarderContractName = 'Forwarder';
      forwarderFactoryContractName = 'ForwarderFactory';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    // arbeth
    case 42161:
    // tarbeth
    case 421614:
      walletImplementationContractName = 'WalletSimple';
      forwarderContractName = 'Forwarder';
      forwarderFactoryContractName = 'ForwarderFactory';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    // opeth
    case 10:
    // topeth
    case 11155420:
      walletImplementationContractName = 'WalletSimple';
      forwarderContractName = 'Forwarder';
      forwarderFactoryContractName = 'ForwarderFactory';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    // zketh
    case 324:
    // tzketh
    case 300:
      walletImplementationContractName = 'ZkethWalletSimple';
      contractPath = `contracts/coins/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    // base sepolia
    case 84532:
    // base
    case 8453:
      eip1559GasParams.gasLimit = 3000000;
      eip1559GasParams.maxFeePerGas = BigNumber.from('10000000000');
      eip1559GasParams.maxPriorityFeePerGas = BigNumber.from('10000000000');
      walletImplementationContractName = 'WalletSimple';
      forwarderContractName = 'Forwarder';
      forwarderFactoryContractName = 'ForwarderFactory';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    // cartio bera
    case 80000:
    // bera
    case 80094:
    // coredao
    case 1114:
    case 1116:
      eip1559GasParams.gasLimit = 3000000;
      eip1559GasParams.maxFeePerGas = BigNumber.from('30000000000');
      eip1559GasParams.maxPriorityFeePerGas = BigNumber.from('30000000000');
      walletImplementationContractName = 'WalletSimple';
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    //Monad
    case 10143: // TODO: WIN-5225: add chain id once mainnet is release
    //Flare
    case 14:
    case 114:
    //Songbird
    case 19:
    case 16:
    // oas
    case 9372:
    case 248:
      eip1559GasParams.gasLimit = 3000000;
      walletImplementationContractName = 'WalletSimple';
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    //avaxc
    case 43114:
    //tavaxc
    case 43113:
      eip1559GasParams.gasLimit = 3000000;
      walletImplementationContractName = 'WalletSimple';
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    //XDC
    case 50:
    case 51:
      legacyGasParams.gasLimit = 3000000;
      gasParams = legacyGasParams;
      walletImplementationContractName = 'WalletSimple';
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    //wemix
    case 1112:
    case 1111:
      if (
        eip1559GasParams.maxPriorityFeePerGas?.lt(
          legacyGasParams.gasPrice as BigNumber
        )
      ) {
        eip1559GasParams.maxPriorityFeePerGas = legacyGasParams.gasPrice;
        eip1559GasParams.maxFeePerGas = legacyGasParams.gasPrice;
      }
      eip1559GasParams.gasLimit = 3000000;
      walletImplementationContractName = 'WalletSimple';
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
  }

  if (deployWalletContracts) {
    console.log(
      'Deploying wallet contract called: ' + walletImplementationContractName
    );
    const WalletSimple = await ethers.getContractFactory(
      walletImplementationContractName
    );
    const walletSimple = await WalletSimple.deploy(gasParams);
    await walletSimple.deployed();
    output.walletImplementation = walletSimple.address;
    console.log('WalletSimple deployed at ' + walletSimple.address);

    const WalletFactory = await ethers.getContractFactory(
      walletFactoryContractName
    );
    const walletFactory = await WalletFactory.deploy(
      walletSimple.address,
      gasParams
    );
    await walletFactory.deployed();
    output.walletFactory = walletFactory.address;
    console.log('WalletFactory deployed at ' + walletFactory.address);

    // Wait 5 minutes. It takes some time for the etherscan backend to index the transaction and store the contract.
    console.log('Waiting for 5 minutes before verifying.....');
    await new Promise((r) => setTimeout(r, 1000 * 300));

    // We have to wait for a minimum of 10 block confirmations before we can call the etherscan api to verify
    await walletSimple.deployTransaction.wait(10);
    await walletFactory.deployTransaction.wait(10);

    console.log('Done waiting, verifying wallet contracts');

    await verifyContract(
      walletImplementationContractName,
      walletSimple.address,
      [],
      contractPath
    );
    await verifyContract('WalletFactory', walletFactory.address, [
      walletSimple.address
    ]);

    console.log('Wallet Contracts verified');
  }

  if (deployForwarderContracts) {
    // In case of new coins like arbeth, opeth, zketh, we need to deploy new forwarder and forwarder factory i.e.
    // ForwarderV4 and ForwarderFactoryV4.
    // If we have to deploy contracts for the older coins like eth, avax, polygon, we need to deploy Forwarder and ForwarderFactory
    console.log('Deploying Forwarder contracts');
    const Forwarder = await ethers.getContractFactory(forwarderContractName);
    const forwarder = await Forwarder.deploy(gasParams);
    await forwarder.deployed();
    output.forwarderImplementation = forwarder.address;
    console.log(`${forwarderContractName} deployed at ` + forwarder.address);

    const ForwarderFactory = await ethers.getContractFactory(
      forwarderFactoryContractName
    );
    const forwarderFactory = await ForwarderFactory.deploy(
      forwarder.address,
      gasParams
    );
    await forwarderFactory.deployed();
    output.forwarderFactory = forwarderFactory.address;
    console.log(
      `${forwarderFactoryContractName} deployed at ` + forwarderFactory.address
    );

    fs.writeFileSync('output.json', JSON.stringify(output));

    // Wait 5 minutes. It takes some time for the etherscan backend to index the transaction and store the contract.
    console.log('Waiting for 5 minutes before verifying.....');
    await new Promise((r) => setTimeout(r, 1000 * 300));

    // We have to wait for a minimum of 10 block confirmations before we can call the etherscan api to verify
    await forwarder.deployTransaction.wait(10);
    await forwarderFactory.deployTransaction.wait(10);

    console.log('Done waiting, verifying forwarder contracts');

    await verifyContract(forwarderContractName, forwarder.address, []);
    await verifyContract(
      forwarderFactoryContractName,
      forwarderFactory.address,
      [forwarder.address]
    );
    console.log('Forwarder Contracts verified');
  }
}

async function verifyContract(
  contractName: string,
  contractAddress: string,
  constructorArguments: string[],
  contract?: string
) {
  try {
    const verifyContractArgs: {
      address: string;
      constructorArguments: string[];
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
