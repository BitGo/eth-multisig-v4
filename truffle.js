
module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
      // https://github.com/trufflesuite/truffle/issues/271#issuecomment-341651827
      gas: 2900000
    }
  },
  compilers: {
    solc: {
      version: "^0.7.0"
    }
  }
};
