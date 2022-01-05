require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const { API_URL, MNEMONIC } = process.env;

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
      gas: 5800000,
      websockets: true
    },
    live: {
      provider: function () {
        return new HDWalletProvider(MNEMONIC, API_URL);
      },
      network_id: '*',
      gas: 5800000,
      websockets: true
    }
  },
  compilers: {
    solc: {
      version: '0.8.10',
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  plugins: ['solidity-coverage']
};
