/**
 * HPP mainnet RPC returns "contract creation code storage out of gas" for eth_estimateGas when
 * the request includes gasLimit / fee fields from Hardhat+ethers deploy tx shaping.
 * Strip those fields at the provider layer for HPP mainnet only (matches minimal curl).
 * hardhat-ethers uses provider.send("eth_estimateGas", [...]), not request().
 */
import { extendEnvironment } from 'hardhat/config';

/** Hardhat network name for HPP mainnet only (`thpp` testnet does not need this). */
const HPP_MAINNET_HARDHAT_NETWORK = 'hpp';

function stripGasFieldsFromEstimateTx(
  tx: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...tx };
  delete out.gas;
  delete out.gasLimit;
  delete out.gasPrice;
  delete out.maxFeePerGas;
  delete out.maxPriorityFeePerGas;
  delete out.type;
  return out;
}

extendEnvironment((hre) => {
  if (hre.network.name !== HPP_MAINNET_HARDHAT_NETWORK) {
    return;
  }
  const provider = hre.network.provider as {
    request(args: { method: string; params?: unknown[] }): Promise<unknown>;
    send(method: string, params?: unknown[]): Promise<unknown>;
  };

  const origSend = provider.send.bind(provider);
  provider.send = async (method: string, params?: unknown[]) => {
    if (
      method === 'eth_estimateGas' &&
      Array.isArray(params) &&
      params[0] !== null &&
      typeof params[0] === 'object' &&
      !Array.isArray(params[0])
    ) {
      const tx = stripGasFieldsFromEstimateTx(
        params[0] as Record<string, unknown>
      );
      return origSend(method, [tx, ...params.slice(1)]);
    }
    return origSend(method, params);
  };

  const origRequest = provider.request.bind(provider);
  provider.request = async (args) => {
    if (
      args.method === 'eth_estimateGas' &&
      Array.isArray(args.params) &&
      args.params[0] !== null &&
      typeof args.params[0] === 'object' &&
      !Array.isArray(args.params[0])
    ) {
      const tx = stripGasFieldsFromEstimateTx(
        args.params[0] as Record<string, unknown>
      );
      return origRequest({
        ...args,
        params: [tx, ...args.params.slice(1)]
      });
    }
    return origRequest(args);
  };
});
