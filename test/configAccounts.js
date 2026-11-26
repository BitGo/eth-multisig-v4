const { expect } = require('chai');
const hre = require('hardhat');

// CECHO-2665: a private key committed to this public repo must never be
// configured as a live signer on any non-local network.
describe('hardhat config accounts (CECHO-2665)', function () {
  it('no non-local network configures the public placeholder key as a signer', function () {
    // Hardhat normalizes account entries to 0x-prefixed lowercase hex, so
    // compare normalized on both sides.
    const normalizePrivateKey = (key) =>
      typeof key === 'string' ? key.toLowerCase().replace(/^0x/, '') : key;
    const PUBLIC_PLACEHOLDER_KEY =
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    for (const [name, network] of Object.entries(hre.config.networks)) {
      if (name === 'hardhat') {
        continue;
      }
      const accounts = network.accounts ?? [];
      for (const key of accounts) {
        expect(
          normalizePrivateKey(key),
          `network ${name} must not configure a public key`
        ).to.not.equal(PUBLIC_PLACEHOLDER_KEY);
      }
    }
  });
});
