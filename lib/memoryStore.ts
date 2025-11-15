import { v4 as uuidv4 } from 'uuid';
import { saveSnapshot, loadSnapshot } from './persistence';

/**
 * In-memory store with file-backed persistence
 */

export interface ThreadTurn {
  from: 'buyer' | 'seller';
  offer?: number;
  counter?: number;
  accept?: number;
  message?: string;
  timestamp: number;
}

export interface Thread {
  threadId: string;
  history: ThreadTurn[];
  buyer: string;
  seller: string;
  sla: {
    latencyMaxMs: number;
    qualityMin: number;
  };
  wtp_usdc?: number;
  ev_usdc?: number;
  refundFloor?: number;
  acceptedPrice?: number;
  locked?: boolean;
  paymentId?: string;
  receiptId?: string;
  serviceResult?: any;
  serviceOk?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Tx {
  id: string;
  from: string;
  to: string;
  amount: number;
  description?: string;
  status: 'pending' | 'confirmed' | 'refunded';
  createdAt: number;
  receiptId?: string;
  originalPaymentId?: string;
}

export interface StoreSnapshot {
  threads: Map<string, Thread>;
  transactions: Map<string, Tx>;
  receipts: Map<string, any>;
}

class MemoryStore {
  private threads: Map<string, Thread> = new Map();
  private transactions: Map<string, Tx> = new Map();
  private receipts: Map<string, any> = new Map();
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const snapshot = await loadSnapshot();
    if (snapshot) {
      console.log('[MemoryStore] Loading from persistence');
      this.threads = new Map(Object.entries(snapshot.threads || {}));
      this.transactions = new Map(Object.entries(snapshot.transactions || {}));
      this.receipts = new Map(Object.entries(snapshot.receipts || {}));
    }

    this.initialized = true;
  }

  private persist(): void {
    const snapshot = {
      threads: Object.fromEntries(this.threads),
      transactions: Object.fromEntries(this.transactions),
      receipts: Object.fromEntries(this.receipts),
    };
    saveSnapshot(snapshot);
  }

  newThread(
    buyer: string,
    seller: string,
    sla: { latencyMaxMs: number; qualityMin: number },
    initialData?: Partial<Thread>
  ): Thread {
    const threadId = uuidv4();
    const now = Date.now();

    const thread: Thread = {
      threadId,
      history: [],
      buyer,
      seller,
      sla,
      createdAt: now,
      updatedAt: now,
      ...initialData,
    };

    this.threads.set(threadId, thread);
    this.persist();

    return thread;
  }

  getThread(threadId: string): Thread | undefined {
    return this.threads.get(threadId);
  }

  upsertThread(thread: Thread): void {
    thread.updatedAt = Date.now();
    this.threads.set(thread.threadId, thread);
    this.persist();
  }

  addTurn(threadId: string, turn: Omit<ThreadTurn, 'timestamp'>): void {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    thread.history.push({
      ...turn,
      timestamp: Date.now(),
    });

    this.upsertThread(thread);
  }

  addTx(tx: Omit<Tx, 'id' | 'createdAt'>): Tx {
    const id = uuidv4();
    const newTx: Tx = {
      id,
      createdAt: Date.now(),
      ...tx,
    };

    this.transactions.set(id, newTx);
    this.persist();

    return newTx;
  }

  updateTx(id: string, updates: Partial<Tx>): void {
    const tx = this.transactions.get(id);
    if (!tx) {
      throw new Error(`Transaction ${id} not found`);
    }

    Object.assign(tx, updates);
    this.transactions.set(id, tx);
    this.persist();
  }

  getTx(id: string): Tx | undefined {
    return this.transactions.get(id);
  }

  addRefund(originalPaymentId: string, amount: number, reason: string, receiptId?: string): Tx {
    const originalTx = this.transactions.get(originalPaymentId);
    if (!originalTx) {
      throw new Error(`Original payment ${originalPaymentId} not found`);
    }

    // Mark original as refunded
    this.updateTx(originalPaymentId, { status: 'refunded' });

    // Create refund transaction
    const refundTx = this.addTx({
      from: originalTx.to,
      to: originalTx.from,
      amount,
      description: reason,
      status: 'confirmed',
      originalPaymentId,
      receiptId,
    });

    return refundTx;
  }

  storeReceipt(receiptId: string, receipt: any): void {
    this.receipts.set(receiptId, receipt);
    this.persist();
  }

  getReceipt(receiptId: string): any | undefined {
    return this.receipts.get(receiptId);
  }

  snapshot(): {
    threads: Thread[];
    transactions: Tx[];
    receipts: Array<{ id: string; data: any }>;
  } {
    return {
      threads: Array.from(this.threads.values()),
      transactions: Array.from(this.transactions.values()),
      receipts: Array.from(this.receipts.entries()).map(([id, data]) => ({ id, data })),
    };
  }
}

// Singleton instance
export const store = new MemoryStore();
