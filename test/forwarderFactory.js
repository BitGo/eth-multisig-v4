require("should");

const truffleAssert = require("truffle-assertions");
const helpers = require("./helpers");
const util = require("ethereumjs-util");
const abi = require("ethereumjs-abi");
const BigNumber = require("bignumber.js");

const Forwarder = artifacts.require("./Forwarder.sol");
const ForwarderFactory = artifacts.require("./ForwarderFactory.sol");

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
  sender
) => {
  const inputSalt = util.setLengthLeft(
    Buffer.from(util.stripHexPrefix(salt), "hex"),
    32
  );
  const calculationSalt = abi.soliditySHA3(
    ["address", "bytes32"],
    [parent, inputSalt]
  );
  const initCode = getInitCode(util.stripHexPrefix(implementationAddress));
  const forwarderAddress = helpers.getNextContractAddressCreate2(
    factory.address,
    calculationSalt,
    initCode
  );

  await factory.createForwarder(parent, inputSalt, { from: sender });

  return forwarderAddress;
};

const getInitCode = (targetAddress) => {
  const target = util
    .stripHexPrefix(targetAddress.toLowerCase())
    .padStart(40, "0");
  return `0x3d602d80600a3d3981f3363d3d373d3d3d363d73${target}5af43d82803e903d91602b57fd5bf3`;
};

contract("ForwarderFactory", function (accounts) {
  it("Should create a functional forwarder using the factory", async function () {
    const { factory, implementationAddress } = await createForwarderFactory();

    const parent = accounts[0];
    const salt = "0x1234";
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      salt,
      accounts[1]
    );
    const startBalance = await getBalanceInWei(parent);
    const startForwarderBalance = await getBalanceInWei(forwarderAddress);

    const amount = web3.utils.toWei("2", "ether");
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

  it("Different salt should create at different addresses", async function () {
    const { factory, implementationAddress } = await createForwarderFactory();

    const parent = accounts[0];
    const salt = "0x1234";
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      salt,
      accounts[1]
    );

    const salt2 = "0x12345678";
    const forwarderAddress2 = await createForwarder(
      factory,
      implementationAddress,
      parent,
      salt2,
      accounts[1]
    );

    forwarderAddress.should.not.equal(forwarderAddress2);
  });

  it("Different creators should create at different addresses", async function () {
    const { factory, implementationAddress } = await createForwarderFactory();
    const {
      factory: factory2,
      implementationAddress: implementationAddress2
    } = await createForwarderFactory();

    const parent = accounts[0];
    const salt = "0x1234";
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      salt,
      accounts[1]
    );
    const forwarderAddress2 = await createForwarder(
      factory2,
      implementationAddress2,
      parent,
      salt,
      accounts[1]
    );

    forwarderAddress.should.not.equal(forwarderAddress2);
  });

  it("Different parents should create at different addresses", async function () {
    const { factory, implementationAddress } = await createForwarderFactory();

    const parent = accounts[0];
    const salt = "0x1234";
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      salt,
      accounts[1]
    );

    const parent2 = accounts[1];
    const forwarderAddress2 = await createForwarder(
      factory,
      implementationAddress,
      parent2,
      salt,
      accounts[1]
    );

    forwarderAddress.should.not.equal(forwarderAddress2);
  });

  it("Should fail to create two contracts with the same inputs", async function () {
    const { factory, implementationAddress } = await createForwarderFactory();

    const parent = accounts[0];
    const salt = "0x1234";
    const forwarderAddress = await createForwarder(
      factory,
      implementationAddress,
      parent,
      salt,
      accounts[1]
    );
    await helpers.assertVMException(
      async () =>
        await createForwarder(
          factory,
          implementationAddress,
          parent,
          salt,
          accounts[1]
        )
    );
  });
});
