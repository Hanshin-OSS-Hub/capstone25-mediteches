'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  SymptomInput,
  SymptomRecord,
  DepartmentRecommendation,
} from '@/types';
import * as api from '@/lib/api';

const STORAGE_KEY = 'meditech_symptoms';

function loadFromStorage(): SymptomRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as SymptomRecord[]).map((s) => ({
      ...s,
      createdAt: new Date(s.createdAt),
    }));
  } catch {
    return [];
  }
}

function persistToStorage(symptoms: SymptomRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symptoms));
  } catch {
    /* storage full or unavailable */
  }
}

export function useSymptom(userId?: string) {
  const [symptoms, setSymptoms] = useState<SymptomRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSymptoms(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      persistToStorage(symptoms);
    }
  }, [symptoms, hydrated]);

  const addSymptom = useCallback(
    async (input: SymptomInput) => {
      const record: SymptomRecord = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };
      setSymptoms((prev) => [...prev, record]);
      if (userId) {
        await api.saveSymptom(input, userId);
      }
    },
    [userId],
  );

  const updateSymptom = useCallback(
    (index: number, input: SymptomInput) => {
      setSymptoms((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...input } : s)),
      );
    },
    [],
  );

  const removeSymptom = useCallback((index: number) => {
    setSymptoms((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearSymptoms = useCallback(() => {
    setSymptoms([]);
  }, []);

  const analyzeSymptoms = useCallback(async (): Promise<string> => {
    const result = await api.analyzeSymptoms(symptoms);
    return result.analysis;
  }, [symptoms]);

  const recommendDepartments = useCallback(
    async (): Promise<DepartmentRecommendation[]> => {
      return api.recommendDepartments(symptoms);
    },
    [symptoms],
  );

  return {
    symptoms,
    addSymptom,
    updateSymptom,
    removeSymptom,
    clearSymptoms,
    analyzeSymptoms,
    recommendDepartments,
  } as const;
}
