require("should");

const truffleAssert = require("truffle-assertions");
const helpers = require("./helpers");
const util = require("ethereumjs-util");
const abi = require("ethereumjs-abi");
const { privateKeyForAccount } = require("../testrpc/accounts");
const BigNumber = require("bignumber.js");

const WalletSimple = artifacts.require("./WalletSimple.sol");
const WalletFactory = artifacts.require("./WalletFactory.sol");

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

const createWallet = async (
  factory,
  implementationAddress,
  signers,
  salt,
  sender
) => {
  const inputSalt = util.setLengthLeft(
    Buffer.from(util.stripHexPrefix(salt), "hex"),
    32
  );
  const calculationSalt = abi.soliditySHA3(
    ["address[]", "bytes32"],
    [signers, inputSalt]
  );
  const initCode = helpers.getInitCode(util.stripHexPrefix(implementationAddress));
  const walletAddress = helpers.getNextContractAddressCreate2(
    factory.address,
    calculationSalt,
    initCode
  );

  const tx = await factory.createWallet(signers, inputSalt, { from: sender });
  const walletCreatedEvent = await helpers.getEventFromTransaction(
    tx.receipt.transactionHash,
    "WalletCreated"
  );

  walletCreatedEvent.newWalletAddress.should.equal(walletAddress);
  JSON.stringify(walletCreatedEvent.allowedSigners).should.equal(
    JSON.stringify(signers)
  );
  return WalletSimple.at(walletAddress);
};

contract("WalletFactory", function (accounts) {
  it("Should create a functional wallet using the factory", async function () {
    const { factory, implementationAddress } = await createWalletFactory();

    const signers = [accounts[0], accounts[1], accounts[2]];
    const salt = "0x1234";
    const wallet = await createWallet(
      factory,
      implementationAddress,
      signers,
      salt,
      accounts[1]
    );
    const walletAddress = wallet.address;
    const startBalance = await getBalanceInWei(walletAddress);

    const amount = web3.utils.toWei("2", "ether");
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
      "ETHER",
      accounts[3].toLowerCase(),
      amount,
      "0x",
      expireTime,
      1
    );
    const sig = util.ecsign(operationHash, privateKeyForAccount(accounts[1]));

    await wallet.sendMultiSig(
      accounts[3].toLowerCase(),
      amount,
      "0x",
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

  it("Different salt should create at different addresses", async function () {
    const { factory, implementationAddress } = await createWalletFactory();

    const signers = [accounts[0], accounts[1], accounts[2]];
    const salt = "0x1234";
    const walletAddress = await createWallet(
      factory,
      implementationAddress,
      signers,
      salt,
      accounts[1]
    );

    const salt2 = "0x12345678";
    const walletAddress2 = await createWallet(
      factory,
      implementationAddress,
      signers,
      salt2,
      accounts[1]
    );

    walletAddress.should.not.equal(walletAddress2);
  });

  it("Different creators should create at different addresses", async function () {
    const { factory, implementationAddress } = await createWalletFactory();
    const {
      factory: factory2,
      implementationAddress: implementationAddress2
    } = await createWalletFactory();

    const signers = [accounts[0], accounts[1], accounts[2]];
    const salt = "0x1234";
    const walletAddress = await createWallet(
      factory,
      implementationAddress,
      signers,
      salt,
      accounts[1]
    );
    const walletAddress2 = await createWallet(
      factory2,
      implementationAddress2,
      signers,
      salt,
      accounts[1]
    );

    walletAddress.should.not.equal(walletAddress2);
  });

  it("Different signers should create at different addresses", async function () {
    const { factory, implementationAddress } = await createWalletFactory();

    const signers = [accounts[0], accounts[1], accounts[2]];
    const salt = "0x1234";
    const walletAddress = await createWallet(
      factory,
      implementationAddress,
      signers,
      salt,
      accounts[1]
    );

    const signers2 = [accounts[0], accounts[1], accounts[3]];
    const walletAddress2 = await createWallet(
      factory,
      implementationAddress,
      signers2,
      salt,
      accounts[1]
    );

    walletAddress.should.not.equal(walletAddress2);
  });

  it("Should fail to create two contracts with the same inputs", async function () {
    const { factory, implementationAddress } = await createWalletFactory();

    const signers = [accounts[0], accounts[1], accounts[2]];
    const salt = "0x1234";
    const walletAddress = await createWallet(
      factory,
      implementationAddress,
      signers,
      salt,
      accounts[1]
    );
    await helpers.assertVMException(
      async () =>
        await createWallet(
          factory,
          implementationAddress,
          signers,
          salt,
          accounts[1]
        )
    );
  });
});
