require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const { HD_WALLET_API_URL, MNEMONIC, ETHERSCAN_API_KEY } = process.env;

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
        return new HDWalletProvider(MNEMONIC, HD_WALLET_API_URL);
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
  plugins: ['solidity-coverage', 'truffle-plugin-verify'],
  api_keys: {
    etherscan: ETHERSCAN_API_KEY ?? ''
  }
};
