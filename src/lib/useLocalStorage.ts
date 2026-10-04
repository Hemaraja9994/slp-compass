"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

// Tiny localStorage-backed state hook. Data never leaves the browser.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void, boolean] {
  const [init] = useState(initial);
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key),
    () => undefined as unknown as string | null,
  );
  const hydrated = raw !== undefined;
  const value = useMemo<T>(() => {
    if (raw === null || raw === undefined) return init;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return init;
    }
  }, [raw, init]);

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      let cur: T = init;
      const r = window.localStorage.getItem(key);
      if (r !== null) {
        try {
          cur = JSON.parse(r) as T;
        } catch {
          cur = init;
        }
      }
      const next = typeof v === "function" ? (v as (p: T) => T)(cur) : v;
      if (next === undefined || next === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(next));
      listeners.forEach((l) => l());
    },
    [key, init],
  );
  return [value, set, hydrated];
}
