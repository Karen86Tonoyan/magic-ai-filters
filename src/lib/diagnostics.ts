import { toast } from 'sonner';

// Lightweight in-memory diagnostics store for dynamic module loading & runtime errors.
// Pre-Model Firewall principle: log everything, hide nothing, no silent failures.
// Silent mode: suppresses UI toasts but keeps all entries in the buffer.

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
  const hadErrorBefore = entries.some(e => e.severity === 'ERROR');
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
  if (full.severity === 'ERROR') {
    console.error(tag, full.message, payload);
    if (!hadErrorBefore && typeof window !== 'undefined' && !isSilentModeEnabled()) {
      const statusPart = full.status !== undefined ? ` | status: ${full.status}` : '';
      toast.error(`ALFA Diagnostics: ERROR [${full.source}]`, {
        description: `${full.message}${statusPart}`,
        action: {
          label: 'Zobacz wpis',
          onClick: () => { window.location.href = `/diagnostics#${full.id}`; },
        },
      });
    }
  }
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

const DEBUG_FLAG_KEY = 'alfa:diagnostics:debug-lazy';

export function isLazyDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(DEBUG_FLAG_KEY) === '1'; } catch { return false; }
}

export function setLazyDebugEnabled(on: boolean) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(DEBUG_FLAG_KEY, on ? '1' : '0'); } catch { /* ignore */ }
  emit();
}

const SILENT_MODE_KEY = 'alfa:diagnostics:silent';

export function isSilentModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(SILENT_MODE_KEY) === '1'; } catch { return false; }
}

export function setSilentModeEnabled(on: boolean) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(SILENT_MODE_KEY, on ? '1' : '0'); } catch { /* ignore */ }
}

export interface LazyModuleStats {
  name: string;
  attempts: number;
  retries: number;
  successes: number;
  failures: number;
  lastStart?: number;
  lastFinish?: number;
  lastDurationMs?: number;
  totalDurationMs: number;
}

const lazyStats = new Map<string, LazyModuleStats>();
export function getLazyStats(): LazyModuleStats[] {
  return Array.from(lazyStats.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function statFor(name: string): LazyModuleStats {
  let s = lazyStats.get(name);
  if (!s) {
    s = { name, attempts: 0, retries: 0, successes: 0, failures: 0, totalDurationMs: 0 };
    lazyStats.set(name, s);
  }
  return s;
}

/**
 * Wrap a React.lazy() dynamic import factory with diagnostics.
 * When "Debug lazy imports" is enabled, attaches extra metadata:
 * start/finish timestamps, retry counter, attempt number, success/failure counts.
 */
export function instrumentedLazyImport<T>(name: string, factory: () => Promise<T>): () => Promise<T> {
  return async () => {
    const stat = statFor(name);
    stat.attempts += 1;
    if (stat.attempts > 1) stat.retries += 1;
    const attempt = stat.attempts;
    const startedPerf = performance.now();
    const startedWall = Date.now();
    stat.lastStart = startedWall;
    const debug = isLazyDebugEnabled();
    const debugMeta = () => ({
      name,
      attempt,
      retries: stat.retries,
      started_at: new Date(startedWall).toISOString(),
      finished_at: stat.lastFinish ? new Date(stat.lastFinish).toISOString() : undefined,
      successes: stat.successes,
      failures: stat.failures,
    });
    try {
      const mod = await factory();
      const duration = Math.round(performance.now() - startedPerf);
      stat.successes += 1;
      stat.lastFinish = Date.now();
      stat.lastDurationMs = duration;
      stat.totalDurationMs += duration;
      logDiagnostic({
        severity: 'INFO',
        source: 'lazy-import',
        message: `Module loaded: ${name}${attempt > 1 ? ` (retry #${stat.retries})` : ''}`,
        meta: debug ? { ...debugMeta(), duration_ms: duration } : { name, duration_ms: duration },
      });
      return mod;
    } catch (err) {
      const duration = Math.round(performance.now() - startedPerf);
      stat.failures += 1;
      stat.lastFinish = Date.now();
      stat.lastDurationMs = duration;
      stat.totalDurationMs += duration;
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
        message: `Failed to load module ${name}: ${e?.message ?? 'unknown error'} (attempt ${attempt}, retries ${stat.retries})`,
        url,
        status,
        stack: e?.stack,
        meta: debug
          ? { ...debugMeta(), duration_ms: duration }
          : { name, duration_ms: duration, attempt, retries: stat.retries },
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
