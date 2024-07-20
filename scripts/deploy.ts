import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';
const hre = require('hardhat');
const fs = require('fs');

const version = process.env.VERSION ? process.env.VERSION.split('.')[0] : '';
const output = {
  walletImplementation: '',
  walletFactory: '',
  forwarderImplementation: '',
  forwarderFactory: ''
};

async function selfTransferForV1(
  deployer: SignerWithAddress,
  gasPrice: BigNumber | null,
  totalTxnCount: number
) {
  const txCount = await deployer.getTransactionCount('latest');
  console.log('Tx Count: ', txCount);
  const selfTransactions = totalTxnCount - txCount;
  for (let i = 0; i < selfTransactions; i++) {
    const tx = await deployer.sendTransaction({
      to: deployer.address,
      value: ethers.utils.parseEther('0'),
      gasPrice: gasPrice ? gasPrice : 0
    });
    await tx.wait();
    console.log(`Self transaction with nonce: ${i} complete`);
  }
}

function getContractNames(version: string, chainId: number) {
  if (version === 'v1' || version === 'v2') {
    switch (chainId) {
      // https://chainlist.org/
      //eth
      case 1:
      //hteth
      case 17000:
      // bsc
      case 56:
      // tbsc
      case 97:
        return [
          'WalletSimple',
          'WalletFactory',
          'Forwarder',
          'ForwarderFactory',
          'contracts/WalletSimple.sol:WalletSimple'
        ];
      //matic
      case 137:
      //tmatic
      case 80002:
        return [
          'PolygonWalletSimple',
          'WalletFactory',
          'Forwarder',
          'ForwarderFactory',
          'contracts/coins/PolygonWalletSimple.sol:PolygonWalletSimple'
        ];
      // arbeth
      case 42161:
      // tarbeth
      case 421614:
        return [
          'ArbethWalletSimple',
          'WalletFactory',
          'Forwarder',
          'ForwarderFactory',
          'contracts/coins/ArbethWalletSimple.sol:ArbethWalletSimple'
        ];
      // opeth
      case 10:
      // topeth
      case 11155420:
        return [
          'OpethWalletSimple',
          'WalletFactory',
          'Forwarder',
          'ForwarderFactory',
          'contracts/coins/OpethWalletSimple.sol:OpethWalletSimple'
        ];
      // zketh
      case 324:
      // tzketh
      case 300:
        return [
          'ZkethWalletSimple',
          'WalletFactory',
          'Forwarder',
          'ForwarderFactory',
          'contracts/coins/ZkethWalletSimple.sol:ZkethWalletSimple'
        ];
      default:
        return ['', '', '', '', ''];
    }
  }

  //For Version v4
  switch (chainId) {
    // https://chainlist.org/
    //eth
    case 1:
    //hteth
    case 17000:
    // bsc
    case 56:
    // tbsc
    case 97:
    //matic
    case 137:
    //tmatic
    case 80002:
      return [
        'WalletSimple',
        'WalletFactory',
        'Forwarder',
        'ForwarderFactory',
        'contracts/WalletSimple.sol:WalletSimple'
      ];
    // arbeth
    case 42161:
    // tarbeth
    case 421614:
    // opeth
    case 10:
    // topeth
    case 11155420:
    // zketh
    case 324:
    // tzketh
    case 300:
      return [
        'WalletSimple',
        'WalletFactory',
        'ForwarderV4',
        'ForwarderFactoryV4',
        'contracts/WalletSimple.sol:WalletSimple'
      ];
    default:
      return ['', '', '', '', ''];
  }
}

async function main() {
  const feeData = await ethers.provider.getFeeData();
  const gasParams = {
    gasPrice: version === 'v1' ? feeData.gasPrice!.mul('2') : feeData.gasPrice
  };

  let walletImplementation,
    walletFactory,
    forwarderImplementation,
    forwarderFactory;
  let walletImplementationContractName,
    walletFactoryContractName,
    forwarderImplementationContractName,
    forwarderFactoryContractName,
    contractPath;

  if (version === 'v1') {
    const [walletDeployer, forwarderDeployer] = await ethers.getSigners();
    const chainId = await forwarderDeployer.getChainId();
    [
      walletImplementationContractName,
      walletFactoryContractName,
      forwarderImplementationContractName,
      forwarderFactoryContractName,
      contractPath
    ] = getContractNames(version, chainId);

    let count = await walletDeployer.getTransactionCount();
    // In V1, we deploy Wallet contract at nonce 2 and WalletFactory contract at nonce 3
    if (count < 4) {
      [walletImplementation, walletFactory] = await deployWallet(
        walletImplementationContractName,
        walletFactoryContractName,
        walletDeployer,
        gasParams
      );
    } else {
      console.log('Wallet Contracts are already deployed');
    }
    count = await forwarderDeployer.getTransactionCount();
    // In V1, we deploy Forwarder contract at nonce 234 and ForwarderFactory contract at nonce 235
    if (count < 236) {
      [forwarderImplementation, forwarderFactory] = await deployForwarder(
        forwarderImplementationContractName,
        forwarderFactoryContractName,
        forwarderDeployer,
        gasParams
      );
    } else {
      console.log('Forwarder Contracts are already deployed');
    }
    // v2 and v4
  } else {
    const [deployer] = await ethers.getSigners();
    const chainId = await deployer.getChainId();
    console.log('chainId: ', chainId);
    [
      walletImplementationContractName,
      walletFactoryContractName,
      forwarderImplementationContractName,
      forwarderFactoryContractName,
      contractPath
    ] = getContractNames(version, chainId);

    let count = await deployer.getTransactionCount('latest');
    // In V2 and V4, we deploy Wallet contract at nonce 0 and WalletFactory contract at nonce 1
    if (count < 2) {
      [walletImplementation, walletFactory] = await deployWallet(
        walletImplementationContractName,
        walletFactoryContractName,
        deployer,
        gasParams
      );
    } else {
      console.log('Wallet Contracts are already deployed');
    }
    count = await deployer.getTransactionCount('latest');
    console.log('count2: ', count);
    // In V2 and V4, we deploy Forwarder contract at nonce 2 and ForwarderFactory contract at nonce 3
    if (count < 4) {
      [forwarderImplementation, forwarderFactory] = await deployForwarder(
        forwarderImplementationContractName,
        forwarderFactoryContractName,
        deployer,
        gasParams
      );
    } else {
      console.log('Forwarder Contracts are already deployed');
    }
  }

  fs.writeFileSync('output.json', JSON.stringify(output));
  console.log(output);

  // Wait 5 minutes. It takes some time for the etherscan backend to index the transaction and store the contract.
  console.log('Waiting for 5 minutes before verifying....');
  await new Promise((r) => setTimeout(r, 1000 * 300));

  // We have to wait for a minimum of 10 block confirmations before we can call the etherscan api to verify
  await walletImplementation?.deployTransaction.wait(10);
  await walletFactory?.deployTransaction.wait(10);
  await forwarderImplementation?.deployTransaction.wait(10);
  await forwarderFactory?.deployTransaction.wait(10);

  console.log('Done waiting, verifying');
  // Verify Wallet Contract
  if (walletImplementation) {
    await verifyContract(
      walletImplementationContractName,
      walletImplementation.address,
      [],
      contractPath
    );
  }

  // Verify Wallet Factory Contract
  if (walletImplementation && walletFactory) {
    await verifyContract(walletFactoryContractName, walletFactory.address, [
      walletImplementation.address
    ]);
  }

  // Verify Forwarder Contract
  if (forwarderImplementation) {
    await verifyContract(
      forwarderImplementationContractName,
      forwarderImplementation.address,
      []
    );
  }

  // Verify Forwarder Factory Contract
  if (forwarderImplementation && forwarderFactory) {
    await verifyContract(
      forwarderFactoryContractName,
      forwarderFactory.address,
      [forwarderImplementation.address]
    );
  }

  console.log('Contracts verified');
}

async function deployWallet(
  walletImplementationContractName: string,
  walletFactoryContractName: string,
  walletDeployer: SignerWithAddress,
  gasParams: { gasPrice: BigNumber | null }
) {
  // Wallet Contract Deployment
  if (version === 'v1' && walletDeployer) {
    await selfTransferForV1(walletDeployer, gasParams.gasPrice, 2);
  }
  const WalletImplementation =
    version === 'v1'
      ? await ethers.getContractFactory(
          walletImplementationContractName,
          walletDeployer
        )
      : await ethers.getContractFactory(walletImplementationContractName);

  console.log(`Deploying ${walletImplementationContractName}....`);
  const walletImplementation = await WalletImplementation.deploy(gasParams);
  await walletImplementation.deployed();
  output.walletImplementation = walletImplementation.address;
  console.log(
    `${walletImplementationContractName} deployed at ` +
      walletImplementation.address
  );

  // Wallet Factory Contract Deployment
  const WalletFactory =
    version === 'v1'
      ? await ethers.getContractFactory(
          walletFactoryContractName,
          walletDeployer
        )
      : await ethers.getContractFactory(walletFactoryContractName);
  console.log(`Deploying ${walletFactoryContractName}....`);
  const walletFactory = await WalletFactory.deploy(
    walletImplementation.address,
    gasParams
  );
  await walletFactory.deployed();
  output.walletFactory = walletFactory.address;
  console.log(
    `${walletFactoryContractName} deployed at ` + walletFactory.address
  );
  return [walletImplementation, walletFactory];
}

async function deployForwarder(
  forwarderImplementationContractName: string,
  forwarderFactoryContractName: string,
  forwarderDeployer: SignerWithAddress,
  gasParams: { gasPrice: BigNumber | null }
) {
  //Forwarder Contract Deployment
  if (version === 'v1' && forwarderDeployer) {
    await selfTransferForV1(forwarderDeployer, gasParams.gasPrice, 234);
  }
  const ForwarderImplementation =
    version === 'v1'
      ? await ethers.getContractFactory(
          forwarderImplementationContractName,
          forwarderDeployer
        )
      : await ethers.getContractFactory(forwarderImplementationContractName);
  console.log(`Deploying ${forwarderImplementationContractName}....`);
  const forwarderImplementation = await ForwarderImplementation.deploy(
    gasParams
  );
  await forwarderImplementation.deployed();
  output.forwarderImplementation = forwarderImplementation.address;
  console.log(
    `${forwarderImplementationContractName} deployed at ` +
      forwarderImplementation.address
  );

  //Forwarder Factory Contract Deployment
  const ForwarderFactory =
    version === 'v1'
      ? await ethers.getContractFactory(
          forwarderFactoryContractName,
          forwarderDeployer
        )
      : await ethers.getContractFactory(forwarderFactoryContractName);
  console.log(`Deploying ${forwarderFactoryContractName}....`);
  const forwarderFactory = await ForwarderFactory.deploy(
    forwarderImplementation.address,
    gasParams
  );
  await forwarderFactory.deployed();
  output.forwarderFactory = forwarderFactory.address;
  console.log(
    `${forwarderFactoryContractName} deployed at ` + forwarderFactory.address
  );
  return [forwarderImplementation, forwarderFactory];
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
    if (!e.message.includes('Reason: Already Verified')) {
      throw e;
    }
  }
  console.log(`Verified ${contractName} on Etherscan!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
