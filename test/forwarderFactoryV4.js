require('should');

const truffleAssert = require('truffle-assertions');
const helpers = require('./helpers');
const util = require('ethereumjs-util');
const abi = require('ethereumjs-abi');
const BigNumber = require('bignumber.js');

const ForwarderV4 = artifacts.require('./ForwarderV4.sol');
const ForwarderFactoryV4 = artifacts.require('./ForwarderFactoryV4.sol');

const hre = require('hardhat');

const createForwarderFactory = async () => {
  const forwarderContract = await ForwarderV4.new([], {});
  const forwarderFactory = await ForwarderFactoryV4.new(
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
  feeAddress,
  salt,
  shouldAutoFlushERC721 = true,
  shouldAutoFlushERC1155 = true
) => {
  const inputSalt = util.setLengthLeft(
    Buffer.from(util.stripHexPrefix(salt), 'hex'),
    32
  );

  const calculationSalt = abi.soliditySHA3(
    ['address', 'address', 'bytes32'],
    [parent, feeAddress, inputSalt]
  );

  const initCode = helpers.getInitCode(
    util.stripHexPrefix(implementationAddress)
  );
  const forwarderAddress = helpers.getNextContractAddressCreate2(
    factory.address,
    calculationSalt,
    initCode
  );

  await factory.createForwarder(
    parent,
    feeAddress,
    inputSalt,
    shouldAutoFlushERC721,
    shouldAutoFlushERC1155
  );

  return forwarderAddress;
};

describe('ForwarderFactoryV4', function () {
  let accounts;
  before(async () => {
    await hre.network.provider.send('hardhat_reset');
    accounts = await web3.eth.getAccounts();
  });

  it('Should create a functional forwarder using the factory', async function () {
    const { factory, implementationAddress } = await createForwarderFactory();

    const parent = accounts[0];
    const feeAddress = accounts[2];
    const salt = '0x1234';
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      feeAddress,
      salt,
      undefined,
      undefined
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

  it('Different salt should create forwarders at different addresses', async function () {
    const { factory, implementationAddress } = await createForwarderFactory();

    const parent = accounts[0];
    const feeAddress = accounts[2];
    const salt = '0x1234';
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      feeAddress,
      salt,
      undefined,
      undefined
    );

    const salt2 = '0x12345678';
    const forwarderAddress2 = await createForwarder(
      factory,
      implementationAddress,
      parent,
      feeAddress,
      salt2,
      undefined,
      undefined
    );

    forwarderAddress.should.not.equal(forwarderAddress2);
  });

  it('Different creators should create forwarders at different addresses', async function () {
    const { factory, implementationAddress } = await createForwarderFactory();
    const { factory: factory2, implementationAddress: implementationAddress2 } =
      await createForwarderFactory();

    const parent = accounts[0];
    const feeAddress = accounts[2];
    const salt = '0x1234';
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      feeAddress,
      salt,
      undefined,
      undefined
    );
    const forwarderAddress2 = await createForwarder(
      factory2,
      implementationAddress2,
      parent,
      feeAddress,
      salt,
      undefined,
      undefined
    );

    forwarderAddress.should.not.equal(forwarderAddress2);
  });

  it('Different parents should create forwarders at different addresses', async function () {
    const { factory, implementationAddress } = await createForwarderFactory();

    const parent = accounts[0];
    const feeAddress = accounts[2];
    const salt = '0x1234';
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      feeAddress,
      salt,
      undefined,
      undefined
    );

    const parent2 = accounts[3];
    const forwarderAddress2 = await createForwarder(
      factory,
      implementationAddress,
      parent2,
      feeAddress,
      salt,
      undefined,
      undefined
    );

    forwarderAddress.should.not.equal(forwarderAddress2);
  });

  [
    [true, 'true'],
    [false, 'false']
  ].map(([shouldAutoFlush, label]) => {
    it(`should assign the create a forwarder with ${label} autoflush721 params`, async () => {
      const { factory, implementationAddress } = await createForwarderFactory();

      const parent = accounts[0];
      const feeAddress = accounts[2];
      const salt = '0x1234';
      const forwarderAddress = await createForwarder(
        factory,
        implementationAddress,
        parent,
        feeAddress,
        salt,
        shouldAutoFlush,
        undefined
      );

      const forwarderContract = await hre.ethers.getContractAt(
        'ForwarderV4',
        forwarderAddress
      );
      const autoFlush721 = await forwarderContract.autoFlush721();

      autoFlush721.should.equal(shouldAutoFlush);
    });

    it(`should assign the create a forwarder with ${label} autoflush1155 params`, async () => {
      const { factory, implementationAddress } = await createForwarderFactory();

      const parent = accounts[0];
      const feeAddress = accounts[2];
      const salt = '0x1234';
      const forwarderAddress = await createForwarder(
        factory,
        implementationAddress,
        parent,
        feeAddress,
        salt,
        undefined,
        shouldAutoFlush
      );

      const forwarderContract = await hre.ethers.getContractAt(
        'ForwarderV4',
        forwarderAddress
      );
      const autoFlush1155 = await forwarderContract.autoFlush1155();
      autoFlush1155.should.equal(shouldAutoFlush);
    });
  });

  it('Should fail to create two contracts with the same inputs', async function () {
    const { factory, implementationAddress } = await createForwarderFactory();

    const parent = accounts[0];
    const feeAddress = accounts[2];
    const salt = '0x1234';
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      feeAddress,
      salt,
      undefined,
      undefined
    );
    await helpers.assertVMException(
      async () =>
        await createForwarder(
          factory,
          implementationAddress,
          parent,
          feeAddress,
          salt,
          undefined,
          undefined
        )
    );
  });
});
