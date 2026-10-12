import { expect } from 'chai';
import { getChainConfig } from '../scripts/chainConfig';
import { CHAIN_IDS } from '../config/chainIds';

describe('getChainConfig (INFOSEC-617)', function () {
  it('rejects chainIds without an explicit config instead of silently using defaults', async () => {
    let caught: Error | null = null;
    try {
      await getChainConfig(0xffffffff);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught, 'expected getChainConfig to throw').to.not.be.null;
    expect(caught!.message).to.match(/No chain configuration for chainId/);
  });

  it('returns the V4 forwarder pairing for a listed chain', async () => {
    const config = await getChainConfig(CHAIN_IDS.KAIA_TESTNET);
    expect(config.forwarderContractName).to.equal('ForwarderV4');
    expect(config.forwarderFactoryContractName).to.equal('ForwarderFactoryV4');
  });
});
