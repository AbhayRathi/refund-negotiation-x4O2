import crypto from 'crypto';

/**
 * Receipt signer using SHA-256
 * Creates signed receipts for payments and refunds
 */

export interface SignedReceipt {
  json: string;
  hash: string;
  data: any;
}

/**
 * Canonicalize JSON for consistent hashing
 */
function canonicalizeJSON(obj: any): string {
  if (obj === null || obj === undefined) {
    return JSON.stringify(obj);
  }
  
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJSON).join(',') + ']';
  }
  
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => {
    return JSON.stringify(key) + ':' + canonicalizeJSON(obj[key]);
  });
  
  return '{' + pairs.join(',') + '}';
}

/**
 * Sign a receipt payload with SHA-256
 */
export function signReceipt(payload: any): SignedReceipt {
  const canonical = canonicalizeJSON(payload);
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');
  
  return {
    json: canonical,
    hash,
    data: payload,
  };
}

/**
 * Verify a signed receipt
 */
export function verifyReceipt(receipt: SignedReceipt): boolean {
  const canonical = canonicalizeJSON(receipt.data);
  const expectedHash = crypto.createHash('sha256').update(canonical).digest('hex');
  
  return receipt.hash === expectedHash;
}
