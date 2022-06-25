import * as dotenv from 'dotenv';
dotenv.config();
import '@nomiclabs/hardhat-etherscan';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-truffle5';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

const {
  PRIVATE_KEY,
  ALCHEMY_ETHER_API_KEY,
  ETHERSCAN_API_KEY,
  ALCHEMY_POLYGON_API_KEY,
  POLYGONSCAN_API_KEY
} = process.env;

const config: HardhatUserConfig = {
  solidity: '0.8.10',
  networks: {
    hardhat: {
      // If chainId is omitted, then there is no chain id validation
      accounts: [
        '0xc8209c2200f920b11a460733c91687565c712b40c6f0350e9ad4138bf3193e47',
        '0x915334f048736c64127e91a1dc35dad86c91e59081cdc12cd060103050e2f3b1',
        '0x80bf357dd53e61db0e68acbb270e16fd42645903b51329c856cf3cb36f180a3e',
        '0xdf231d240ce40f844d56cea3a7663b4be8c373fdd6a4fe69cacaaa68c698c590',
        '0x71ce3f6c92d687ebbdc9b632744178707f39228ae1001a2de66f8b98de36ca07',
        '0xca4e687f97b8c64705cddb53c92454994c83abcb4218c7c62955bac292c3bc9e',
        '0x0755057fc0113fdc174e919622f237d30044a4c1c47f3663608b9ee9e8a1a58a',
        '0x1a4002a3e2d0c18c058265600838cff40ba24303f6e60cd1c74821e8251f84d5',
        '0x6d276292b8f5047b54db5b2179b5f7050636feaccf6c97a2978200d41d9d3374',
        '0xace7201611ba195f85fb2e25b53e0f9869e57e2267d1c5eef63144c75dee5142'
      ].map((key) => ({
        privateKey: key,
        balance: '200000000000000000000000000'
      })),
      loggingEnabled: false
    },
    eth: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_ETHER_API_KEY}`,
      accounts: [`${PRIVATE_KEY}`]
    },
    gteth: {
      url: `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_ETHER_API_KEY}`,
      accounts: [`${PRIVATE_KEY}`]
    },
    matic: {
      url: `https://polygon-mainnet.g.alchemyapi.io/v2/${ALCHEMY_POLYGON_API_KEY}`,
      accounts: [`${PRIVATE_KEY}`]
    },
    tmatic: {
      //https://polygon-mumbai.g.alchemy.com/
      url: `https://polygon-mumbai.g.alchemyapi.io/v2/${ALCHEMY_POLYGON_API_KEY}`,
      accounts: [`${PRIVATE_KEY}`]
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD'
  },
  etherscan: {
    apiKey: {
      //ethereum
      mainnet: `${ETHERSCAN_API_KEY}`,
      goerli: `${ETHERSCAN_API_KEY}`,
      //polygon
      polygon: `${POLYGONSCAN_API_KEY}`,
      polygonMumbai: `${POLYGONSCAN_API_KEY}`
    }
  },
  mocha: {
    timeout: 100000
  }
};

export default config;
