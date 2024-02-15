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
  MAINNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT,
  TESTNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT,
  PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT,
  QUICKNODE_ETH_MAINNET_API_KEY,
  QUICKNODE_ETH_HOLESKY_API_KEY,
  QUICKNODE_ARBITRUM_SEPOLIA_API_KEY,
  QUICKNODE_OPTIMISM_SEPOLIA_API_KEY,
  QUICKNODE_ZKSYNC_SEPOLIA_API_KEY,
  ETHERSCAN_API_KEY,
  ALCHEMY_POLYGON_API_KEY,
  POLYGONSCAN_API_KEY,
  BSCSCAN_API_KEY,
  ARBISCAN_API_KEY,
  OPTIMISTIC_ETHERSCAN_API_KEY,
  ZKSYNC_EXPLORER_API_KEY
} = process.env;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          evmVersion: 'paris',
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      }
    ]
  },
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
      url: `https://ultra-empty-sanctuary.quiknode.pro/${QUICKNODE_ETH_MAINNET_API_KEY}`,
      accounts: [`${MAINNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT}`]
    },
    hteth: {
      url: `https://boldest-cosmological-mountain.ethereum-holesky.quiknode.pro/${QUICKNODE_ETH_HOLESKY_API_KEY}`,
      accounts: [`${TESTNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT}`]
    },
    matic: {
      url: `https://polygon-mainnet.g.alchemyapi.io/v2/${ALCHEMY_POLYGON_API_KEY}`,
      accounts: [`${MAINNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT}`]
    },
    tmatic: {
      //https://polygon-mumbai.g.alchemy.com/
      url: `https://polygon-mumbai.g.alchemyapi.io/v2/${ALCHEMY_POLYGON_API_KEY}`,
      accounts: [`${TESTNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT}`]
    },
    bsc: {
      url: `https://bsc-dataseed1.binance.org/`,
      accounts: [`${MAINNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT}`]
    },
    tbsc: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
      accounts: [`${TESTNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT}`]
    },
    tarbeth: {
      url: `${QUICKNODE_ARBITRUM_SEPOLIA_API_KEY}`,
      accounts: [`${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`]
    },
    topeth: {
      url: `${QUICKNODE_OPTIMISM_SEPOLIA_API_KEY}`,
      accounts: [`${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`]
    },
    tzketh: {
      url: `${QUICKNODE_ZKSYNC_SEPOLIA_API_KEY}`,
      accounts: [`${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`]
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
      holesky: `${ETHERSCAN_API_KEY}`,
      //polygon
      polygon: `${POLYGONSCAN_API_KEY}`,
      polygonMumbai: `${POLYGONSCAN_API_KEY}`,
      bscTestnet: `${BSCSCAN_API_KEY}`,
      bsc: `${BSCSCAN_API_KEY}`,
      // arbitrum
      arbitrumOne: `${ARBISCAN_API_KEY}`,
      arbitrumSepolia: `${ARBISCAN_API_KEY}`,
      // optimism
      optimisticEthereum: `${OPTIMISTIC_ETHERSCAN_API_KEY}`,
      optimisticSepolia: `${OPTIMISTIC_ETHERSCAN_API_KEY}`,
      // zksync
      zksync: `${ZKSYNC_EXPLORER_API_KEY}`,
      zksyncSepolia: `${ZKSYNC_EXPLORER_API_KEY}`
    },
    customChains: [
      {
        network: 'holesky',
        chainId: 17000,
        urls: {
          apiURL: 'https://api-holesky.etherscan.io/api',
          browserURL: 'https://holesky.etherscan.io'
        }
      },
      {
        network: 'arbitrumSepolia',
        chainId: 421614,
        urls: {
          apiURL: 'https://api-sepolia.arbiscan.io/api',
          browserURL: 'https://sepolia.arbiscan.io'
        }
      },
      {
        network: 'optimisticSepolia',
        chainId: 11155420,
        urls: {
          apiURL: 'https://api-sepolia-optimistic.etherscan.io/api',
          browserURL: 'https://sepolia-optimism.etherscan.io'
        }
      },
      {
        network: 'zksync',
        chainId: 324,
        urls: {
          apiURL: 'https://block-explorer-api.mainnet.zksync.io/api',
          browserURL: 'https://explorer.zksync.io'
        }
      },
      {
        network: 'zksyncSepolia',
        chainId: 300,
        urls: {
          apiURL: 'https://block-explorer-api.sepolia.zksync.dev/api',
          browserURL: 'https://sepolia.explorer.zksync.io'
        }
      }
    ]
  },
  mocha: {
    timeout: 100000
  }
};

export default config;
