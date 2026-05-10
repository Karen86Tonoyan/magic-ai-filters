import { useState, useEffect, useCallback } from 'react';
import type { AIModel, Filter, FilterChain, ChatSession, FilterConfig } from '@/types/ai-filters';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useModels() {
  const [models, setModels] = useState<AIModel[]>(() => loadFromStorage('ai_models', []));

  useEffect(() => saveToStorage('ai_models', models), [models]);

  const addModel = useCallback((model: Omit<AIModel, 'id' | 'createdAt'>) => {
    const newModel: AIModel = { ...model, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setModels(prev => [...prev, newModel]);
    return newModel;
  }, []);

  const updateModel = useCallback((id: string, updates: Partial<AIModel>) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const deleteModel = useCallback((id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
  }, []);

  return { models, addModel, updateModel, deleteModel };
}

export function useFilters() {
  const [filters, setFilters] = useState<Filter[]>(() => loadFromStorage('ai_filters', []));

  useEffect(() => saveToStorage('ai_filters', filters), [filters]);

  const addFilter = useCallback((filter: Omit<Filter, 'id' | 'createdAt'>) => {
    const newFilter: Filter = { ...filter, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setFilters(prev => [...prev, newFilter]);
    return newFilter;
  }, []);

  const updateFilter = useCallback((id: string, updates: Partial<Filter>) => {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const deleteFilter = useCallback((id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  }, []);

  return { filters, addFilter, updateFilter, deleteFilter };
}

export function useChains() {
  const [chains, setChains] = useState<FilterChain[]>(() => loadFromStorage('ai_chains', []));

  useEffect(() => saveToStorage('ai_chains', chains), [chains]);

  const addChain = useCallback((chain: Omit<FilterChain, 'id' | 'createdAt'>) => {
    const newChain: FilterChain = { ...chain, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setChains(prev => [...prev, newChain]);
    return newChain;
  }, []);

  const updateChain = useCallback((id: string, updates: Partial<FilterChain>) => {
    setChains(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteChain = useCallback((id: string) => {
    setChains(prev => prev.filter(c => c.id !== id));
  }, []);

  return { chains, addChain, updateChain, deleteChain };
}

export function useSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadFromStorage('ai_sessions', []));

  useEffect(() => saveToStorage('ai_sessions', sessions), [sessions]);

  const addSession = useCallback((session: Omit<ChatSession, 'id' | 'createdAt'>) => {
    const newSession: ChatSession = { ...session, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setSessions(prev => [...prev, newSession]);
    return newSession;
  }, []);

  const updateSession = useCallback((id: string, updates: Partial<ChatSession>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  return { sessions, addSession, updateSession };
}
