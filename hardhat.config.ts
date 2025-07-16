import * as dotenv from 'dotenv';
dotenv.config();
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-verify';
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
  CARTIO_BERA_EXPLORER_API_KEY,
  BERA_EXPLORER_API_KEY,
  OAS_EXPLORER_API_KEY,
  CORE_DAO_TESTNET_EXPLORER_API_KEY,
  CORE_DAO_MAINNET_EXPLORER_API_KEY,
  FLARE_EXPLORER_API_KEY,
  SONGBIRD_EXPLORER_API_KEY,
  XDC_EXPLORER_API_KEY,
  WEMIX_EXPLORER_API_KEY,
  BERA_RPC_URL,
  MONAD_EXPLORER_API_KEY,
  SOMNIA_EXPLORER_API_KEY,
  SONEIUM_EXPLORER_API_KEY,
  WORLD_EXPLORER_API_KEY,
  CTC_EXPLORER_API_KEY,
  APECHAIN_EXPLORER_API_KEY,
  PHAROS_EXPLORER_API_KEY,
  SONIC_EXPLORER_API_KEY,
  SEIEVM_EXPLORER_API_KEY
} = process.env;

const PLACEHOLDER_KEY: string =
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

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
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    hteth: {
      url: `https://ethereum-hoodi-rpc.publicnode.com`,
      accounts: [
        `${TESTNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    matic: {
      url: `https://polygon-rpc.com/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tmatic: {
      // https://polygon-amoy.g.alchemy.com
      url: `https://polygon-amoy-bor-rpc.publicnode.com`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    bsc: {
      url: `https://bsc-dataseed1.binance.org/`,
      accounts: [
        `${MAINNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tbsc: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
      accounts: [
        `${TESTNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tarbeth: {
      url: `${QUICKNODE_ARBITRUM_SEPOLIA_API_KEY}`,
      accounts: [
        `${TESTNET_PRIVATE_KEY_FOR_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    arbeth: {
      url: `https://arb1.arbitrum.io/rpc`,
      accounts: [
        `${PRIVATE_KEY_FOR_V1_WALLET_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT_BACKUP}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    topeth: {
      url: `${QUICKNODE_OPTIMISM_SEPOLIA_API_KEY}`,
      accounts: [
        `${PRIVATE_KEY_FOR_V1_WALLET_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT_BACKUP}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    opeth: {
      url: `${QUICKNODE_OPTIMISM_API_KEY}`,
      accounts: [
        `${PRIVATE_KEY_FOR_V1_WALLET_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT_BACKUP}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
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
      url: `https://rockbeard-eth-cartio.berachain.com/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    bera: {
      url: `${BERA_RPC_URL}`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    toas: {
      url: `https://rpc.testnet.oasys.games`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    oas: {
      url: `https://rpc.mainnet.oasys.games`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tcoredao: {
      url: `https://rpc.test2.btcs.network`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    coredao: {
      url: `https://rpc.coredao.org`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tworld: {
      url: `https://worldchain-sepolia.gateway.tenderly.co`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    world: {
      url: `https://worldchain-mainnet.g.alchemy.com/public`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tsoneium: {
      url: `https://rpc.minato.soneium.org/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    soneium: {
      url: `https://rpc.soneium.org/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tstt: {
      url: `https://rpc.ankr.com/somnia_testnet?apikey=e97af24c8759a6cad0acd837d853aac43bb0903dcdab411d08b77aaf5c4c38a7`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    stt: {
      url: `https://rpc.somnia.network`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tmon: {
      url: `https://testnet-rpc.monad.xyz/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    mon: {
      url: `https://testnet-rpc.monad.xyz/`, //TODO: WIN-5225: change it with mainnet url, when its available
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tflr: {
      url: `https://coston2-api.flare.network/ext/C/rpc`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    flr: {
      url: `https://flare-api.flare.network/ext/C/rpc`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tsgb: {
      url: `https://coston-api.flare.network/ext/C/rpc`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    sgb: {
      url: `https://songbird-api.flare.network/ext/C/rpc`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tavaxc: {
      url: 'https://api.avax-test.network/ext/C/rpc',
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    avaxc: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    txdc: {
      url: `https://rpc.apothem.network`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    xdc: {
      url: `https://erpc.xinfin.network`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    twemix: {
      url: `https://api.test.wemix.com`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    wemix: {
      url: `https://api.wemix.com`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    celo: {
      url: `https://forno.celo.org`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tcelo: {
      url: `https://alfajores-forno.celo-testnet.org`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    etc: {
      url: `https://etc.etcdesktop.com`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tetc: {
      url: `https://rpc.mordor.etccooperative.org`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tctc: {
      url: `https://rpc.cc3-testnet.creditcoin.network`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    ctc: {
      url: `https://mainnet3.creditcoin.network`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tapechain: {
      url: `https://rpc.curtis.apechain.com`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    apechain: {
      url: `https://apechain.drpc.org`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tphrs: {
      url: `https://testnet.dplabs-internal.com`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    phrs: {
      url: `https://testnet.dplabs-internal.com`, // TODO: WIN-5781: change with mainnet url when its available
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tsonic: {
      url: `https://rpc.blaze.soniclabs.com/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    sonic: {
      url: `https://rpc.soniclabs.com`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tseievm: {
      url: `https://seitrace.com`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    seievm: {
      url: `https://seitrace.com`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
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
      hoodi: `${ETHERSCAN_API_KEY}`,
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
      cartioBera: `${CARTIO_BERA_EXPLORER_API_KEY}`,
      bera: `${BERA_EXPLORER_API_KEY}`,
      //OAS
      oasTestnet: `${OAS_EXPLORER_API_KEY}`,
      oasMainnet: `${OAS_EXPLORER_API_KEY}`,
      //Core Dao
      coredaoTestnet: `${CORE_DAO_TESTNET_EXPLORER_API_KEY}`,
      coredaoMainnet: `${CORE_DAO_MAINNET_EXPLORER_API_KEY}`,
      //Flare
      flareTestnet: `${FLARE_EXPLORER_API_KEY}`,
      flareMainnet: `${FLARE_EXPLORER_API_KEY}`,
      //Songbird
      songbirdTestnet: `${SONGBIRD_EXPLORER_API_KEY}`,
      songbirdMainnet: `${SONGBIRD_EXPLORER_API_KEY}`,
      //avaxc
      // there is free api key for avaxc, so make use of 2 req/sec
      avaxc: 'sampleapikey',
      avaxcTestnet: 'sampleapikey',
      //XDC
      xdcTestnet: `${XDC_EXPLORER_API_KEY}`,
      xdcMainnet: `${XDC_EXPLORER_API_KEY}`,
      wemixTestnet: `${WEMIX_EXPLORER_API_KEY}`,
      wemixMainnet: `${WEMIX_EXPLORER_API_KEY}`,
      //Monad
      monadTestnet: `${MONAD_EXPLORER_API_KEY}`,
      monadMainnet: `${MONAD_EXPLORER_API_KEY}`,
      //Somnia
      somniaTestnet: `${SOMNIA_EXPLORER_API_KEY}`,
      somniaMainnet: `${SOMNIA_EXPLORER_API_KEY}`,
      //Soneium
      soneiumTestnet: `${SONEIUM_EXPLORER_API_KEY}`,
      soneiumMainnet: `${SONEIUM_EXPLORER_API_KEY}`,
      //World
      worldTestnet: `${WORLD_EXPLORER_API_KEY}`,
      worldMainnet: `${WORLD_EXPLORER_API_KEY}`,
      //Creditcoin
      ctcTestnet: `${CTC_EXPLORER_API_KEY}`,
      ctcMainnet: `${CTC_EXPLORER_API_KEY}`,
      //Apechain
      apechainTestnet: `${APECHAIN_EXPLORER_API_KEY}`,
      apechainMainnet: `${APECHAIN_EXPLORER_API_KEY}`,
      //Pharos
      pharosTestnet: `${PHAROS_EXPLORER_API_KEY}`,
      pharosMainnet: `${PHAROS_EXPLORER_API_KEY}`,
      //Sonic
      sonicTestnet: `${SONIC_EXPLORER_API_KEY}`,
      sonicMainnet: `${SONIC_EXPLORER_API_KEY}`,
      //SEIEVM
      seievmTestnet: `${SEIEVM_EXPLORER_API_KEY}`,
      seievmMainnet: `${SEIEVM_EXPLORER_API_KEY}`
    },
    customChains: [
      {
        network: 'hoodi',
        chainId: 560048,
        urls: {
          apiURL: 'https://api-hoodi.etherscan.io/api',
          browserURL: 'https://hoodi.etherscan.io'
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
        network: 'cartioBera',
        chainId: 80000,
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/testnet/evm/80000/etherscan/api',
          browserURL: 'https://80000.testnet.routescan.io'
        }
      },
      {
        network: 'bera',
        chainId: 80094,
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/mainnet/evm/80094/etherscan/api',
          browserURL: 'https://80094.routescan.io'
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
        chainId: 1114,
        urls: {
          apiURL: 'https://api.test2.btcs.network/api',
          browserURL: 'https://scan.test2.btcs.network'
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
      },
      {
        network: 'worldTestnet',
        chainId: 4801,
        urls: {
          apiURL: 'https://api-sepolia.worldscan.org/api',
          browserURL: 'https://sepolia.worldscan.org/'
        }
      },
      {
        network: 'worldMainnet',
        chainId: 480,
        urls: {
          apiURL: 'https://api.worldscan.org/',
          browserURL: 'https://worldscan.org/'
        }
      },
      {
        network: 'ctcTestnet',
        chainId: 102031,
        urls: {
          apiURL: 'https://creditcoin-testnet.blockscout.com/api',
          browserURL: 'https://creditcoin-testnet.blockscout.com/'
        }
      },
      {
        network: 'ctcMainnet',
        chainId: 102030,
        urls: {
          apiURL: 'https://creditcoin.blockscout.com/api',
          browserURL: 'https://creditcoin.blockscout.com/'
        }
      },
      {
        network: 'apechainTestnet',
        chainId: 33111,
        urls: {
          apiURL: 'https://api.etherscan.io/v2/api',
          browserURL: 'https://curtis.apescan.io/'
        }
      },
      {
        network: 'apechainMainnet',
        chainId: 33139,
        urls: {
          apiURL: 'https://api.apescan.io/api',
          browserURL: 'https://apescan.io/'
        }
      },
      {
        network: 'pharosTestnet',
        chainId: 688688,
        urls: {
          apiURL:
            'https://api.socialscan.io/pharos-testnet/v1/explorer/command_api/contract',
          browserURL: 'https://testnet.pharosscan.xyz'
        }
      },
      {
        network: 'pharosMainnet',
        chainId: 688688, // TODO: WIN-5781: change it with mainnet details, when its available
        urls: {
          apiURL: '', // TODO: WIN-5781: change it with mainnet details, when its available
          browserURL: '' // TODO: WIN-5781: change it with mainnet details, when its available
        }
      },
      {
        network: 'soneiumTestnet',
        chainId: 1946,
        urls: {
          apiURL: 'https://soneium-minato.blockscout.com/api',
          browserURL: 'https://soneium-minato.blockscout.com/'
        }
      },
      {
        network: 'soneiumMainnet',
        chainId: 1868,
        urls: {
          apiURL: 'https://soneium.blockscout.com/api',
          browserURL: 'https://soneium.blockscout.com/'
        }
      },
      {
        network: 'sonicTestnet',
        chainId: 57054,
        urls: {
          apiURL: 'https://api.etherscan.io/v2/api',
          browserURL: 'https://testnet.sonicscan.org/'
        }
      },
      {
        network: 'seievmTestnet',
        chainId: 1328,
        urls: {
          apiURL: 'https://seitrace.com/atlantic-2/api',
          browserURL: 'https://seitrace.com'
        }
      },
      {
        network: 'seievmMainnet',
        chainId: 1329,
        urls: {
          apiURL: 'https://seitrace.com/pacific-1/api',
          browserURL: 'https://seitrace.com'
        }
      },
      {
        network: 'sonicMainnet',
        chainId: 146,
        urls: {
          apiURL: 'https://api.sonicscan.org/api',
          browserURL: 'https://sonicscan.org'
        }
      },
      {
        network: 'somniaTestnet',
        chainId: 50312,
        urls: {
          apiURL: 'https://shannon-explorer.somnia.network/api',
          browserURL: 'https://shannon-explorer.somnia.network/'
        }
      },
      {
        network: 'somniaMainnet',
        chainId: 5031,
        urls: {
          apiURL: 'https://api.infra.mainnet.somnia.network/',
          browserURL: 'https://shannon-explorer.somnia.network/' //TODO: WIN-5278: change it with mainnet explorer, when its available
        }
      },
      {
        network: 'monadTestnet',
        chainId: 10143,
        urls: {
          apiURL:
            'https://api.socialscan.io/monad-testnet/v1/explorer/command_api/contract',
          browserURL: 'https://monad-testnet.socialscan.io/'
        }
      },
      {
        network: 'monadMainnet',
        chainId: 10143, //TODO: WIN-5225: change it with mainnet explorer, when its available
        urls: {
          apiURL:
            'https://api.socialscan.io/monad-testnet/v1/explorer/command_api/contract', //TODO: WIN-5225: change it with mainnet explorer, when its available
          browserURL: 'https://monad-testnet.socialscan.io/' //TODO: WIN-5225: change it with mainnet explorer, when its available
        }
      },
      {
        network: 'flareTestnet',
        chainId: 114,
        urls: {
          apiURL: 'https://coston2-explorer.flare.network/api',
          browserURL: 'https://coston2-explorer.flare.network'
        }
      },
      {
        network: 'flareMainnet',
        chainId: 14,
        urls: {
          apiURL: 'https://flare-explorer.flare.network/api',
          browserURL: 'https://flare-explorer.flare.network'
        }
      },
      {
        network: 'songbirdTestnet',
        chainId: 16,
        urls: {
          apiURL: 'https://coston-explorer.flare.network/api',
          browserURL: 'https://coston-explorer.flare.network'
        }
      },
      {
        network: 'songbirdMainnet',
        chainId: 19,
        urls: {
          apiURL: 'https://songbird-explorer.flare.network/api ',
          browserURL: 'https://songbird.flarescan.com'
        }
      },
      {
        network: 'xdcTestnet',
        chainId: 51,
        urls: {
          apiURL: 'https://api-testnet.xdcscan.com/api',
          browserURL: 'https://testnet.xdcscan.com/'
        }
      },
      {
        network: 'xdcMainnet',
        chainId: 50,
        urls: {
          apiURL: 'https://api.xdcscan.com/api',
          browserURL: 'https://xdcscan.com'
        }
      },
      {
        network: 'wemixTestnet',
        chainId: 1112,
        urls: {
          apiURL: 'https://api-testnet.wemixscan.com/api',
          browserURL: 'https://testnet.wemixscan.com/'
        }
      },
      {
        network: 'wemixMainnet',
        chainId: 1111,
        urls: {
          apiURL: 'https://api.wemixscan.com/api',
          browserURL: 'https://wemixscan.com/'
        }
      }
    ]
  },
  mocha: {
    timeout: 100000
  }
};

export default config;
