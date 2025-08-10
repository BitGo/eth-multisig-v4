import { CHAIN_IDS } from '../config/chainIds';

export interface ChainConfig {
  walletImplementationContractName: string;
  walletFactoryContractName: string;
  forwarderContractName: string;
  forwarderFactoryContractName: string;
  contractPath: string;
}

/**
 * Returns network-specific contract names and paths.
 * @param chainId The chain ID of the network.
 * @returns A configuration object for the specified chain.
 */
export function getChainConfig(chainId: number): ChainConfig {

  let walletImplementationContractName = 'WalletSimple';
  let walletFactoryContractName = 'WalletFactory';
  let forwarderContractName = 'Forwarder';
  let forwarderFactoryContractName = 'ForwarderFactoryV4';
  let contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;

  switch (chainId) {
    case CHAIN_IDS.ETH_MAINNET:
    case CHAIN_IDS.POLYGON_MAINNET:
    case CHAIN_IDS.POLYGON_AMOY:
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    case CHAIN_IDS.HOODI:
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;
    case CHAIN_IDS.BSC_MAINNET:
    case CHAIN_IDS.BSC_TESTNET:
    case CHAIN_IDS.ARBITRUM_ONE:
    case CHAIN_IDS.ARBITRUM_SEPOLIA:
    case CHAIN_IDS.OPTIMISM:
    case CHAIN_IDS.OPTIMISM_SEPOLIA:
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;

    case CHAIN_IDS.ZKSYNC_ERA:
    case CHAIN_IDS.ZKSYNC_SEPOLIA:
      walletImplementationContractName = 'ZkethWalletSimple';
      contractPath = `contracts/coins/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;

    case CHAIN_IDS.BASE_SEPOLIA:
    case CHAIN_IDS.BASE:
      contractPath = `contracts/${walletImplementationContractName}.sol:${walletImplementationContractName}`;
      break;

    case CHAIN_IDS.BERA:
    case CHAIN_IDS.BERA_TESTNET:
    case CHAIN_IDS.SONIC:
    case CHAIN_IDS.SONIC_TESTNET:
    case CHAIN_IDS.SEIEVM:
    case CHAIN_IDS.SEIEVM_TESTNET:
    case CHAIN_IDS.PHAROS:
    case CHAIN_IDS.PHAROS_TESTNET:
    case CHAIN_IDS.HYPEEVM:
    case CHAIN_IDS.HYPEEVM_TESTNET:
    case CHAIN_IDS.APECHAIN:
    case CHAIN_IDS.APECHAIN_TESTNET:
    case CHAIN_IDS.CORE_DAO:
    case CHAIN_IDS.CORE_DAO_TESTNET:
    case CHAIN_IDS.LINEAETH:
    case CHAIN_IDS.LINEAETH_TESTNET:
    case CHAIN_IDS.IP:
    case CHAIN_IDS.IP_TESTNET:
    case CHAIN_IDS.WORLD:
    case CHAIN_IDS.WORLD_TESTNET:
    case CHAIN_IDS.MONAD:
    case CHAIN_IDS.FLARE:
    case CHAIN_IDS.FLARE_TESTNET:
    case CHAIN_IDS.SONEIUM_TESTNET:
    case CHAIN_IDS.SONEIUM:
    case CHAIN_IDS.SOMNIA_TESTNET:
    case CHAIN_IDS.SONGBIRD:
    case CHAIN_IDS.SONGBIRD_TESTNET:
    case CHAIN_IDS.OAS_TESTNET:
    case CHAIN_IDS.OAS:
    case CHAIN_IDS.AVALANCHE:
    case CHAIN_IDS.AVALANCHE_TESTNET:
    case CHAIN_IDS.XDC:
    case CHAIN_IDS.XDC_TESTNET:
    case CHAIN_IDS.CREDITCOIN_TESTNET:
    case CHAIN_IDS.CREDITCOIN:
    case CHAIN_IDS.WEMIX_TESTNET:
    case CHAIN_IDS.WEMIX:
      forwarderContractName = 'ForwarderV4';
      forwarderFactoryContractName = 'ForwarderFactoryV4';
      break;
  }

  return {
    walletImplementationContractName,
    walletFactoryContractName,
    forwarderContractName,
    forwarderFactoryContractName,
    contractPath 
  };
}
