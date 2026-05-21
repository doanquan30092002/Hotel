'use client';

import { useState, useEffect, useCallback } from 'react';

export type ToastVariant = 'default' | 'destructive' | 'success';

export type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastStore = {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
};

// Simple module-level store (no external dep needed)
let listeners: Array<(toasts: Toast[]) => void> = [];
let toastsState: Toast[] = [];

function notifyListeners() {
  listeners.forEach((cb) => cb([...toastsState]));
}

export function toast(options: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2);
  toastsState = [...toastsState, { ...options, id }];
  notifyListeners();
  // Auto-dismiss after 4s
  setTimeout(() => {
    toastsState = toastsState.filter((t) => t.id !== id);
    notifyListeners();
  }, 4000);
}

export function useToastStore(): ToastStore {
  const [toasts, setToasts] = useState<Toast[]>([...toastsState]);

  useEffect(() => {
    const handler = (t: Toast[]) => setToasts(t);
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  const addToast = useCallback((options: Omit<Toast, 'id'>) => {
    toast(options);
  }, []);

  const removeToast = useCallback((id: string) => {
    toastsState = toastsState.filter((t) => t.id !== id);
    notifyListeners();
  }, []);

  return { toasts, addToast, removeToast };
}
