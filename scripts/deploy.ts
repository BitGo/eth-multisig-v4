import { ethers } from "hardhat";
const hre = require("hardhat");

async function main() {
  const WalletSimple = await ethers.getContractFactory("WalletSimple");
  const walletSimple = await WalletSimple.deploy();
  await walletSimple.deployed();
  console.log("WalletSimple deployed to:", walletSimple.address);

  const WalletFactory = await ethers.getContractFactory("WalletFactory");
  const walletFactory = await WalletFactory.deploy(walletSimple.address);
  await walletFactory.deployed();
  console.log("WalletFactory deployed to:", walletFactory.address);

  const Forwarder = await ethers.getContractFactory("Forwarder");
  const forwarder = await Forwarder.deploy();
  await forwarder.deployed();
  console.log("Forwarder deployed to:", forwarder.address);

  const ForwarderFactory = await ethers.getContractFactory("ForwarderFactory");
  const forwarderFactory = await ForwarderFactory.deploy(forwarder.address);
  await forwarderFactory.deployed();
  console.log("ForwarderFactory deployed to:", forwarderFactory.address);

  // We have to wait for a minimum of 10 block confirmations before we can call the etherscan api to verify
  console.log("Waiting for 10 confirmations.....");
  await walletSimple.deployTransaction.wait(10);
  await walletFactory.deployTransaction.wait(10);
  await forwarder.deployTransaction.wait(10);
  await forwarderFactory.deployTransaction.wait(10);

  console.log("Contracts confirmed on chain, .....");
  await verifyContract("WalletSimple", walletSimple.address, []);
  await verifyContract("WalletFactory", walletFactory.address, [walletSimple.address]);
  await verifyContract("Forwarder", forwarder.address, []);
  await verifyContract("ForwarderFactory", forwarderFactory.address, [forwarder.address]);
}

async function verifyContract(contractName: string, contractAddress : string, constructorArguments : string[]) {
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArguments
    });
  }
  catch(e) {
    // @ts-ignore
    // We get a failure API response if the source code has already been uploaded, don't throw in this case.
    if(!e.message.includes('Reason: Already Verified')) {
      throw(e);
    }
  }
  console.log(`Verified ${contractName} on Etherscan!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
