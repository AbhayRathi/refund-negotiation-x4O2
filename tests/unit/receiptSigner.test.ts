import { describe, it, expect } from 'vitest';
import { signReceipt, verifyReceipt } from '@/lib/receiptSigner';

describe('receiptSigner', () => {
  it('should generate stable hash for same payload', () => {
    const payload = {
      id: 'test123',
      amount: 100,
      timestamp: 1234567890,
    };

    const receipt1 = signReceipt(payload);
    const receipt2 = signReceipt(payload);

    expect(receipt1.hash).toBe(receipt2.hash);
    expect(receipt1.hash).toBeTruthy();
    expect(receipt1.hash.length).toBe(64); // SHA-256 hex length
  });

  it('should generate different hash for different payloads', () => {
    const payload1 = { id: 'test1', amount: 100 };
    const payload2 = { id: 'test2', amount: 100 };

    const receipt1 = signReceipt(payload1);
    const receipt2 = signReceipt(payload2);

    expect(receipt1.hash).not.toBe(receipt2.hash);
  });

  it('should verify valid receipts', () => {
    const payload = {
      id: 'test456',
      amount: 250,
      description: 'Test payment',
    };

    const receipt = signReceipt(payload);
    const isValid = verifyReceipt(receipt);

    expect(isValid).toBe(true);
  });

  it('should reject tampered receipts', () => {
    const payload = { id: 'test789', amount: 100 };
    const receipt = signReceipt(payload);

    // Tamper with the data
    receipt.data.amount = 200;

    const isValid = verifyReceipt(receipt);
    expect(isValid).toBe(false);
  });
});
