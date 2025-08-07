// A wrapper for secp256k1 that handles ESM to CJS conversion
let secp: any = null;

async function ensureSecp() {
  if (!secp) {
    secp = await import('@noble/secp256k1');
  }
  return secp;
}

export async function hexToBytes(hex: string): Promise<Uint8Array> {
  await ensureSecp();
  // Remove '0x' prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  // Convert hex string to byte array
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): Promise<string> {
  // Convert byte array to hex string
  return Promise.resolve(
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  // Calculate total length
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);

  // Create new array and copy all bytes
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}
