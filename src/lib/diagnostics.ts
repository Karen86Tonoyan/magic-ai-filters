import { toast } from 'sonner';

// Lightweight in-memory diagnostics store for dynamic module loading & runtime errors.
// Pre-Model Firewall principle: log everything, hide nothing, no silent failures.

export type DiagSeverity = 'INFO' | 'WARN' | 'ERROR';

export interface DiagEntry {
  id: string;
  timestamp: number;
  severity: DiagSeverity;
  source: string; // e.g. "lazy-import", "error-boundary", "fetch"
  message: string;
  url?: string;
  status?: number | string;
  stack?: string;
  meta?: Record<string, unknown>;
}

const STORAGE_KEY = 'alfa:diagnostics:log';
const MAX_ENTRIES = 200;

let entries: DiagEntry[] = loadFromStorage();
const listeners = new Set<(items: DiagEntry[]) => void>();

function loadFromStorage(): DiagEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* quota — ignore */
  }
}

function emit() {
  for (const fn of listeners) fn(entries);
}

export function logDiagnostic(entry: Omit<DiagEntry, 'id' | 'timestamp'> & { timestamp?: number }) {
  const full: DiagEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: entry.timestamp ?? Date.now(),
    severity: entry.severity,
    source: entry.source,
    message: entry.message,
    url: entry.url,
    status: entry.status,
    stack: entry.stack,
    meta: entry.meta,
  };
  entries = [full, ...entries].slice(0, MAX_ENTRIES);
  persist();
  emit();

  const tag = `[ALFA Diag][${full.source}]`;
  const payload = { url: full.url, status: full.status, meta: full.meta, stack: full.stack };
  if (full.severity === 'ERROR') console.error(tag, full.message, payload);
  else if (full.severity === 'WARN') console.warn(tag, full.message, payload);
  else console.info(tag, full.message, payload);
}

export function getDiagnostics(): DiagEntry[] {
  return entries;
}

export function clearDiagnostics() {
  entries = [];
  persist();
  emit();
}

export function subscribeDiagnostics(fn: (items: DiagEntry[]) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Wrap a React.lazy() dynamic import factory with diagnostics.
 * Logs URL, status (best-effort), and stack on failure; success entry on first load.
 */
export function instrumentedLazyImport<T>(name: string, factory: () => Promise<T>): () => Promise<T> {
  return async () => {
    const started = performance.now();
    try {
      const mod = await factory();
      logDiagnostic({
        severity: 'INFO',
        source: 'lazy-import',
        message: `Module loaded: ${name}`,
        meta: { name, duration_ms: Math.round(performance.now() - started) },
      });
      return mod;
    } catch (err) {
      const e = err as Error & { url?: string };
      const urlMatch = /https?:\/\/[^\s"')]+/.exec(e?.message ?? '');
      const url = e.url ?? urlMatch?.[0];
      let status: number | string | undefined;
      if (url) {
        try {
          const res = await fetch(url, { method: 'GET', cache: 'no-store' });
          status = res.status;
        } catch (fetchErr) {
          status = `fetch-failed: ${(fetchErr as Error).message}`;
        }
      }
      logDiagnostic({
        severity: 'ERROR',
        source: 'lazy-import',
        message: `Failed to load module ${name}: ${e?.message ?? 'unknown error'}`,
        url,
        status,
        stack: e?.stack,
        meta: { name, duration_ms: Math.round(performance.now() - started) },
      });
      throw err;
    }
  };
}

// Global listeners: capture uncaught errors and unhandled promise rejections.
if (typeof window !== 'undefined' && !(window as unknown as { __alfaDiagBound?: boolean }).__alfaDiagBound) {
  (window as unknown as { __alfaDiagBound?: boolean }).__alfaDiagBound = true;

  window.addEventListener('error', (event) => {
    const msg = event.message || 'window.error';
    if (/dynamically imported module/i.test(msg)) {
      logDiagnostic({
        severity: 'ERROR',
        source: 'window.error',
        message: msg,
        url: event.filename,
        stack: event.error?.stack,
      });
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message ?? String(reason);
    if (/dynamically imported|Failed to fetch/i.test(msg)) {
      logDiagnostic({
        severity: 'ERROR',
        source: 'unhandled-rejection',
        message: msg,
        stack: reason?.stack,
      });
    }
  });
}
