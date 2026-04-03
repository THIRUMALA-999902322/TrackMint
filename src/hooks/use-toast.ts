"use client";

import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
}

let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notify() {
  toastListeners.forEach((l) => l([...toasts]));
}

export function toast(t: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { ...t, id }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== id);
    notify();
  }, 4000);
}

export function useToast() {
  const [state, setState] = useState<Toast[]>([]);

  useState(() => {
    toastListeners.push(setState);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setState);
    };
  });

  const dismiss = useCallback((id: string) => {
    toasts = toasts.filter((x) => x.id !== id);
    notify();
  }, []);

  return { toasts: state, toast, dismiss };
}
