const WalletSimple = artifacts.require('WalletSimple');
const WalletFactory = artifacts.require('WalletFactory');
const Forwarder = artifacts.require('Forwarder');
const ForwarderFactory = artifacts.require('ForwarderFactory');

module.exports = async function (deployer) {
  await deployer.deploy(WalletSimple);
  const walletSimple = await WalletSimple.deployed();

  await deployer.deploy(WalletFactory, walletSimple.address);

  await deployer.deploy(Forwarder);
  const forwarder = await Forwarder.deployed();

  await deployer.deploy(ForwarderFactory, forwarder.address);
};
