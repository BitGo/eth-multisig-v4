require('should');

const truffleAssert = require('truffle-assertions');
const helpers = require('./helpers');
const util = require('ethereumjs-util');
const abi = require('ethereumjs-abi');
const BigNumber = require('bignumber.js');

const Forwarder = artifacts.require('./Forwarder.sol');
const ForwarderFactory = artifacts.require('./ForwarderFactory.sol');

const ForwarderABI = require('../ABIs/Forwarder.json');

const createForwarderFactory = async () => {
  const forwarderContract = await Forwarder.new([], {});
  const forwarderFactory = await ForwarderFactory.new(
    forwarderContract.address
  );
  return {
    implementationAddress: forwarderContract.address,
    factory: forwarderFactory
  };
};

const getBalanceInWei = async (address) => {
  return new BigNumber(await web3.eth.getBalance(address));
};

const createForwarder = async (
  factory,
  implementationAddress,
  parent,
  salt,
  shouldAutoFlushERC721 = true,
  sender
) => {
  const inputSalt = util.setLengthLeft(
    Buffer.from(util.stripHexPrefix(salt), 'hex'),
    32
  );
  const calculationSalt = abi.soliditySHA3(
    ['address', 'bytes32'],
    [parent, inputSalt]
  );
  const initCode = helpers.getInitCode(
    util.stripHexPrefix(implementationAddress)
  );
  const forwarderAddress = helpers.getNextContractAddressCreate2(
    factory.address,
    calculationSalt,
    initCode
  );

  await factory.createForwarder(parent, inputSalt, shouldAutoFlushERC721, {
    from: sender
  });

  return forwarderAddress;
};

contract('ForwarderFactory', function (accounts) {
  it('Should create a functional forwarder using the factory', async function () {
    const { factory, implementationAddress } = await createForwarderFactory();

    const parent = accounts[0];
    const salt = '0x1234';
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      salt,
      undefined,
      accounts[1]
    );
    const startBalance = await getBalanceInWei(parent);
    const startForwarderBalance = await getBalanceInWei(forwarderAddress);

    const amount = web3.utils.toWei('2', 'ether');
    await web3.eth.sendTransaction({
      from: accounts[1],
      to: forwarderAddress,
      value: amount
    });

    const endBalance = await getBalanceInWei(parent);
    startBalance.plus(amount).eq(endBalance).should.be.true();
    const endForwarderBalance = await getBalanceInWei(forwarderAddress);
    endForwarderBalance.eq(startForwarderBalance).should.be.true();
  });

  it('Different salt should create at different addresses', async function () {
    const { factory, implementationAddress } = await createForwarderFactory();

    const parent = accounts[0];
    const salt = '0x1234';
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      salt,
      undefined,
      accounts[1]
    );

    const salt2 = '0x12345678';
    const forwarderAddress2 = await createForwarder(
      factory,
      implementationAddress,
      parent,
      salt2,
      undefined,
      accounts[1]
    );

    forwarderAddress.should.not.equal(forwarderAddress2);
  });

  it('Different creators should create at different addresses', async function () {
    const { factory, implementationAddress } = await createForwarderFactory();
    const {
      factory: factory2,
      implementationAddress: implementationAddress2
    } = await createForwarderFactory();

    const parent = accounts[0];
    const salt = '0x1234';
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      salt,
      undefined,
      accounts[1]
    );
    const forwarderAddress2 = await createForwarder(
      factory2,
      implementationAddress2,
      parent,
      salt,
      undefined,
      accounts[1]
    );

    forwarderAddress.should.not.equal(forwarderAddress2);
  });

  it('Different parents should create at different addresses', async function () {
    const { factory, implementationAddress } = await createForwarderFactory();

    const parent = accounts[0];
    const salt = '0x1234';
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      salt,
      undefined,
      accounts[1]
    );

    const parent2 = accounts[1];
    const forwarderAddress2 = await createForwarder(
      factory,
      implementationAddress,
      parent2,
      salt,
      undefined,
      accounts[1]
    );

    forwarderAddress.should.not.equal(forwarderAddress2);
  });

  [
    [true, 'true'],
    [false, 'false']
  ].map(([shouldAutoFlushERC721, label]) => {
    it(`should assign the create a forwarder with ${label} autoflush params`, async () => {
      const { factory, implementationAddress } = await createForwarderFactory();

      const parent = accounts[0];
      const salt = '0x1234';
      const forwarderAddress = await createForwarder(
        factory,
        implementationAddress,
        parent,
        salt,
        shouldAutoFlushERC721,
        accounts[1]
      );

      const forwarderContract = new web3.eth.Contract(
        ForwarderABI,
        forwarderAddress
      );
      const autoFlush721 = await forwarderContract.methods
        .autoFlush721()
        .call();

      autoFlush721.should.equal(shouldAutoFlushERC721);
    });
  });

  it('Should fail to create two contracts with the same inputs', async function () {
    const { factory, implementationAddress } = await createForwarderFactory();

    const parent = accounts[0];
    const salt = '0x1234';
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      salt,
      undefined,
      accounts[1]
    );
    await helpers.assertVMException(
      async () =>
        await createForwarder(
          factory,
          implementationAddress,
          parent,
          salt,
          undefined,
          accounts[1]
        )
    );
  });
});
