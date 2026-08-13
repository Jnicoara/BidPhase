/**
 * useIndexedDB — Simple hook for storing/retrieving large binary data (PDFs)
 * in IndexedDB, bypassing the 5MB localStorage limit.
 *
 * Usage:
 *   const { value, setValue, loading } = useIndexedDB<string | null>("bp_pdf", null);
 */
import { useState, useEffect, useCallback } from "react";

const DB_NAME = "helixbid_db";
const DB_VERSION = 1;
const STORE_NAME = "kv_store";

// Cache the open DB connection at module level — avoids re-opening on every read
let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      _dbPromise = null; // allow retry on error
      reject(req.error);
    };
  });
  return _dbPromise;
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function useIndexedDB<T>(key: string, initialValue: T) {
  const [value, setValueState] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  // Load from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();
    idbGet<T>(key)
      .then(stored => {
        const elapsed = (performance.now() - t0).toFixed(0);
        console.log(
          `[HB] IndexedDB read "${key}": ${elapsed}ms, found=${stored !== undefined}`
        );
        if (!cancelled && stored !== undefined) {
          setValueState(stored);
        }
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const setValue = useCallback(
    (newVal: T | ((prev: T) => T)) => {
      setValueState(prev => {
        const next =
          typeof newVal === "function" ? (newVal as (p: T) => T)(prev) : newVal;
        idbSet(key, next).catch(console.error);
        return next;
      });
    },
    [key]
  );

  return { value, setValue, loading };
}
