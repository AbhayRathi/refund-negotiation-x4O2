import fs from 'fs/promises';
import path from 'path';

/**
 * File-backed persistence for transaction store
 * Atomically reads/writes JSON to disk
 */

const PERSIST_ENABLED = process.env.PERSIST_TO_FILE === 'true';
const PERSIST_PATH = process.env.PERSIST_PATH || '.data/store.json';

// Debounce timer
let saveTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 1000;

/**
 * Load snapshot from disk
 */
export async function loadSnapshot(): Promise<any | null> {
  if (!PERSIST_ENABLED) {
    return null;
  }

  try {
    const data = await fs.readFile(PERSIST_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet
      return null;
    }
    console.error('Error loading snapshot:', error);
    return null;
  }
}

/**
 * Save snapshot to disk (debounced)
 */
export function saveSnapshot(snapshot: any): void {
  if (!PERSIST_ENABLED) {
    return;
  }

  // Clear existing timer
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  // Debounce: save after a delay
  saveTimer = setTimeout(async () => {
    try {
      // Ensure directory exists
      const dir = path.dirname(PERSIST_PATH);
      await fs.mkdir(dir, { recursive: true });

      // Write atomically using temp file
      const tempPath = `${PERSIST_PATH}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(snapshot, null, 2), 'utf-8');
      await fs.rename(tempPath, PERSIST_PATH);
      
      console.log(`[Persistence] Snapshot saved to ${PERSIST_PATH}`);
    } catch (error) {
      console.error('Error saving snapshot:', error);
    }
  }, DEBOUNCE_MS);
}

/**
 * Force immediate save (for shutdown)
 */
export async function forceSave(snapshot: any): Promise<void> {
  if (!PERSIST_ENABLED) {
    return;
  }

  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  try {
    const dir = path.dirname(PERSIST_PATH);
    await fs.mkdir(dir, { recursive: true });

    const tempPath = `${PERSIST_PATH}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    await fs.rename(tempPath, PERSIST_PATH);
    
    console.log(`[Persistence] Snapshot force-saved to ${PERSIST_PATH}`);
  } catch (error) {
    console.error('Error force-saving snapshot:', error);
  }
}
