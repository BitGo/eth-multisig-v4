require('should');

const helpers = require('./helpers');
const util = require('ethereumjs-util');
const abi = require('ethereumjs-abi');
const { privateKeyForAccount } = require('./helpers');
const BigNumber = require('bignumber.js');
const hre = require('hardhat');

const WalletSimple = artifacts.require('./WalletSimple.sol');
const WalletFactory = artifacts.require('./WalletFactory.sol');

const createWalletFactory = async () => {
  const walletContract = await WalletSimple.new([], {});
  const walletFactory = await WalletFactory.new(walletContract.address);
  return {
    implementationAddress: walletContract.address,
    factory: walletFactory
  };
};

const getBalanceInWei = async (address) => {
  return new BigNumber(await web3.eth.getBalance(address));
};

describe('WalletFactory', function () {
  let accounts;
  let deployer;
  before(async () => {
    await hre.network.provider.send('hardhat_reset');
    accounts = await web3.eth.getAccounts();
    const { factory } = await createWalletFactory();
    deployer = new WalletDeployer(factory);
  });

  it('Should create a functional wallet using the factory', async function () {

    const signers = [accounts[0], accounts[1], accounts[2]];
    const wallet = await deployer.createWallet(
      signers,
    );
    const walletAddress = wallet.address;
    const startBalance = await getBalanceInWei(walletAddress);

    const amount = web3.utils.toWei('2', 'ether');
    await web3.eth.sendTransaction({
      from: accounts[1],
      to: walletAddress,
      value: amount
    });

    const endBalance = await getBalanceInWei(walletAddress);
    startBalance.plus(amount).eq(endBalance).should.be.true();
    const recipientStartBalance = await getBalanceInWei(accounts[3]);

    // Get the operation hash to be signed
    const expireTime = Math.floor(new Date().getTime() / 1000) + 60;
    const operationHash = helpers.getSha3ForConfirmationTx(
      'ETHER',
      accounts[3].toLowerCase(),
      amount,
      '0x',
      expireTime,
      1
    );
    const sig = util.ecsign(operationHash, privateKeyForAccount(accounts[1]));

    await wallet.sendMultiSig(
      accounts[3].toLowerCase(),
      amount,
      '0x',
      expireTime,
      1,
      helpers.serializeSignature(sig),
      { from: accounts[0] }
    );

    const finalBalance = await getBalanceInWei(walletAddress);
    finalBalance.eq(0).should.be.true();
    const recipientEndBalance = await getBalanceInWei(accounts[3]);
    recipientStartBalance.plus(amount).eq(recipientEndBalance).should.be.true();
  });

  it('Different salt should create at different addresses', async function () {
    const { factory, implementationAddress } = await createWalletFactory();

    const signers = [accounts[0], accounts[1], accounts[2]];
    const walletAddress = await deployer.createWallet(signers);

    const walletAddress2 = await deployer.createWallet(signers);

    walletAddress.should.not.equal(walletAddress2);
  });

  it('Different creators should create at different addresses', async function () {
    const { factory, implementationAddress } = await createWalletFactory();
    const { factory: factory2, implementationAddress: implementationAddress2 } =
      await createWalletFactory();

    const signers = [accounts[0], accounts[1], accounts[2]];
    const walletAddress = await deployer.createWallet(signers);
    const walletAddress2 = await deployer.createWallet(signers);

    walletAddress.should.not.equal(walletAddress2);
  });

  it('Different signers should create at different addresses', async function () {
    const { factory, implementationAddress } = await createWalletFactory();

    const signers = [accounts[0], accounts[1], accounts[2]];
    const walletAddress = await deployer.createWallet(signers, 94);

    const signers2 = [accounts[0], accounts[1], accounts[3]];
    const walletAddress2 = await deployer.createWallet(signers2, 94);

    walletAddress.should.not.equal(walletAddress2);
  });

  it('Should fail to create two contracts with the same inputs', async function () {
    const { factory, implementationAddress } = await createWalletFactory();

    const signers = [accounts[0], accounts[1], accounts[2]];
    await deployer.createWallet(signers, 77);
    await helpers.assertCreateFail(
      async () =>
        await deployer.createWallet(signers, 77)
    );
  });
});
