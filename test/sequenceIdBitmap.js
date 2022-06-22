const should = require('should');

const truffleAssert = require('truffle-assertions');
const helpers = require('./helpers');
const BigNumber = require('bignumber.js');
const { makeInterfaceId } = require('@openzeppelin/test-helpers');

const SequenceIdTest = artifacts.require('./SequenceIdTest.sol');
const util = require('ethereumjs-util');
const abi = require('ethereumjs-abi');
const hre = require('hardhat');

describe('SequenceIdBitmap', function () {
  let sequenceIdTest;

  beforeEach(async () => {
    sequenceIdTest = await SequenceIdTest.new();
  });

  it('gets values', async function () {
    for (let i = 0; i < 10; i++) {
      expect((await sequenceIdTest.get(i)).toNumber()).to.equal(0);
    }
  });

  it('sets value at index 0', async function () {
    await sequenceIdTest.set(0, 500);
    expect((await sequenceIdTest.get(0)).toNumber()).to.equal(500);

    for (let i = 1; i < 10; i++) {
      expect((await sequenceIdTest.get(i)).toNumber()).to.equal(0);
    }
  });

  it('sets all values', async function () {
    for (let i = 0; i < 10; i++) {
      await sequenceIdTest.set(i, i + 100);
    }

    for (let i = 1; i < 10; i++) {
      expect((await sequenceIdTest.get(i)).toNumber()).to.equal(100 + i);
    }
  });
});
