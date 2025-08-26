import { getBytes, Wallet } from 'ethers';
import { keccak_256 } from '@noble/hashes/sha3';
import { encode } from '@msgpack/msgpack';
import { hexToBytes, bytesToHex, concatBytes } from './secp256k1Wrapper';
import {
  getBigBlocksConfig,
  getBigBlocksConfigForV4Deployment,
  getBigBlocksConfigForBatcherDeployment,
  BigBlocksChainConfig
} from '../config/bigBlocksConfig';

interface Action {
  type: 'evmUserModify';
  usingBigBlocks: boolean;
}

interface SignatureResult {
  r: string;
  s: string;
  v: number;
}

interface ApiResponse {
  status: 'ok' | 'err';
  response?: string;
}

// Add interface for JSON RPC response
interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: boolean;
  error?: {
    code: number;
    message: string;
  };
}

interface L1ActionHashParams {
  action: Action;
  nonce: number;
  vaultAddress?: string;
  expiresAfter?: number;
}

interface SignL1ActionParams {
  wallet: Wallet;
  action: Action;
  nonce: number;
  chainId: number;
}

function getBigBlocksUrl(chainId: number): string {
  const config = getBigBlocksConfig(chainId);
  console.log(`BigBlocks config for chain ${chainId}:`, config);
  if (!config) throw new Error(`Chain ${chainId} does not support BigBlocks`);
  return config.apiUrl;
}

/**
 * Helper: encode nonce to 8 bytes
 */
function toUint64Bytes(n: number): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(n));
  return bytes;
}

/**
 * Sort action keys to match SDK format
 */
function sortAction(action: Action): Action {
  return {
    type: action.type,
    usingBigBlocks: action.usingBigBlocks
  };
}

/**
 * Create the connectionId hash from action, nonce, etc.
 */
async function createL1ActionHash({
  action,
  nonce,
  vaultAddress,
  expiresAfter
}: L1ActionHashParams): Promise<string> {
  const actionBytes = encode(action);
  const nonceBytes = toUint64Bytes(nonce);
  const vaultMarker = vaultAddress ? new Uint8Array([1]) : new Uint8Array([0]);
  const vaultBytes = vaultAddress
    ? await hexToBytes(vaultAddress.slice(2))
    : new Uint8Array();
  const expiresMarker =
    expiresAfter !== undefined ? new Uint8Array([0]) : new Uint8Array();
  const expiresBytes =
    expiresAfter !== undefined ? toUint64Bytes(expiresAfter) : new Uint8Array();

  const bytes = await concatBytes(
    actionBytes,
    nonceBytes,
    vaultMarker,
    vaultBytes,
    expiresMarker,
    expiresBytes
  );

  const hash = keccak_256(bytes);
  return `0x${await bytesToHex(hash)}`;
}

/**
 * EIP-712 signer for the L1 action
 */
async function signL1Action({
  wallet,
  action,
  nonce,
  chainId
}: SignL1ActionParams): Promise<SignatureResult> {
  const connectionId = await createL1ActionHash({ action, nonce });
  const config = getBigBlocksConfig(chainId);
  if (!config) throw new Error(`Chain ${chainId} does not support BigBlocks`);

  const domain = {
    name: 'Exchange',
    version: '1',
    chainId: config.bigBlocksChainId,
    verifyingContract: '0x0000000000000000000000000000000000000000'
  };

  const types = {
    Agent: [
      { name: 'source', type: 'string' },
      { name: 'connectionId', type: 'bytes32' }
    ]
  };

  const message = {
    source: config.isTestnet ? 'b' : 'a',
    connectionId: getBytes(connectionId)
  };

  const signature = await wallet.signTypedData(domain, types, message);

  const r = '0x' + signature.slice(2, 66);
  const s = '0x' + signature.slice(66, 130);
  const v = parseInt(signature.slice(130, 132), 16);

  return { r, s, v };
}

/**
 * Main function to enable/disable BigBlocks
 */
export async function enableBigBlocks(
  privateKey: string,
  enable: boolean = true,
  chainId: number
): Promise<ApiResponse> {
  const config = getBigBlocksConfig(chainId);
  if (!config) throw new Error(`Chain ${chainId} does not support BigBlocks`);
  try {
    const wallet = new Wallet(privateKey);
    const nonce = Date.now();

    const action: Action = {
      type: 'evmUserModify',
      usingBigBlocks: enable
    };

    const signature = await signL1Action({
      wallet,
      action,
      nonce,
      chainId
    });

    const apiUrl = getBigBlocksUrl(chainId);
    console.log(apiUrl);
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br, zstd'
      },
      body: JSON.stringify({
        action: sortAction(action),
        nonce,
        signature
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const result = (await res.json()) as ApiResponse;
    console.log(`Response from BigBlocks API: ${JSON.stringify(result)}`);
    if (result.status === 'err') {
      throw new Error(`API error: ${result.response}`);
    }

    console.log(
      `✅ BigBlocks ${
        enable ? 'enabled' : 'disabled'
      } successfully for wallet ${wallet.address} on ${config.name}`
    );
    return result;
  } catch (err) {
    console.error('❌ Error:', (err as Error).message);
    throw err;
  }
}

/**
 * Check if BigBlocks is already enabled using RPC call
 */
export async function checkBigBlocksStatus(
  userAddress: string,
  chainId: number
): Promise<boolean> {
  const config = getBigBlocksConfig(chainId);
  if (!config) {
    throw new Error(`Chain with ID ${chainId} is not supported for BigBlocks.`);
  }

  console.log(`🔍 Checking BigBlocks status for ${userAddress} on ${config.name}...`);
  console.log(`📡 Making RPC call to: ${config.rpcUrl}`);

  try {
    const requestBody = {
      jsonrpc: '2.0',
      id: 0,
      method: 'eth_usingBigBlocks',
      params: [userAddress]
    };

    const res = await fetch(config.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status} ${await res.text()}`);
    }

    const result = (await res.json()) as JsonRpcResponse;
    console.log(`📥 RPC Response: ${JSON.stringify(result)}`);

    if (result.error) {
      throw new Error(
        `RPC Error: ${result.error.code} - ${result.error.message}`
      );
    }

    return result.result || false;
  } catch (err) {
    console.error(`❌ Failed to fetch BigBlocks status: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Enable BigBlocks with retry mechanism
 */
export async function enableBigBlocksWithRetry(
  config: BigBlocksChainConfig,
  chainId: number,
  maxRetries: number = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🔄 Attempt ${attempt}/${maxRetries}: Enabling BigBlocks on ${config.name}`
      );
      await enableBigBlocks(config.envKey!, true, chainId);
      console.log(`✅ BigBlocks enabled on ${config.name} (attempt ${attempt})`);
      return;
    } catch (error) {
      console.log(
        `❌ Attempt ${attempt}/${maxRetries} failed: ${(error as Error).message}`
      );

      if (attempt === maxRetries) {
        throw new Error(
          `Failed to enable BigBlocks on ${
            config.name
          } after ${maxRetries} attempts: ${(error as Error).message}`
        );
      }

      // Wait 2 seconds before retry
      console.log('⏳ Waiting 2 seconds before retry...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

/**
 * Setup BigBlocks for V4 contract deployment
 */
export async function setupBigBlocksForV4Deployment(
  chainId: number,
  deployerAddress: string
): Promise<void> {
  const config = getBigBlocksConfigForV4Deployment(chainId);
  if (!config) return;

  if (!config.envKey) {
    throw new Error(`Please set the private key for ${config.name}.`);
  }

  console.log(`🔧 Checking BigBlocks status on ${config.name}...`);

  // Check if BigBlocks is already enabled
  const isEnabled = await checkBigBlocksStatus(deployerAddress, chainId);

  if (isEnabled) {
    console.log(`✅ BigBlocks already enabled on ${config.name}`);
    return;
  }

  console.log(
    `🔄 BigBlocks not enabled on ${config.name}, attempting to enable...`
  );

  // Try to enable BigBlocks with retry mechanism
  await enableBigBlocksWithRetry(config, chainId, 3);

  // Verify it was enabled successfully
  console.log(`🔍 Verifying BigBlocks was enabled...`);
  const isEnabledAfter = await checkBigBlocksStatus(deployerAddress, chainId);

  if (!isEnabledAfter) {
    throw new Error(
      `BigBlocks enable command succeeded but verification failed on ${config.name}`
    );
  }

  console.log(`🎉 BigBlocks successfully verified as enabled on ${config.name}`);
}

/**
 * Setup BigBlocks for Batcher contract deployment
 */
export async function setupBigBlocksForBatcherDeployment(
  chainId: number,
  deployerAddress: string
): Promise<void> {
  const config = getBigBlocksConfigForBatcherDeployment(chainId);
  if (!config) return;

  if (!config.envKey) {
    throw new Error(`Please set the private key for ${config.name}.`);
  }

  console.log(`🔧 Checking BigBlocks status on ${config.name}...`);

  // Check if BigBlocks is already enabled
  const isEnabled = await checkBigBlocksStatus(deployerAddress, chainId);

  if (isEnabled) {
    console.log(`✅ BigBlocks already enabled on ${config.name}`);
    return;
  }

  console.log(
    `🔄 BigBlocks not enabled on ${config.name}, attempting to enable...`
  );

  // Try to enable BigBlocks with retry mechanism
  await enableBigBlocksWithRetry(config, chainId, 3);

  // Verify it was enabled successfully
  console.log(`🔍 Verifying BigBlocks was enabled...`);
  const isEnabledAfter = await checkBigBlocksStatus(deployerAddress, chainId);

  if (!isEnabledAfter) {
    throw new Error(
      `BigBlocks enable command succeeded but verification failed on ${config.name}`
    );
  }

  console.log(`🎉 BigBlocks successfully verified as enabled on ${config.name}`);
}
