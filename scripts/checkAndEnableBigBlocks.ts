import { Wallet } from 'ethers';
import { getBigBlocksConfig } from '../config/bigBlocksConfig';
import { enableBigBlocks } from './enableBigBlocks';

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result: boolean;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Check if BigBlocks is currently enabled for a given address on a chain
 */
export async function checkBigBlocksStatus(
  userAddress: string,
  chainId: number
): Promise<boolean> {
  const config = getBigBlocksConfig(chainId);
  if (!config) {
    throw new Error(`Chain with ID ${chainId} is not supported for BigBlocks.`);
  }

  console.log(`Checking BigBlocks status for ${userAddress} on ${config.name}...`);

  try {
    const requestBody = {
      jsonrpc: '2.0',
      id: 0,
      method: 'eth_usingBigBlocks',
      params: [userAddress],
    };

    // Use the RPC URL from the reference implementation
    const rpcUrl = config.isTestnet 
      ? 'https://spectrum-01.simplystaking.xyz/hyperliquid-tn-rpc/evm'
      : 'https://spectrum-01.simplystaking.xyz/hyperliquid-rpc/evm';

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status} ${await res.text()}`);
    }

    const result = (await res.json()) as JsonRpcResponse;
    
    if (result.error) {
      throw new Error(`RPC Error: ${result.error.code} - ${result.error.message}`);
    }
    
    return result.result;

  } catch (err) {
    console.error('❌ Failed to fetch BigBlocks status.');
    throw err;
  }
}

/**
 * Check BigBlocks status and enable it if not already enabled
 */
export async function checkAndEnableBigBlocks(
  privateKey: string,
  chainId: number
): Promise<void> {
  const config = getBigBlocksConfig(chainId);
  if (!config) {
    console.log(`⏭️  Chain ${chainId} does not support BigBlocks, skipping...`);
    return;
  }

  if (!config.envKey) {
    throw new Error(`Please set the private key for ${config.name}.`);
  }

  try {
    const wallet = new Wallet(privateKey);
    const userAddress = wallet.address;

    console.log(`🔍 Checking BigBlocks status for ${userAddress} on ${config.name}...`);
    
    const isCurrentlyEnabled = await checkBigBlocksStatus(userAddress, chainId);
    
    if (isCurrentlyEnabled) {
      console.log(`✅ BigBlocks is already enabled for ${userAddress} on ${config.name}`);
      return;
    }

    console.log(`🔄 BigBlocks is not enabled. Enabling BigBlocks for ${userAddress} on ${config.name}...`);
    await enableBigBlocks(privateKey, true, chainId);
    
    // Verify it was enabled
    const isNowEnabled = await checkBigBlocksStatus(userAddress, chainId);
    if (isNowEnabled) {
      console.log(`✅ BigBlocks successfully enabled for ${userAddress} on ${config.name}`);
    } else {
      console.log(`⚠️  BigBlocks enablement may not have taken effect immediately for ${userAddress} on ${config.name}`);
    }

  } catch (error) {
    console.error(`❌ Failed to check/enable BigBlocks on ${config.name}:`, (error as Error).message);
    throw error;
  }
}