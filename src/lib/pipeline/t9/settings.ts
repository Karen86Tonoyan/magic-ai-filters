import { T9Thresholds, DEFAULT_T9_THRESHOLDS } from './types';

const STORAGE_KEY = 'alfa_t9_thresholds';

export function getT9Thresholds(): T9Thresholds {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_T9_THRESHOLDS };
    const parsed = JSON.parse(raw) as Partial<T9Thresholds>;
    return { ...DEFAULT_T9_THRESHOLDS, ...parsed };
  } catch {
    return { ...DEFAULT_T9_THRESHOLDS };
  }
}

export function setT9Thresholds(t: T9Thresholds): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export function resetT9Thresholds(): void {
  localStorage.removeItem(STORAGE_KEY);
}
