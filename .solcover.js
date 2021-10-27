const accounts = require('./testrpc/accounts');
const defaultBalance = '200000000000000000000000000';

module.exports = {
  mocha: {
    reporter: 'spec',
    enableTimeouts: false,
    grep: '@skip-on-coverage', // Find everything with this tag
    invert: true // Run the grep's inverse set.
  },
  skipFiles: [
    'ERC20Interface.sol',
    'test/Fail.sol',
    'test/FixedSupplyToken.sol',
    'test/ForwarderTarget.sol',
    'test/GasGuzzler.sol',
    'test/GasHeavy.sol',
    'test/MockERC721.sol',
    'test/Reentry.sol',
    'test/TestBatcherDriver.sol',
    'test/Tether.sol'
  ],
  providerOptions: {
    accounts: accounts.accounts.map(({ privkey }) => ({
      secretKey: '0x' + privkey.toString('hex'),
      balance: defaultBalance
    }))
  }
};
