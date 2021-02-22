const Batcher = artifacts.require('./Batcher.sol');
const TestBatcherDriver = artifacts.require('./TestBatcherDriver.sol');
const Reentry = artifacts.require('./Reentry.sol');
const Fail = artifacts.require('./Fail.sol');
const GasGuzzler = artifacts.require('./GasGuzzler.sol');
const GasHeavy = artifacts.require('./GasHeavy.sol');
const FixedSupplyToken = artifacts.require('./FixedSupplyToken.sol');
const Tether = artifacts.require('./TetherToken.sol');

const BatcherTransferEvent =
  '0xc42fa155158786a1dd6ccc3a785f35845467353c3cc700e0e31a79f90e22227d';

const { getBalance, abi: ethAbi } = web3.eth;
const { toBN } = web3.utils;

const sendFailedErrorMsg = 'Send failed';
const emptyErrMsg = 'Must send to at least one person';
const recipientsValuesMismatchErrMsg = 'Unequal recipients and values';
const fallbackErrMsg = 'Invalid fallback';
const plainReceiveErrMsg = 'Invalid receive';
const invalidRecipientErrMsg = 'Invalid recipient address';
const onlyOwnerErrMsg = 'Not owner';
const maxRecipientsExceededErrMsg = 'Too many recipients';
const unsuccessfulCallErrMsg = 'Call was not successful';
const zeroAddrOwnerChangeErrMsg = 'Invalid new owner';
const newGasTransferLimitTooLowErrMsg = 'Transfer gas limit too low';

// always between 1 and max included
const randInt = (max) => {
  return Math.floor(Math.random() * max) + 1;
};

const createRandIntArr = (len) => {
  const arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(randInt(100));
  }
  return arr;
};

const assertVMException = async (promise, expectedExceptionMsg) => {
  let badSucceed = false;
  try {
    await promise;
    badSucceed = true;
  } catch (err) {
    assert.notStrictEqual(
      err.message.search('VM Exception'),
      -1,
      'Received non-VM exception'
    );
    assert.strictEqual(
      err.reason || '',
      expectedExceptionMsg,
      "Didn't receive expected VM exception"
    );
  }
  if (badSucceed) {
    assert.fail("Didn't throw any exception");
  }
};

const assertBalanceDiff = (start, end, diff, errMsg) => {
  const startWithDiff = start.add(toBN(diff));
  assert.strictEqual(startWithDiff.toString(), end.toString(), errMsg);
};

contract('Batcher', (accounts) => {
  let batcherInstance;
  let reentryInstance;
  let failInstance;
  let gasGuzzlerInstance;
  let gasHeavyInstance;
  let testBatcherDriverInstance;

  const sender = accounts[0];
  const batcherOwner = accounts[8];
  const zeroAddr = '0x0000000000000000000000000000000000000000';

  before(async () => {
    batcherInstance = await Batcher.new({ from: batcherOwner });
    reentryInstance = await Reentry.new(batcherInstance.address);
    failInstance = await Fail.new();
    gasGuzzlerInstance = await GasGuzzler.new();
    gasHeavyInstance = await GasHeavy.new();
  });

  afterEach(async () => {
    const beforeWalletBalance = await getBalance(batcherInstance.address);
    await batcherInstance.recover(accounts[0], beforeWalletBalance, '0x', {
      from: batcherOwner
    });
  });

  const verifyLogs = (tx, sender, numSuccesses, recipients, values) => {
    const logs = tx.receipt.rawLogs;
    assert.strictEqual(
      logs.length,
      numSuccesses,
      `Expected ${numSuccesses} BatcherTransfer event(s), actually saw ${logs.length}`
    );
    logs.forEach((log, i) => {
      const { topics, data } = log;
      assert.strictEqual(
        topics.length,
        1,
        `Unexpected topics length, should be 1, was ${topics.length}`
      );
      assert.strictEqual(
        topics[0],
        BatcherTransferEvent,
        `Unexpected topic ${topics[0]}`
      );
      assert.strictEqual(
        data.length,
        194,
        `Incorrect data length ${data.length}`
      );
      const senderAddress = '0x' + data.slice(26, 66);
      assert.strictEqual(
        sender.toLowerCase(),
        senderAddress,
        'Sender address in logs not what was expected'
      );
      const recipientAddress = '0x' + data.slice(90, 130);
      const value = toBN('0x' + data.slice(130)).toString();
      if (
        recipients[i] !== reentryInstance.address &&
        recipients[i] !== failInstance.address
      ) {
        assert(
          recipients.find((elem) => recipientAddress === elem.toLowerCase()),
          'Invalid recipient in log'
        );
        assert(
          values.find((elem) => value === elem.toString()),
          'Invalid transfer amount in log'
        );
      }
    });
  };

  const runTestBatcherDriver = async ({
    recipients,
    values,
    extraValue = 0,
    expectedRetVal = 0,
    doSelfFail = false,
    doSelfReentry = false,
    expectedTransferFailures = [],
    expectOverallFailure = false,
    expectedErrMsg = '',
    gasLimit = 2e6
  }) => {
    // another contract is used to make checking if funds are returned easier otherwise gas calculations
    // would have to be used to make sure correct amount was returned to sender
    testBatcherDriverInstance = await TestBatcherDriver.new(
      batcherInstance.address,
      doSelfFail,
      doSelfReentry
    );
    const sendVal = values.reduce((sum, val) => sum + val, 0) + extraValue;
    const results = {};
    for (let i = 0; i < recipients.length; i++) {
      const account = recipients[i];
      if (!results[account]) {
        results[account] = {};
        results[account].startBalance = toBN(await getBalance(account));
        results[account].value = 0;
      }
      results[account].value += values[i];
    }

    if (expectOverallFailure) {
      await assertVMException(
        testBatcherDriverInstance.driveTest(recipients, values, {
          from: sender,
          value: sendVal,
          gas: gasLimit
        }),
        expectedErrMsg
      );
      return;
    }

    const tx = await testBatcherDriverInstance.driveTest(recipients, values, {
      from: sender,
      value: sendVal,
      gas: gasLimit
    });
    verifyLogs(
      tx,
      testBatcherDriverInstance.address,
      recipients.length - expectedTransferFailures.length,
      recipients,
      values
    );

    for (const account of Object.keys(results)) {
      const startBalance = results[account].startBalance;
      const endBalance = toBN(await getBalance(account));
      const value = results[account].value;
      if (expectedTransferFailures.includes(account)) {
        assertBalanceDiff(
          startBalance,
          endBalance,
          0,
          "Address that shouldn't have received funds did"
        );
      } else {
        assertBalanceDiff(
          startBalance,
          endBalance,
          value,
          "Valid account didn't receive funds"
        );
      }
    }

    //Check sender balances
    const testBatcherBalance = await getBalance(
      testBatcherDriverInstance.address
    );
    assert.strictEqual(
      parseInt(testBatcherBalance),
      expectedRetVal,
      'Sender should not receive funds unless it is a recipient.'
    );

    //Check batcher contract balances
    assert.strictEqual(
      parseInt(await getBalance(batcherInstance.address)),
      extraValue,
      'Batcher balance is not equal to expected value.'
    );
  };

  describe('Good transactions single recipient', () => {
    it('Sends batch with one recipient', async () => {
      const params = {
        recipients: [accounts[1]],
        values: [5]
      };
      await runTestBatcherDriver(params);
    });

    it('Deflects reentry and returns amount to sender', async () => {
      const params = {
        recipients: [reentryInstance.address],
        values: [5],
        extraValue: 5,
        expectedRetVal: 10,
        expectOverallFailure: true,
        expectedErrMsg: sendFailedErrorMsg
      };
      await runTestBatcherDriver(params);
    });

    it('Returns amount to sender when a recipient fails', async () => {
      const params = {
        recipients: [failInstance.address],
        values: [5],
        expectedRetVal: 5,
        expectOverallFailure: true,
        expectedErrMsg: sendFailedErrorMsg
      };
      await runTestBatcherDriver(params);
    });
  });

  describe('Good transactions multiple recipients', () => {
    it('Correctly sends with exact amount', async () => {
      const params = {
        recipients: accounts.slice(1, 4),
        values: createRandIntArr(3)
      };
      await runTestBatcherDriver(params);
    });

    it('Correctly sends with extra value', async () => {
      const params = {
        recipients: accounts.slice(1, 4),
        values: createRandIntArr(3),
        extraValue: 50
      };
      await runTestBatcherDriver(params);
    });

    it('Correctly sends with duplicate recipients', async () => {
      const params = {
        recipients: [
          accounts[1],
          accounts[1],
          accounts[2],
          accounts[3],
          accounts[3],
          accounts[4]
        ],
        values: createRandIntArr(6)
      };
      await runTestBatcherDriver(params);
    });

    it('Correctly sends with duplicate recipients and extra value', async () => {
      const params = {
        recipients: [
          accounts[1],
          accounts[1],
          accounts[2],
          accounts[3],
          accounts[3],
          accounts[4]
        ],
        values: createRandIntArr(6),
        extraValue: 100
      };
      await runTestBatcherDriver(params);
    });

    it('Correctly sends with duplicate recipient/value pairs', async () => {
      const params = {
        recipients: [
          accounts[1],
          accounts[1],
          accounts[2],
          accounts[3],
          accounts[3],
          accounts[4]
        ],
        values: [5, 5, 10, 15, 15, 20]
      };
      await runTestBatcherDriver(params);
    });

    it('Stress test 200 recipients', async () => {
      const bigRecipients = [];
      for (let i = 0; i < 200; i++) {
        bigRecipients.push(accounts[(i % 5) + 1]);
      }
      const randVals = createRandIntArr(200);
      const params = {
        recipients: bigRecipients,
        values: randVals,
        gasLimit: 3e6
      };
      await runTestBatcherDriver(params);
    });
  });

  describe('Failed transactions', () => {
    it('Correctly fails whole transaction with one reentrant contract', async () => {
      const params = {
        recipients: [reentryInstance.address, accounts[1], accounts[2]],
        values: [10, ...createRandIntArr(2)],
        expectedRetVal: '10',
        expectOverallFailure: true,
        expectedErrMsg: sendFailedErrorMsg
      };
      await runTestBatcherDriver(params);
    });

    it('Fails with multiple recipients with less than enough value', async () => {
      const randVals = createRandIntArr(3);
      const params = {
        recipients: accounts.slice(1, 4),
        values: randVals,
        extraValue: -1,
        expectedRetVal: (randVals[2] - 1).toString(),
        expectOverallFailure: true,
        expectedErrMsg: sendFailedErrorMsg
      };
      await runTestBatcherDriver(params);
    });

    it('Fails with multiple recipients with exactly less than enough value', async () => {
      const randVals = createRandIntArr(3);
      const params = {
        recipients: accounts.slice(1, 4),
        values: randVals,
        extraValue: -1 * randVals[2],
        expectedRetVal: '0',
        expectOverallFailure: true,
        expectedErrMsg: sendFailedErrorMsg
      };
      await runTestBatcherDriver(params);
    });

    it('Fails with multiple recipients with less than enough value for multiple recipients', async () => {
      const randVals = createRandIntArr(4);
      const lastTwo = randVals[2] + randVals[3];
      const params = {
        recipients: accounts.slice(1, 5),
        values: randVals,
        extraValue: -1 * (lastTwo - 1),
        expectOverallFailure: true,
        expectedErrMsg: sendFailedErrorMsg
      };
      await runTestBatcherDriver(params);
    });

    it('Fails with multiple recipients with exactly less than enough value for multiple recipients', async () => {
      const randVals = createRandIntArr(4);
      const lastTwo = randVals[2] + randVals[3];
      const params = {
        recipients: accounts.slice(1, 5),
        values: randVals,
        extraValue: -1 * lastTwo,
        expectedTransferFailures: [accounts[3], accounts[4]],
        expectOverallFailure: true,
        expectedErrMsg: sendFailedErrorMsg
      };
      await runTestBatcherDriver(params);
    });

    it('Fail when sending to gas guzzler', async () => {
      const randVals = createRandIntArr(4);
      const params = {
        recipients: [gasGuzzlerInstance.address].concat(accounts.slice(1, 4)),
        values: randVals,
        expectedRetVal: randVals[0].toString(),
        expectOverallFailure: true,
        expectedErrMsg: sendFailedErrorMsg,
        gasLimit: 1e6
      };
      await runTestBatcherDriver(params);
    });

    it('Fails with empty recipients and values', async () => {
      const params = {
        recipients: [],
        values: [],
        expectOverallFailure: true,
        expectedErrMsg: emptyErrMsg
      };
      await runTestBatcherDriver(params);
    });

    it('Fails with empty recipients and non-empty values', async () => {
      const params = {
        recipients: [],
        values: [5],
        expectOverallFailure: true,
        expectedErrMsg: emptyErrMsg
      };
      await runTestBatcherDriver(params);
    });

    it('Fails with recipients and values arrays of different sizes', async () => {
      const params = {
        recipients: accounts.slice(1, 3),
        values: [5],
        expectOverallFailure: true,
        expectedErrMsg: recipientsValuesMismatchErrMsg
      };
      await runTestBatcherDriver(params);
    });

    it('Fails when the fallback function is called', async () => {
      await assertVMException(
        batcherInstance.sendTransaction({
          from: sender,
          value: 5,
          data: '0x1234'
        }),
        fallbackErrMsg
      );
    });

    it('Fails when the plain receive function is called', async () => {
      await assertVMException(
        batcherInstance.sendTransaction({ from: sender, value: 5 }),
        plainReceiveErrMsg
      );
    });

    it('Fails for zero address', async () => {
      const params = {
        recipients: [zeroAddr],
        values: [5],
        expectOverallFailure: true,
        expectedErrMsg: invalidRecipientErrMsg
      };
      await runTestBatcherDriver(params);
    });

    it('Fails when the contract sending funds back to tries to reenter', async () => {
      const params = {
        recipients: [failInstance.address],
        values: [5],
        extraValue: 5,
        doSelfReentry: true,
        expectOverallFailure: true,
        expectedErrMsg: sendFailedErrorMsg
      };
      await runTestBatcherDriver(params);
    });

    it('Fails when the recipient reverts on recieve', async () => {
      const params = {
        recipients: [testBatcherDriverInstance.address],
        values: [5],
        extraValue: 5,
        doSelfFail: true,
        expectOverallFailure: true,
        expectedErrMsg: sendFailedErrorMsg
      };
      await runTestBatcherDriver(params);
    });

    it('Fails when recipients length exceeds uint8 capacity', async () => {
      const recipients = [];
      for (let i = 0; i < 256; i++) {
        recipients.push(accounts[1]);
      }
      const params = {
        recipients: recipients,
        values: createRandIntArr(256),
        expectOverallFailure: true,
        expectedErrMsg: maxRecipientsExceededErrMsg
      };
      await runTestBatcherDriver(params);
    });

    it('Executes as many transfers as possible when not given enough gas', async () => {
      const randVals = createRandIntArr(3);
      const params = {
        recipients: accounts.slice(1, 4),
        values: randVals,
        // costs roughly 40,000 gas to get to beginning of `distributeBatch`
        // and then another 10,000 gas for each subsequent iteration
        gasLimit: 8e4
      };
      await runTestBatcherDriver(params);
    });
  });

  describe('Only owner functions', () => {
    const recoverAddress = '0xeE223B2C6E49AE6F235A2B928c355454152d6ecc';

    it('Removing all stuck eth from batcher contract', async () => {
      const extraValue = 50;

      const params = {
        recipients: accounts.slice(1, 4),
        values: [5, 5, 10],
        extraValue
      };
      await runTestBatcherDriver(params);

      const beforeWalletBalance = await getBalance(recoverAddress);

      await batcherInstance.recover(recoverAddress, extraValue, '0x', {
        from: batcherOwner
      });

      const recoverWalletBalance = await getBalance(recoverAddress);
      assert.strictEqual(
        extraValue + parseInt(beforeWalletBalance),
        parseInt(recoverWalletBalance),
        'Recover stuck funds failed'
      );
    });

    it('Removing some stuck eth from batcher contract', async () => {
      const extraValue = 50;

      const params = {
        recipients: accounts.slice(1, 4),
        values: [5, 5, 10],
        extraValue
      };
      await runTestBatcherDriver(params);

      const beforeWalletBalance = await getBalance(recoverAddress);

      await batcherInstance.recover(recoverAddress, 30, '0x', {
        from: batcherOwner
      });

      const recoverWalletBalance = await getBalance(recoverAddress);
      assert.strictEqual(
        30 + parseInt(beforeWalletBalance),
        parseInt(recoverWalletBalance),
        'Recover stuck funds failed'
      );
    });

    it('Fail to withdraw more funds than are stuck in batcher contract', async () => {
      const params = {
        recipients: accounts.slice(1, 4),
        values: [5, 5, 10],
        extraValue: 50
      };
      await runTestBatcherDriver(params);
      const beforeWalletBalance = await getBalance(recoverAddress);

      await batcherInstance.recover(recoverAddress, 60, 0, {
        from: batcherOwner
      });

      const recoverWalletBalance = await getBalance(recoverAddress);
      assert.strictEqual(
        parseInt(beforeWalletBalance),
        parseInt(recoverWalletBalance),
        'Recover stuck funds failed'
      );
    });

    describe('Transferring ownership and setting gas transfer limit', () => {
      // note: at the start of every test, the Batcher owner should be `batcherOwner`
      // and the transfer gas limit should be the default
      const otherBatcherOwner = accounts[7];
      const defaultTransferGasLimit = 1e4;

      const setBatcherOwner = async (oldBatcherOwner, newBatcherOwner) => {
        const tx = await batcherInstance.transferOwnership(newBatcherOwner, {
          from: oldBatcherOwner
        });
        const {
          logs: [
            {
              args: { prevOwner, newOwner }
            }
          ]
        } = tx;
        assert.strictEqual(
          prevOwner,
          oldBatcherOwner,
          "Log emitted for ownership change doesn't reflect old owner"
        );
        assert.strictEqual(
          newOwner,
          newBatcherOwner,
          "Log emitted for ownership change doesn't reflect new owner"
        );
      };

      const setTransferGasLimit = async (ownerExecuting, newGasLimit) => {
        const tx = await batcherInstance.changeTransferGasLimit(newGasLimit, {
          from: ownerExecuting
        });
        const {
          logs: [
            {
              args: { newTransferGasLimit }
            }
          ]
        } = tx;
        assert.strictEqual(
          newTransferGasLimit.toNumber(),
          newGasLimit,
          "Log emitted for transfer gas limit change doesn't reflect new limit"
        );
      };

      afterEach(async () => {
        // this ensures that batcherOwner is always the owner and gas limit is default at the end of the test
        await setTransferGasLimit(batcherOwner, defaultTransferGasLimit);
      });

      it('Successfully transfers ownership', async () => {
        await setBatcherOwner(batcherOwner, otherBatcherOwner);
        await setBatcherOwner(otherBatcherOwner, batcherOwner);
      });

      it('Fails to transfer ownership for non-owner', async () => {
        await assertVMException(
          setBatcherOwner(otherBatcherOwner, batcherOwner),
          onlyOwnerErrMsg
        );
      });

      it('Fails to transfer ownership to zero address', async () => {
        await assertVMException(
          setBatcherOwner(batcherOwner, zeroAddr),
          zeroAddrOwnerChangeErrMsg
        );
      });

      it('Successfully sets transfer gas limit', async () => {
        await setTransferGasLimit(batcherOwner, 2e4);
      });

      it('Succeeds when increasing transferGasLimit to accommodate for gas-heavy contract', async () => {
        await setTransferGasLimit(batcherOwner, 10000);
        // transferGasLimit of 10000 shouldn't be enough
        let params = {
          recipients: [gasHeavyInstance.address],
          values: [5],
          expectedRetVal: '5',
          expectOverallFailure: true,
          expectedErrMsg: sendFailedErrorMsg
        };
        await runTestBatcherDriver(params);

        // now up the transferGasLimit to 20000
        await setTransferGasLimit(batcherOwner, 2e5);
        params = {
          recipients: [gasHeavyInstance.address],
          values: [5]
        };
        await runTestBatcherDriver(params);
      });

      it('Fails to set transfer gas limit for non-owner', async () => {
        await assertVMException(
          setTransferGasLimit(otherBatcherOwner, 2e4),
          onlyOwnerErrMsg
        );
      });

      it('Fails to set transfer gas limit below 2300', async () => {
        await assertVMException(
          setTransferGasLimit(batcherOwner, 2e3),
          newGasTransferLimitTooLowErrMsg
        );
      });
    });

    describe('Using recover for ERC20 Tokens', () => {
      let tokenContract;
      let totalSupply;
      const tokenContractOwner = accounts[9];

      const checkBalance = async (address, expectedAmt) => {
        const balance = await tokenContract.balanceOf(address);
        assert.strictEqual(
          balance.toString(),
          expectedAmt.toString(),
          `Token balance of ${address} was ${balance.toString()} when ${expectedAmt.toString()} was expected`
        );
      };

      const getTokenTransferData = (address, value) => {
        return ethAbi.encodeFunctionCall(
          {
            name: 'transfer',
            type: 'function',
            inputs: [
              {
                name: '_to',
                type: 'address'
              },
              {
                name: '_value',
                type: 'uint256'
              }
            ]
          },
          [address, value]
        );
      };

      const getUSDTTokenTransferData = (address, value) => {
        const methodId = '0xa9059cbb';
        return (
          methodId +
          ethAbi
            .encodeParameters(['address', 'uint'], [address, value])
            .substring(2)
        );
      };

      beforeEach(async () => {
        tokenContract = await FixedSupplyToken.new({
          from: tokenContractOwner
        });
        totalSupply = await tokenContract.totalSupply();
        await checkBalance(tokenContractOwner, totalSupply);
        await tokenContract.transfer(batcherInstance.address, 5, {
          from: tokenContractOwner
        });
        await checkBalance(batcherInstance.address, 5);
      });

      it('Correctly recover USDT tokens', async () => {
        const tetherTokenContract = await Tether.new(
          '1000000',
          'USDT',
          'USDT',
          6,
          {
            from: batcherOwner
          }
        );

        await tetherTokenContract.transfer(batcherInstance.address, 100, {
          from: batcherOwner
        });

        const tokenTransferData = getUSDTTokenTransferData(batcherOwner, 100);

        await batcherInstance.recover(
          tetherTokenContract.address,
          0,
          tokenTransferData,
          { from: batcherOwner }
        );

        const batcherBalance = await tetherTokenContract.balanceOf.call(
          batcherInstance.address
        );
        const senderBalance = await tetherTokenContract.balanceOf.call(
          batcherOwner
        );

        assert.strictEqual(
          batcherBalance.toString(),
          '0',
          'Batcher USDT balance should be 0.'
        );
        assert.strictEqual(
          senderBalance.toString(),
          '1000000',
          'Sender USDT balance should be 1000000.'
        );
      });

      it('Correctly sends tokens back', async () => {
        const tokenTransferData = getTokenTransferData(tokenContractOwner, 5);
        await batcherInstance.recover(
          tokenContract.address,
          0,
          tokenTransferData,
          { from: batcherOwner }
        );
        await checkBalance(tokenContractOwner, totalSupply);
      });

      it("Doesn't allow an address other than the owner to transfer tokens", async () => {
        const tokenTransferData = getTokenTransferData(accounts[1], 5);
        await assertVMException(
          batcherInstance.recover(tokenContract.address, 0, tokenTransferData, {
            from: accounts[1]
          }),
          onlyOwnerErrMsg
        );
      });

      it('Returns false on a bad token transfer', async () => {
        const tokenTransferData = getTokenTransferData(tokenContractOwner, 10);
        const res = await batcherInstance.recover.call(
          tokenContract.address,
          0,
          tokenTransferData,
          { from: batcherOwner }
        );
        assert.strictEqual(
          ethAbi.decodeParameter('bool', res),
          false,
          "Token transfer shouldn't have been successful"
        );
        await checkBalance(tokenContractOwner, totalSupply - 5);
      });
    });
  });
});
