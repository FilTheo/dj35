import type { MonthSchedule } from './types';

/**
 * Storage abstraction layer.
 * Uses in-memory Map for development, Vercel KV for production.
 * Key format: "schedule:{year}-{month}"
 */

// In-memory fallback for development
const memoryStore = new Map<string, string>();

let kvWarningLogged = false;
function logKvWarning() {
  if (!kvWarningLogged && typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.warn('[store] WARNING: KV env vars not set in production. Using in-memory storage (data lost on restart).');
      kvWarningLogged = true;
    }
  }
}

function getKey(year: number, month: number): string {
  return `schedule:${year}-${String(month).padStart(2, '0')}`;
}

function getPriorityKey(year: number, month: number): string {
  return `priority:${year}-${String(month).padStart(2, '0')}`;
}

async function kvGet<T>(key: string): Promise<T | null> {
  logKvWarning();
  // Try Vercel KV in production
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = await import('@vercel/kv');
      return await kv.get<T>(key);
    } catch {
      // Fall through to memory store
    }
  }
  const val = memoryStore.get(key);
  return val ? JSON.parse(val) : null;
}

async function kvSet<T>(key: string, value: T): Promise<void> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = await import('@vercel/kv');
      await kv.set(key, value);
      return;
    } catch {
      // Fall through to memory store
    }
  }
  memoryStore.set(key, JSON.stringify(value));
}

async function kvDel(key: string): Promise<void> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = await import('@vercel/kv');
      await kv.del(key);
      return;
    } catch {
      // Fall through to memory store
    }
  }
  memoryStore.delete(key);
}

// ─── Public API ───

export async function getSchedule(year: number, month: number): Promise<MonthSchedule | null> {
  return kvGet<MonthSchedule>(getKey(year, month));
}

export async function saveSchedule(schedule: MonthSchedule): Promise<void> {
  await kvSet(getKey(schedule.year, schedule.month), schedule);
}

export async function getPriorityDJs(year: number, month: number): Promise<string[]> {
  return (await kvGet<string[]>(getPriorityKey(year, month))) ?? [];
}

export async function savePriorityDJs(year: number, month: number, djNames: string[]): Promise<void> {
  await kvSet(getPriorityKey(year, month), djNames);
}

export async function deleteSchedule(year: number, month: number): Promise<void> {
  await kvDel(getKey(year, month));
}

export async function deletePriorityDJs(year: number, month: number): Promise<void> {
  await kvDel(getPriorityKey(year, month));
}
