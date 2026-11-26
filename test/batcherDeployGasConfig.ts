import { expect } from 'chai';
import { ethers } from 'hardhat';
import { resolveGasOverrides } from '../config/batcherDeployGasConfig';
import { CHAIN_IDS } from '../config/chainIds';

// Minimal Signer stub: the manual-gas path only calls estimateGas
// (Hemi does not cap to the block gas limit, so no provider is required).
const stubDeployer = {
  estimateGas: async (): Promise<bigint> => 1_000_000n,
  provider: null
} as unknown as ethers.Signer;

type MockRpcRequest = { id: number; method: string };
type MockRpcResult = { id: number; result: unknown };

class MockJsonRpcProvider extends ethers.JsonRpcProvider {
  // Serves just enough RPC for populateTransaction to run offline, mimicking
  // Hemi: a node that advertises EIP-1559 support but only mines legacy txs.
  // Any other request means the test regressed into real RPC calls.
  async _send(
    payload: MockRpcRequest | Array<MockRpcRequest>
  ): Promise<Array<MockRpcResult>> {
    const requests: Array<MockRpcRequest> = Array.isArray(payload)
      ? payload
      : [payload];
    return requests.map((p) => {
      if (p.method === 'eth_chainId') {
        return {
          id: p.id,
          result: ethers.toQuantity(Number(CHAIN_IDS.HEMIETH_TESTNET))
        };
      }
      if (p.method === 'eth_getBlockByNumber') {
        // Well-formed latest block carrying baseFeePerGas (EIP-1559 advertised).
        const zeroHash = `0x${'0'.repeat(64)}`;
        return {
          id: p.id,
          result: {
            hash: zeroHash,
            parentHash: zeroHash,
            sha3Uncles: zeroHash,
            miner: ethers.ZeroAddress,
            stateRoot: zeroHash,
            transactionsRoot: zeroHash,
            receiptsRoot: zeroHash,
            logsBloom: `0x${'0'.repeat(512)}`,
            difficulty: '0x0',
            number: '0x1',
            gasLimit: '0x1c9c380',
            gasUsed: '0x0',
            timestamp: '0x1',
            extraData: '0x',
            baseFeePerGas: '0x1',
            transactions: []
          }
        };
      }
      if (p.method === 'eth_gasPrice') {
        return { id: p.id, result: '0x77359400' }; // 2 gwei
      }
      if (p.method === 'eth_maxPriorityFeePerGas') {
        return { id: p.id, result: '0x3b9aca00' }; // 1 gwei
      }
      if (p.method === 'eth_blockNumber') {
        return { id: p.id, result: '0x1' };
      }
      throw new Error(`MockJsonRpcProvider: unexpected RPC call ${p.method}`);
    });
  }
}

// Throwaway test key; never funded, holds no value.
const TEST_WALLET = new ethers.Wallet(
  `0x${'4'.repeat(64)}`,
  new MockJsonRpcProvider('http://127.0.0.1:0')
);

// Fee data as reported by a node that advertises EIP-1559 support.
const feeData1559 = new ethers.FeeData(
  2_000_000_000n,
  3_000_000_000n,
  1_000_000_000n
);

describe('batcherDeployGasConfig.resolveGasOverrides (PR #391 review)', function () {
  it('forceLegacy chains resolve gasPrice-only overrides with an explicit type 0', async function () {
    const overrides = await resolveGasOverrides(
      Number(CHAIN_IDS.HEMIETH),
      feeData1559,
      stubDeployer,
      { data: '0xdeadbeef' },
      TEST_WALLET.address
    );

    expect(overrides).to.not.be.undefined;
    expect(overrides!.gasPrice).to.equal(2_000_000_000n);
    expect(overrides!.maxFeePerGas).to.be.undefined;
    expect(overrides!.maxPriorityFeePerGas).to.be.undefined;
    // Explicit legacy type: ethers' AbstractSigner would otherwise turn a
    // gasPrice-only request into a type-2 transaction on EIP-1559-advertising
    // chains, which Hemi silently drops.
    expect(overrides!.type).to.equal(0);
    expect(overrides!.gasLimit).to.be.a('number');
  });

  it('a Wallet populates the resolved overrides as a legacy (type 0) transaction', async function () {
    const overrides = await resolveGasOverrides(
      Number(CHAIN_IDS.HEMIETH_TESTNET),
      feeData1559,
      stubDeployer,
      { data: '0xdeadbeef' },
      TEST_WALLET.address
    );

    const populated = await TEST_WALLET.populateTransaction({
      to: ethers.ZeroAddress,
      data: '0xdeadbeef',
      chainId: Number(CHAIN_IDS.HEMIETH_TESTNET),
      nonce: 0,
      ...overrides
    });

    expect(populated.type).to.equal(0);
  });
});
