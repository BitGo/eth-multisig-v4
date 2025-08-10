import * as dotenv from 'dotenv';
dotenv.config();
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import { CHAIN_IDS } from './config/chainIds';

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
  PHAROS_EXPLORER_API_KEY,
  HYPEEVM_EXPLORER_API_KEY,
  SEIEVM_EXPLORER_API_KEY,
  KAIA_EXPLORER_API_KEY,
  IRYS_EXPLORER_API_KEY,
  IP_EXPLORER_API_KEY
} = process.env;

const PLACEHOLDER_KEY: string =
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const ETHERSCAN_V2_URL = 'https://api.etherscan.io/v2/api?chainid=';

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
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
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
    thypeevm: {
      url: `https://rpc.hyperliquid-testnet.xyz/evm`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    hypeevm: {
      url: `https://rpc.hyperliquid.xyz/evm`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    ip: {
      url: `https://mainnet.storyrpc.io/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tip: {
      url: `https://aeneid.storyrpc.io/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tsonic: {
      url: `https://rpc.blaze.soniclabs.com`,
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
      url: `https://evm-rpc-testnet.sei-apis.com`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    seievm: {
      url: `https://evm-rpc.sei-apis.com`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tkaia: {
      url: `https://public-en-kairos.node.kaia.io`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    kaia: {
      url: `https://public-en.node.kaia.io`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    lineaeth: {
      url: `https://rpc.linea.build/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tlineaeth: {
      url: `https://rpc.sepolia.linea.build/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tirys: {
      url: `https://inst-1.cloud.blockscout.com/api/eth-rpc`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    irys: {
      url: `https://inst-1.cloud.blockscout.com/api/eth-rpc`, // TODO: Update with mainnet URL when available
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    }
  },
  mocha: {
    timeout: 100000
  }
};

export default config;
