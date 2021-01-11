const should = require("should");

const truffleAssert = require("truffle-assertions");
const helpers = require("./helpers");
const BigNumber = require("bignumber.js");

const Forwarder = artifacts.require("./Forwarder.sol");

const createForwarder = async (creator, parent) => {
  const forwarderContract = await Forwarder.new([], { from: creator });
  await forwarderContract.init(parent);
  return forwarderContract;
};

const getBalanceInWei = async (address) => {
  return new BigNumber(await web3.eth.getBalance(address));
};

const FORWARDER_DEPOSITED_EVENT = "ForwarderDeposited";

contract("Forwarder", function (accounts) {
  it("Basic forwarding test", async function () {
    const forwarder = await createForwarder(accounts[0], accounts[0]);
    const startBalance = await getBalanceInWei(accounts[0]);
    const amount = web3.utils.toWei("2", "ether");

    const tx = await web3.eth.sendTransaction({
      from: accounts[1],
      to: forwarder.address,
      value: amount
    });

    const endBalance = await getBalanceInWei(accounts[0]);
    startBalance.plus(amount).eq(endBalance).should.be.true();
    const forwardedEvent = await helpers.getEventFromTransaction(
      tx.transactionHash,
      FORWARDER_DEPOSITED_EVENT
    );

    should.exist(forwardedEvent);
    forwardedEvent.from.should.equal(accounts[1]);
    forwardedEvent.value.should.equal(amount);
  });

  it("Flush on initialization", async function () {
    // determine the forwarder contract address
    const amount = web3.utils.toWei("5", "ether");
    const baseAddress = accounts[3];
    const senderAddress = accounts[0];
    const forwarderAddress = await helpers.getNextContractAddress(
      senderAddress
    );

    const startBalance = await getBalanceInWei(baseAddress);

    // send funds to the contract address first
    await web3.eth.sendTransaction({
      from: accounts[2],
      to: forwarderAddress,
      value: amount
    });

    // Check that the ether is in the forwarder address and not yet in the base address
    (await getBalanceInWei(forwarderAddress)).eq(amount).should.be.true();
    (await getBalanceInWei(baseAddress)).eq(startBalance).should.be.true();

    const forwarder = await Forwarder.new([], { from: senderAddress });
    const tx = await forwarder.init(baseAddress);
    forwarder.address.should.eql(forwarderAddress);

    // Check that the ether was automatically flushed to the base address
    (await getBalanceInWei(forwarderAddress)).eq(0).should.be.true();
    (await getBalanceInWei(baseAddress))
      .eq(startBalance.plus(amount))
      .should.be.true();

    const forwardedEvent = await helpers.getEventFromTransaction(
      tx.receipt.transactionHash,
      FORWARDER_DEPOSITED_EVENT
    );

    should.exist(forwardedEvent);
    forwardedEvent.from.should.equal(forwarderAddress);
    forwardedEvent.value.should.equal(amount);
  });

  it("Should forward with data passed", async function () {
    const forwarder = await createForwarder(accounts[0], accounts[0]);
    const startBalance = await getBalanceInWei(accounts[0]);
    const amount = web3.utils.toWei("2", "ether");

    await web3.eth.sendTransaction({
      from: accounts[1],
      to: forwarder.address,
      value: amount,
      data: "0x1234abcd"
    });

    const endBalance = await getBalanceInWei(accounts[0]);
    startBalance.plus(amount).eq(endBalance).should.be.true();
  });

  it("Should not init twice", async function () {
    const baseAddress = accounts[3];
    const forwarder = await createForwarder(baseAddress, baseAddress);

    await truffleAssert.reverts(
      forwarder.init(baseAddress, { from: baseAddress })
    );
  });
});
