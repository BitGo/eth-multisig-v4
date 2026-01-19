import * as dotenv from 'dotenv';
dotenv.config();
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
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
  QUICKNODE_PLASMA_API_KEY,
  SOMNIA_TESTNET_API_KEY,
  MONAD_MAINNET_API_KEY,
  MEGAETH_TESTNET_API_KEY,
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
  BEPOLIA_BERA_EXPLORER_API_KEY,
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
  IP_EXPLORER_API_KEY,
  KAVAEVM_EXPLORER_API_KEY,
  PLUME_EXPLORER_API_KEY,
  FLOW_EXPLORER_API_KEY,
  MEGAETH_EXPLORER_API_KEY,
  HBAREVM_EXPLORER_API_KEY,
  DOGEOS_EXPLORER_API_KEY
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
    topBNB: {
      url: `https://opbnb-testnet-rpc.bnbchain.org`,
      accounts: [
        `${PRIVATE_KEY_FOR_V1_WALLET_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT_BACKUP}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    opBNB: {
      url: `https://opbnb-mainnet-rpc.bnbchain.org`,
      accounts: [
        `${PRIVATE_KEY_FOR_V1_WALLET_CONTRACT_DEPLOYMENT}`,
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT_BACKUP}`,
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
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    baseeth: {
      url: 'https://mainnet.base.org/',
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tbera: {
      url: `https://bepolia.rpc.berachain.com/`,
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
      url: `${SOMNIA_TESTNET_API_KEY}`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    stt: {
      url: `https://api.infra.mainnet.somnia.network`,
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
      url: `${MONAD_MAINNET_API_KEY}`,
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
      url: `https://sepolia.celoscan.io`,
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
      url: `https://rpc.testnet.soniclabs.com/`,
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
    tog: {
      url: `https://evmrpc-testnet.0g.ai`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    og: {
      url: `https://evmrpc.0g.ai/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tirys: {
      url: `http://testnet-rpc.irys.xyz/v1/execution-rpc`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    irys: {
      url: `https://mainnet-beta-rpc.irys.xyz/v1/execution-rpc`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    plasma: {
      url: `${QUICKNODE_PLASMA_API_KEY}`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tplasma: {
      url: `https://testnet-rpc.plasma.to`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    kavaevm: {
      url: `https://kava-evm.publicnode.com`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tkavaevm: {
      url: `https://evm.testnet.kava.io`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    plume: {
      url: `https://rpc.plume.org/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tplume: {
      url: `https://testnet-rpc.plume.org/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    flow: {
      url: `https://mainnet.evm.nodes.onflow.org/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tflow: {
      url: `https://testnet.evm.nodes.onflow.org/`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tmegaeth: {
      url: `${MEGAETH_TESTNET_API_KEY}`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    thbarevm: {
      url: 'https://testnet.hashio.io/api',
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    hbarevm: {
      url: 'https://mainnet.hashio.io/api',
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tfluenteth: {
      url: 'https://rpc.testnet.fluent.xyz/', // TODO: Replace with actual RPC URL from Fluent docs
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    fluenteth: {
      url: 'https://rpc.testnet.fluent.xyz/', // TODO: COIN-6478: update when mainnet is live
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tmantle: {
      url: 'https://rpc.sepolia.mantle.xyz/',
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    mantle: {
      url: 'https://rpc.mantle.xyz/',
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    dogeos: {
      url: 'https://rpc.testnet.dogeos.com', //TODO: WIN-8075: Replace with mainnet RPC when available
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tdogeos: {
      url: 'https://rpc.testnet.dogeos.com',
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    jovayeth: {
      url: `https://rpc.jovay.io`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tjovayeth: {
      url: `https://api.zan.top/public/jovay-testnet`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    okb: {
      url: `https://rpc.xlayer.tech`,
      accounts: [
        `${PRIVATE_KEY_FOR_V4_CONTRACT_DEPLOYMENT}`,
        `${PLACEHOLDER_KEY}`,
        `${PRIVATE_KEY_FOR_BATCHER_CONTRACT_DEPLOYMENT}`
      ]
    },
    tokb: {
      url: `https://testrpc.xlayer.tech/terigon`,
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
      opBNBTestnet: `${ETHERSCAN_API_KEY}`,
      opBNB: `${ETHERSCAN_API_KEY}`,
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
      bepoliaBera: `${BEPOLIA_BERA_EXPLORER_API_KEY}`,
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
      apechainTestnet: `${ETHERSCAN_API_KEY}`,
      apechainMainnet: `${ETHERSCAN_API_KEY}`,
      //Pharos
      pharosTestnet: `${PHAROS_EXPLORER_API_KEY}`,
      pharosMainnet: `${PHAROS_EXPLORER_API_KEY}`,
      //Hyperliquid Evm
      hypeEvmTestnet: `${HYPEEVM_EXPLORER_API_KEY}`,
      hypeEvmMainnet: `${HYPEEVM_EXPLORER_API_KEY}`,
      //Sonic
      sonicTestnet: `${ETHERSCAN_API_KEY}`,
      sonicMainnet: `${ETHERSCAN_API_KEY}`,
      //SEIEVM
      seievmTestnet: `${SEIEVM_EXPLORER_API_KEY}`,
      seievmMainnet: `${SEIEVM_EXPLORER_API_KEY}`,
      //KAIA
      kaiaTestnet: `${KAIA_EXPLORER_API_KEY}`,
      kaiaMainnet: `${KAIA_EXPLORER_API_KEY}`,
      //IRYS
      irysTestnet: `${IRYS_EXPLORER_API_KEY}`,
      irysMainnet: `${IRYS_EXPLORER_API_KEY}`,
      //LINEA
      lineaethTestnet: `${ETHERSCAN_API_KEY}`,
      lineaethMainnet: `${ETHERSCAN_API_KEY}`,
      //Zero Gravity
      ogTestnet: `${ETHERSCAN_API_KEY}`,
      ogMainnet: `${ETHERSCAN_API_KEY}`,
      //STORY IP
      ipTestnet: `${IP_EXPLORER_API_KEY}`,
      ipMainnet: `${IP_EXPLORER_API_KEY}`,
      //PLASMA
      plasmaTestnet: `${ETHERSCAN_API_KEY}`,
      plasmaMainnet: `${ETHERSCAN_API_KEY}`,
      //KAVA
      kavaEvmTestnet: `${KAVAEVM_EXPLORER_API_KEY}`,
      kavaEvmMainnet: `${KAVAEVM_EXPLORER_API_KEY}`,

      // PLUME
      plumeTestnet: `${PLUME_EXPLORER_API_KEY}`,
      plumeMainnet: `${PLUME_EXPLORER_API_KEY}`,

      // MEGAETH
      megaethTestnet: `${MEGAETH_EXPLORER_API_KEY}`,
      megaethMainnet: `${MEGAETH_EXPLORER_API_KEY}`,

      // FLOW
      flowTestnet: `${FLOW_EXPLORER_API_KEY}`,
      flowMainnet: `${FLOW_EXPLORER_API_KEY}`,

      // HBAREVM
      hbarevmTestnet: `${HBAREVM_EXPLORER_API_KEY}`,
      hbarevmMainnet: `${HBAREVM_EXPLORER_API_KEY}`,

      // FLUENTETH
      fluentethTestnet: `${ETHERSCAN_API_KEY}`,
      fluentethMainnet: `${ETHERSCAN_API_KEY}`,

      // MANTLE
      mantleTestnet: `${ETHERSCAN_API_KEY}`,
      mantleMainnet: `${ETHERSCAN_API_KEY}`,

      //DOGEOS
      dogeosTestnet: `${DOGEOS_EXPLORER_API_KEY}`,
      dogeosMainnet: `${DOGEOS_EXPLORER_API_KEY}`,

      // JOVAYETH
      jovayethTestnet: `${ETHERSCAN_API_KEY}`,
      jovayethMainnet: `${ETHERSCAN_API_KEY}`,

      // X Layer OKB
      okbTestnet: `${ETHERSCAN_API_KEY}`,
      okbMainnet: `${ETHERSCAN_API_KEY}`
    },
    customChains: [
      {
        network: 'hoodi',
        chainId: CHAIN_IDS.HOODI,
        urls: {
          apiURL: 'https://api-hoodi.etherscan.io/api',
          browserURL: 'https://hoodi.etherscan.io'
        }
      },
      {
        network: 'arbitrumSepolia',
        chainId: CHAIN_IDS.ARBITRUM_SEPOLIA,
        urls: {
          apiURL: 'https://api-sepolia.arbiscan.io/api',
          browserURL: 'https://sepolia.arbiscan.io'
        }
      },
      {
        network: 'optimisticSepolia',
        chainId: CHAIN_IDS.OPTIMISM_SEPOLIA,
        urls: {
          apiURL: 'https://api-sepolia-optimistic.etherscan.io/api',
          browserURL: 'https://sepolia-optimism.etherscan.io'
        }
      },
      {
        network: 'zksync',
        chainId: CHAIN_IDS.ZKSYNC_ERA,
        urls: {
          apiURL: 'https://block-explorer-api.mainnet.zksync.io/api',
          browserURL: 'https://explorer.zksync.io'
        }
      },
      {
        network: 'zksyncSepolia',
        chainId: CHAIN_IDS.ZKSYNC_SEPOLIA,
        urls: {
          apiURL: 'https://block-explorer-api.sepolia.zksync.dev/api',
          browserURL: 'https://sepolia.explorer.zksync.io'
        }
      },
      {
        network: 'bepoliaBera',
        chainId: CHAIN_IDS.BERA,
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/testnet/evm/80069/etherscan/api',
          browserURL: 'https://80069.testnet.routescan.io'
        }
      },
      {
        network: 'bera',
        chainId: CHAIN_IDS.BERA_TESTNET,
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/mainnet/evm/80094/etherscan/api',
          browserURL: 'https://80094.routescan.io'
        }
      },
      {
        network: 'oasTestnet',
        chainId: CHAIN_IDS.OAS_TESTNET,
        urls: {
          apiURL: 'https://explorer.testnet.oasys.games/api',
          browserURL: 'https://explorer.testnet.oasys.games'
        }
      },
      {
        network: 'oasMainnet',
        chainId: CHAIN_IDS.OAS,
        urls: {
          apiURL: 'https://explorer.oasys.games/api',
          browserURL: 'https://explorer.oasys.games/'
        }
      },
      {
        network: 'coredaoTestnet',
        chainId: CHAIN_IDS.CORE_DAO_TESTNET,
        urls: {
          apiURL: 'https://api.test2.btcs.network/api',
          browserURL: 'https://scan.test2.btcs.network'
        }
      },
      {
        network: 'coredaoMainnet',
        chainId: CHAIN_IDS.CORE_DAO,
        urls: {
          apiURL: 'https://openapi.coredao.org/api',
          browserURL: 'https://scan.coredao.org/'
        }
      },
      {
        network: 'polygonAmoy',
        chainId: CHAIN_IDS.POLYGON_AMOY,
        urls: {
          apiURL: 'https://api-amoy.polygonscan.com/api',
          browserURL: 'https://amoy.polygonscan.com'
        }
      },
      {
        network: 'baseSepolia',
        chainId: CHAIN_IDS.BASE_SEPOLIA,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org/'
        }
      },
      {
        network: 'base',
        chainId: CHAIN_IDS.BASE,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org/'
        }
      },
      {
        network: 'avaxc',
        chainId: CHAIN_IDS.AVALANCHE,
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/api',
          browserURL: 'https://snowtrace.io/'
        }
      },
      {
        network: 'avaxcTestnet',
        chainId: CHAIN_IDS.AVALANCHE_TESTNET,
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/testnet/evm/43113/etherscan/api',
          browserURL: 'https://testnet.snowtrace.io/'
        }
      },
      {
        network: 'worldTestnet',
        chainId: CHAIN_IDS.WORLD_TESTNET,
        urls: {
          apiURL: 'https://api-sepolia.worldscan.org/api',
          browserURL: 'https://sepolia.worldscan.org/'
        }
      },
      {
        network: 'worldMainnet',
        chainId: CHAIN_IDS.WORLD,
        urls: {
          apiURL: 'https://api.worldscan.org/',
          browserURL: 'https://worldscan.org/'
        }
      },
      {
        network: 'ctcTestnet',
        chainId: CHAIN_IDS.CREDITCOIN_TESTNET,
        urls: {
          apiURL: 'https://creditcoin-testnet.blockscout.com/api',
          browserURL: 'https://creditcoin-testnet.blockscout.com/'
        }
      },
      {
        network: 'ctcMainnet',
        chainId: CHAIN_IDS.CREDITCOIN,
        urls: {
          apiURL: 'https://creditcoin.blockscout.com/api',
          browserURL: 'https://creditcoin.blockscout.com/'
        }
      },
      {
        network: 'apechainTestnet',
        chainId: CHAIN_IDS.APECHAIN_TESTNET,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.APECHAIN_TESTNET}`,
          browserURL: 'https://curtis.apescan.io/'
        }
      },
      {
        network: 'apechainMainnet',
        chainId: CHAIN_IDS.APECHAIN,
        urls: {
          apiURL: 'https://api.apescan.io/api',
          browserURL: 'https://apescan.io/'
        }
      },
      {
        network: 'pharosTestnet',
        chainId: CHAIN_IDS.PHAROS_TESTNET,
        urls: {
          apiURL:
            'https://api.socialscan.io/pharos-testnet/v1/explorer/command_api/contract',
          browserURL: 'https://testnet.pharosscan.xyz/'
        }
      },
      {
        network: 'pharosMainnet',
        chainId: CHAIN_IDS.PHAROS, // TODO: WIN-5781: change it with mainnet details, when its available
        urls: {
          apiURL: '', // TODO: WIN-5781: change it with mainnet details, when its available
          browserURL: '' // TODO: WIN-5781: change it with mainnet details, when its available
        }
      },
      {
        network: 'hypeEvmTestnet',
        chainId: CHAIN_IDS.HYPEEVM_TESTNET,
        urls: {
          apiURL: 'https://sourcify.parsec.finance/verify',
          browserURL: 'https://testnet.purrsec.com/'
        }
      },
      {
        network: 'hypeEvmMainnet',
        chainId: CHAIN_IDS.HYPEEVM,
        urls: {
          apiURL: 'https://sourcify.parsec.finance/verify', // TODO: WIN-5783: add once mainnet api details are available
          browserURL: 'https://hyperevm-explorer.vercel.app/'
        }
      },
      {
        network: 'ogTestnet',
        chainId: CHAIN_IDS.OG_TESTNET,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.OG_TESTNET}`,
          browserURL: 'https://chainscan-galileo.0g.ai/'
        }
      },
      {
        network: 'ogMainnet',
        chainId: CHAIN_IDS.OG,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.OG}`,
          browserURL: 'https://chainscan.0g.ai/'
        }
      },
      {
        network: 'soneiumTestnet',
        chainId: CHAIN_IDS.SONEIUM_TESTNET,
        urls: {
          apiURL: 'https://soneium-minato.blockscout.com/api',
          browserURL: 'https://soneium-minato.blockscout.com/'
        }
      },
      {
        network: 'soneiumMainnet',
        chainId: CHAIN_IDS.SONEIUM,
        urls: {
          apiURL: 'https://soneium.blockscout.com/api',
          browserURL: 'https://soneium.blockscout.com/'
        }
      },
      {
        network: 'sonicTestnet',
        chainId: CHAIN_IDS.SONIC_TESTNET,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.SONIC_TESTNET}`,
          browserURL: 'https://testnet.sonicscan.org'
        }
      },
      {
        network: 'sonicMainnet',
        chainId: CHAIN_IDS.SONIC,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.SONIC}`,
          browserURL: 'https://sonicscan.org'
        }
      },
      {
        network: 'seievmTestnet',
        chainId: CHAIN_IDS.SEIEVM_TESTNET,
        urls: {
          apiURL: 'https://seitrace.com/atlantic-2/api',
          browserURL: 'https://seitrace.com/?chain=atlantic-2'
        }
      },
      {
        network: 'seievmMainnet',
        chainId: CHAIN_IDS.SEIEVM,
        urls: {
          apiURL: 'https://seitrace.com/pacific-1/api',
          browserURL: 'https://seitrace.com/?chain=pacific-1'
        }
      },
      {
        network: 'somniaTestnet',
        chainId: CHAIN_IDS.SOMNIA_TESTNET,
        urls: {
          apiURL: 'https://shannon-explorer.somnia.network/api',
          browserURL: 'https://shannon-explorer.somnia.network/'
        }
      },
      {
        network: 'somniaMainnet',
        chainId: CHAIN_IDS.SOMNIA,
        urls: {
          apiURL: 'https://mainnet.somnia.w3us.site/api',
          browserURL: 'https://mainnet.somnia.w3us.site/'
        }
      },
      {
        network: 'monadTestnet',
        chainId: CHAIN_IDS.MONAD_TESTNET,
        urls: {
          apiURL:
            'https://api.socialscan.io/monad-testnet/v1/explorer/command_api/contract',
          browserURL: 'https://monad-testnet.socialscan.io/'
        }
      },
      {
        network: 'monadMainnet',
        chainId: CHAIN_IDS.MONAD,
        urls: {
          apiURL:
            'https://api.socialscan.io/monad/v1/explorer/command_api/contract',
          browserURL: 'https://monadexplorer.com/'
        }
      },
      {
        network: 'flareTestnet',
        chainId: CHAIN_IDS.FLARE_TESTNET,
        urls: {
          apiURL: 'https://coston2-explorer.flare.network/api',
          browserURL: 'https://coston2-explorer.flare.network'
        }
      },
      {
        network: 'flareMainnet',
        chainId: CHAIN_IDS.FLARE,
        urls: {
          apiURL: 'https://flare-explorer.flare.network/api',
          browserURL: 'https://flare-explorer.flare.network'
        }
      },
      {
        network: 'songbirdTestnet',
        chainId: CHAIN_IDS.SONGBIRD_TESTNET,
        urls: {
          apiURL: 'https://coston-explorer.flare.network/api',
          browserURL: 'https://coston-explorer.flare.network'
        }
      },
      {
        network: 'songbirdMainnet',
        chainId: CHAIN_IDS.SONGBIRD,
        urls: {
          apiURL: 'https://songbird-explorer.flare.network/api ',
          browserURL: 'https://songbird.flarescan.com'
        }
      },
      {
        network: 'xdcTestnet',
        chainId: CHAIN_IDS.XDC_TESTNET,
        urls: {
          apiURL: 'https://api-testnet.xdcscan.com/api',
          browserURL: 'https://testnet.xdcscan.com/'
        }
      },
      {
        network: 'xdcMainnet',
        chainId: CHAIN_IDS.XDC,
        urls: {
          apiURL: 'https://api.xdcscan.com/api',
          browserURL: 'https://xdcscan.com'
        }
      },
      {
        network: 'wemixTestnet',
        chainId: CHAIN_IDS.WEMIX_TESTNET,
        urls: {
          apiURL: 'https://api-testnet.wemixscan.com/api',
          browserURL: 'https://testnet.wemixscan.com/'
        }
      },
      {
        network: 'wemixMainnet',
        chainId: CHAIN_IDS.WEMIX,
        urls: {
          apiURL: 'https://api.wemixscan.com/api',
          browserURL: 'https://wemixscan.com/'
        }
      },
      {
        network: 'kaiaTestnet',
        chainId: CHAIN_IDS.KAIA_TESTNET,
        urls: {
          apiURL: 'https://kairos-api.kaiascan.io/hardhat-verify',
          browserURL: 'https://kairos.kaiascan.io/'
        }
      },
      {
        network: 'kaiaMainnet',
        chainId: CHAIN_IDS.KAIA,
        urls: {
          apiURL: 'https://mainnet-api.kaiascan.io/hardhat-verify',
          browserURL: 'https://kaiascan.io/'
        }
      },
      {
        network: 'ipTestnet',
        chainId: CHAIN_IDS.IP_TESTNET,
        urls: {
          apiURL: 'https://aeneid.storyscan.io/api',
          browserURL: 'https://aeneid.storyscan.io/'
        }
      },
      {
        network: 'ipMainnet',
        chainId: CHAIN_IDS.IP,
        urls: {
          apiURL: 'https://www.storyscan.io/api',
          browserURL: 'https://explorer.story.foundation/'
        }
      },
      {
        network: 'lineaethMainnet',
        chainId: CHAIN_IDS.LINEAETH,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.LINEAETH}`,
          browserURL: 'https://lineascan.build/'
        }
      },
      {
        network: 'lineaethTestnet',
        chainId: CHAIN_IDS.LINEAETH_TESTNET,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.LINEAETH_TESTNET}`,
          browserURL: 'https://sepolia.lineascan.build/'
        }
      },
      {
        network: 'irysTestnet',
        chainId: CHAIN_IDS.IRYS_TESTNET,
        urls: {
          apiURL: 'https://inst-1.cloud.blockscout.com/api',
          browserURL: 'https://testnet-explorer.irys.xyz/'
        }
      },
      {
        network: 'irysMainnet',
        chainId: CHAIN_IDS.IRYS,
        urls: {
          apiURL: 'https://evm-explorer.irys.xyz/api',
          browserURL: 'https://evm-explorer.irys.xyz'
        }
      },
      {
        network: 'plasmaTestnet',
        chainId: CHAIN_IDS.PLASMA_TESTNET,
        urls: {
          apiURL: 'https://testnet.plasmaexplorer.io/api',
          browserURL: 'https://testnet.plasmaexplorer.io/'
        }
      },
      {
        network: 'plasmaMainnet',
        chainId: CHAIN_IDS.PLASMA_MAINNET,
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/mainnet/evm/9745/etherscan/api',
          browserURL: 'https://plasmascan.to'
        }
      },
      {
        network: 'kavaEvmTestnet',
        chainId: CHAIN_IDS.KAVAEVM_TESTNET,
        urls: {
          apiURL: 'https://api.verify.mintscan.io/evm/api/0x8ad',
          browserURL: 'https://testnet.kavascan.com'
        }
      },
      {
        network: 'kavaEvmMainnet',
        chainId: CHAIN_IDS.KAVAEVM,
        urls: {
          apiURL: 'https://api.verify.mintscan.io/evm/api/0x8ae',
          browserURL: 'https://kavascan.com'
        }
      },
      {
        network: 'plumeTestnet',
        chainId: CHAIN_IDS.PLUME_TESTNET,
        urls: {
          apiURL: 'https://testnet-explorer.plume.org/api',
          browserURL: 'https://testnet-explorer.plume.org'
        }
      },
      {
        network: 'plumeMainnet',
        chainId: CHAIN_IDS.PLUME,
        urls: {
          apiURL: 'https://explorer.plume.org/api',
          browserURL: 'https://explorer.plume.org/'
        }
      },
      {
        network: 'flowTestnet',
        chainId: CHAIN_IDS.FLOW_TESTNET,
        urls: {
          apiURL: 'https://evm-testnet.flowscan.io/api',
          browserURL: 'https://evm.flowscan.io/'
        }
      },
      {
        network: 'flowMainnet',
        chainId: CHAIN_IDS.FLOW,
        urls: {
          apiURL: 'https://evm.flowscan.io/api',
          browserURL: 'https://evm.flowscan.io/'
        }
      },
      {
        network: 'megaethTestnet',
        chainId: CHAIN_IDS.MEGAETH_TESTNET,
        urls: {
          apiURL: 'https://carrot.megaeth.com/mafia/api',
          browserURL: 'https://www.megaexplorer.xyz/'
        }
      },
      {
        network: 'hbarevmTestnet',
        chainId: CHAIN_IDS.HBAREVM_TESTNET,
        urls: {
          apiURL: 'https://hashscan.io/api',
          browserURL: 'https://hashscan.io/testnet'
        }
      },
      {
        network: 'hbarevmMainnet',
        chainId: CHAIN_IDS.HBAREVM,
        urls: {
          apiURL: 'https://hashscan.io/api',
          browserURL: 'https://hashscan.io/mainnet'
        }
      },
      {
        network: 'fluentethTestnet',
        chainId: CHAIN_IDS.FLUENTETH_TESTNET,
        urls: {
          apiURL: 'https://testnet.fluentscan.xyz/api/',
          browserURL: 'https://testnet.fluentscan.xyz/'
        }
      },
      {
        network: 'fluentethMainnet',
        chainId: CHAIN_IDS.FLUENTETH,
        urls: {
          // TODO: COIN-6478: update when mainnet is live
          apiURL: 'https://testnet.fluentscan.xyz/api/',
          browserURL: 'https://testnet.fluentscan.xyz/'
        }
      },
      {
        network: 'mantleTestnet',
        chainId: CHAIN_IDS.MANTLE_TESTNET,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.MANTLE_TESTNET}`,
          browserURL: 'https://sepolia.mantlescan.xyz/'
        }
      },
      {
        network: 'mantleMainnet',
        chainId: CHAIN_IDS.MANTLE,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.MANTLE}`,
          browserURL: 'https://mantlescan.xyz/'
        }
      },
      {
        network: 'dogeosTestnet',
        chainId: CHAIN_IDS.DOGEOS_TESTNET,
        urls: {
          apiURL: 'https://blockscout.testnet.dogeos.com/api',
          browserURL: 'https://blockscout.testnet.dogeos.com/'
        }
      },
      {
        network: 'dogeosMainnet',
        chainId: CHAIN_IDS.DOGEOS,
        urls: {
          apiURL: 'https://blockscout.testnet.dogeos.com//api', //TODO: WIN-8075: Replace with mainnet API when available
          browserURL: 'https://blockscout.testnet.dogeos.com/' //TODO: WIN-8075: Replace with mainnet URL when available
        }
      },
      {
        network: 'opBNBTestnet',
        chainId: CHAIN_IDS.opBNB_TESTNET,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.opBNB_TESTNET}`,
          browserURL: 'https://opbnb-testnet.bscscan.com/'
        }
      },
      {
        network: 'opBNBMainnet',
        chainId: CHAIN_IDS.opBNB,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.opBNB}`,
          browserURL: 'https://opbnb.bscscan.com/'
        }
      },
      {
        network: 'jovayethTestnet',
        chainId: CHAIN_IDS.JOVAYETH_TESTNET,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.JOVAYETH_TESTNET}`,
          browserURL: 'https://sepolia-explorer.jovay.io'
        }
      },
      {
        network: 'jovayethMainnet',
        chainId: CHAIN_IDS.JOVAYETH,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.JOVAYETH}`,
          browserURL: 'https://explorer.jovay.io'
        }
      },
      {
        network: 'okbTestnet',
        chainId: CHAIN_IDS.OKB_TESTNET,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.OKB_TESTNET}`,
          browserURL: 'https://www.okx.com/web3/explorer/xlayer-test'
        }
      },
      {
        network: 'okbMainnet',
        chainId: CHAIN_IDS.OKB,
        urls: {
          apiURL: `${ETHERSCAN_V2_URL}${CHAIN_IDS.OKB}`,
          browserURL: 'https://www.okx.com/web3/explorer/xlayer'
        }
      }
    ]
  },
  sourcify: {
    enabled: false
  },
  mocha: {
    timeout: 100000
  }
};

export const sourcifyNetworks = {
  // Hedera networks use HashScan Sourcify
  [CHAIN_IDS.HBAREVM]: {
    apiUrl: 'https://server-verify.hashscan.io',
    browserUrl: 'https://repository-verify.hashscan.io'
  },
  [CHAIN_IDS.HBAREVM_TESTNET]: {
    apiUrl: 'https://server-verify.hashscan.io',
    browserUrl: 'https://repository-verify.hashscan.io'
  }
};

export default config;
