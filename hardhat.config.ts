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
  PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT_BACKUP,
  PRIVATE_KEY_FOR_V1_WALLET_CONTRACT_DEPLOYMENT,
  PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT,
  QUICKNODE_ARBITRUM_SEPOLIA_API_KEY,
  QUICKNODE_OPTIMISM_SEPOLIA_API_KEY,
  QUICKNODE_ARBITRUM_ONE_API_KEY,
  QUICKNODE_OPTIMISM_API_KEY,
  QUICKNODE_ZKSYNC_SEPOLIA_API_KEY,
  ETHERSCAN_API_KEY,
  ALCHEMY_POLYGON_API_KEY,
  POLYGONSCAN_API_KEY,
  BSCSCAN_API_KEY,
  ARBISCAN_API_KEY,
  OPTIMISTIC_ETHERSCAN_API_KEY,
  ZKSYNC_EXPLORER_API_KEY,
  BASESCAN_API_KEY,
  BARTIO_BERA_EXPLORER_API_KEY,
  OAS_EXPLORER_API_KEY,
  CORE_DAO_TESTNET_EXPLORER_API_KEY,
  CORE_DAO_MAINNET_EXPLORER_API_KEY
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
      url: `https://ethereum-rpc.publicnode.com`,
      accounts: [`${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`]
    },
    hteth: {
      url: `https://rpc.holesky.ethpandaops.io/`,
      accounts: [`${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT_BACKUP}`]
    },
    matic: {
      url: `https://polygon-rpc.com/`,
      accounts: [`${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`]
    },
    tmatic: {
      // https://polygon-amoy.g.alchemy.com
      url: `https://polygon-amoy-bor-rpc.publicnode.com`,
      accounts: [`${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`]
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
      accounts: [`${TESTNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT}`]
    },
    arbeth: {
      url: `https://arb1.arbitrum.io/rpc`,
      accounts: [
        `${PRIVATE_KEY_FOR_V1_WALLET_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT_BACKUP}`
      ]
    },
    topeth: {
      url: `${QUICKNODE_OPTIMISM_SEPOLIA_API_KEY}`,
      accounts: [
        `${PRIVATE_KEY_FOR_V1_WALLET_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT_BACKUP}`
      ]
    },
    opeth: {
      url: `${QUICKNODE_OPTIMISM_API_KEY}`,
      accounts: [
        `${PRIVATE_KEY_FOR_V1_WALLET_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT_BACKUP}`
      ]
    },
    tzketh: {
      url: `${QUICKNODE_ZKSYNC_SEPOLIA_API_KEY}`,
      accounts: [`${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`]
    },
    tbaseeth: {
      url: 'https://sepolia.base.org',
      accounts: [`${TESTNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT}`]
    },
    baseeth: {
      url: 'https://mainnet.base.org/',
      accounts: [`${MAINNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT}`]
    },
    tbera: {
      url: `https://bartio.rpc.berachain.com/`,
      accounts: [`${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`]
    },
    toas: {
      url: `https://rpc.testnet.oasys.games`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    oas: {
      url: `https://rpc.mainnet.oasys.games`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tcoredao: {
      url: `https://rpc.test.btcs.network`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    coredao: {
      url: `https://rpc.coredao.org`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tavaxc: {
      url: 'https://api.avax-test.network/ext/C/rpc',
      accounts: [`${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`]
    },
    avaxc: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
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
      polygonAmoy: `${POLYGONSCAN_API_KEY}`,
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
      zksyncSepolia: `${ZKSYNC_EXPLORER_API_KEY}`,
      // base chain
      baseSepolia: `${BASESCAN_API_KEY}`,
      base: `${BASESCAN_API_KEY}`,
      // bera
      bartioBera: `${BARTIO_BERA_EXPLORER_API_KEY}`,
      //OAS
      oasTestnet: `${OAS_EXPLORER_API_KEY}`,
      oasMainnet: `${OAS_EXPLORER_API_KEY}`,
      //Core Dao
      coredaoTestnet: `${CORE_DAO_TESTNET_EXPLORER_API_KEY}`,
      coredaoMainnet: `${CORE_DAO_MAINNET_EXPLORER_API_KEY}`,
      //avaxc
      // there is free api key for avaxc, so make use of 2 req/sec
      avaxc: 'sampleapikey',
      avaxcTestnet: 'sampleapikey'
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
      },
      {
        network: 'bartioBera',
        chainId: 80084,
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/testnet/evm/80084/etherscan/api',
          browserURL: 'https://bartio.beratrail.io'
        }
      },
      {
        network: 'oasTestnet',
        chainId: 9372,
        urls: {
          apiURL: 'https://explorer.testnet.oasys.games/api',
          browserURL: 'https://explorer.testnet.oasys.games'
        }
      },
      {
        network: 'oasMainnet',
        chainId: 248,
        urls: {
          apiURL: 'https://explorer.oasys.games/api',
          browserURL: 'https://explorer.oasys.games/'
        }
      },
      {
        network: 'coredaoTestnet',
        chainId: 1115,
        urls: {
          apiURL: 'https://api.test.btcs.network/api',
          browserURL: 'https://scan.test.btcs.network'
        }
      },
      {
        network: 'coredaoMainnet',
        chainId: 1116,
        urls: {
          apiURL: 'https://openapi.coredao.org/api',
          browserURL: 'https://scan.coredao.org/'
        }
      },
      {
        network: 'polygonAmoy',
        chainId: 80002,
        urls: {
          apiURL: 'https://api-amoy.polygonscan.com/api',
          browserURL: 'https://amoy.polygonscan.com'
        }
      },
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org/'
        }
      },
      {
        network: 'base',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org/'
        }
      },
      {
        network: 'avaxc',
        chainId: 43114,
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/api',
          browserURL: 'https://snowtrace.io/'
        }
      },
      {
        network: 'avaxcTestnet',
        chainId: 43113,
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/testnet/evm/43113/etherscan/api',
          browserURL: 'https://testnet.snowtrace.io/'
        }
      }
    ]
  },
  mocha: {
    timeout: 100000
  }
};

export default config;
