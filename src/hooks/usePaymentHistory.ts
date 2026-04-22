"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UnifiedPaymentResult } from "./useBeninPay";
import type { PaymentProvider } from "./useBeninPay";

/**
 * Storage strategy for payment history.
 *
 * - `"memory"` — In-memory only. Cleared when the component unmounts or the
 *   page is refreshed. Best for ephemeral UX flows (default).
 * - `"session"` — Persisted in `sessionStorage`. Survives page reloads within
 *   the same browser tab, cleared when the tab/browser closes.
 * - `"local"` — Persisted in `localStorage`. Survives full browser restarts.
 *   Use when you want cross-session history (e.g. a receipts page).
 */
export type PaymentHistoryStorage = "memory" | "session" | "local";

/**
 * A single entry in the payment history.
 * Extends UnifiedPaymentResult with audit fields.
 */
export interface PaymentHistoryEntry extends UnifiedPaymentResult {
  /** ISO 8601 timestamp of when the payment was recorded */
  recordedAt: string;
  /** The payment provider used for this transaction */
  provider?: PaymentProvider;
}

/**
 * Options for the usePaymentHistory hook.
 */
export interface UsePaymentHistoryOptions {
  /**
   * Storage strategy for persisting history.
   * @default "memory"
   */
  storage?: PaymentHistoryStorage;
  /**
   * Key to use in sessionStorage or localStorage.
   * Change this if you have multiple independent payment flows.
   * @default "rbp_payment_history"
   */
  storageKey?: string;
  /**
   * Maximum number of entries to keep.
   * When exceeded, the oldest entries are dropped.
   * @default 50
   */
  maxEntries?: number;
}

/**
 * Return type for the usePaymentHistory hook.
 */
export interface UsePaymentHistoryReturn {
  /** Full list of recorded payments, ordered from most recent to oldest */
  history: PaymentHistoryEntry[];
  /** The most recently recorded payment, or `null` if history is empty */
  lastTransaction: PaymentHistoryEntry | null;
  /** Sum of all `amount` values across the recorded transactions */
  totalPaid: number;
  /** Number of entries in history */
  count: number;
  /**
   * Add a payment result to history.
   *
   * Automatically called by `useBeninPay` when integrated, but can be called
   * manually for advanced use-cases (e.g. recording a server-confirmed payment).
   *
   * Duplicate `transactionId` values are silently ignored.
   *
   * @param result - The UnifiedPaymentResult returned by useBeninPay's onSuccess
   * @param provider - The provider that processed the payment
   */
  addToHistory: (result: UnifiedPaymentResult, provider?: PaymentProvider) => void;
  /**
   * Remove a specific entry from history by its `transactionId`.
   * No-op if the ID is not found.
   */
  removeFromHistory: (transactionId: string) => void;
  /** Clear all entries from history (and from storage if applicable) */
  clearHistory: () => void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DEFAULT_STORAGE_KEY = "rbp_payment_history";
const DEFAULT_MAX_ENTRIES = 50;

/** Returns the relevant Web Storage instance, or null for memory/SSR. */
function getWebStorage(type: PaymentHistoryStorage): Storage | null {
  if (typeof window === "undefined") return null; // SSR guard
  if (type === "session") return window.sessionStorage;
  if (type === "local") return window.localStorage;
  return null; // "memory"
}

/** Safely reads and parses entries from Web Storage. */
function readFromStorage(
  storage: Storage | null,
  key: string
): PaymentHistoryEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Safely serialises entries to Web Storage. Fails silently on quota errors. */
function writeToStorage(
  storage: Storage | null,
  key: string,
  entries: PaymentHistoryEntry[]
): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(entries));
  } catch {
    // Storage quota exceeded or access denied — degrade gracefully.
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook for tracking payment history within a session or across sessions.
 *
 * Supports three storage strategies: in-memory (default), sessionStorage, and
 * localStorage. Automatically deduplicates entries by `transactionId` and
 * enforces a configurable `maxEntries` limit.
 *
 * @example
 * ```tsx
 * // Basic in-memory usage
 * const { history, lastTransaction, totalPaid, clearHistory } = usePaymentHistory();
 *
 * // Persist across page reloads within the tab
 * const { history } = usePaymentHistory({ storage: "session" });
 *
 * // Integrated with useBeninPay
 * const { addToHistory } = usePaymentHistory({ storage: "session" });
 *
 * const { pay } = useBeninPay(config, {
 *   onSuccess: (result) => addToHistory(result, "fedapay"),
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Display a receipt list
 * const { history, totalPaid, count } = usePaymentHistory({ storage: "session" });
 *
 * return (
 *   <div>
 *     <p>{count} paiement(s) — Total : {formatXOF(totalPaid)}</p>
 *     <ul>
 *       {history.map((entry) => (
 *         <li key={entry.transactionId}>
 *           {entry.transactionId} — {formatXOF(entry.amount)} ({entry.status})
 *         </li>
 *       ))}
 *     </ul>
 *   </div>
 * );
 * ```
 */
export function usePaymentHistory(
  options: UsePaymentHistoryOptions = {}
): UsePaymentHistoryReturn {
  const {
    storage = "memory",
    storageKey = DEFAULT_STORAGE_KEY,
    maxEntries = DEFAULT_MAX_ENTRIES,
  } = options;

  // Lazy initializer: read from web storage on first render (SSR-safe — the
  // function only runs client-side, after hydration).
  const [history, setHistory] = useState<PaymentHistoryEntry[]>(() => {
    const webStorage = getWebStorage(storage);
    return readFromStorage(webStorage, storageKey);
  });

  // Keep a stable ref to the current web storage so effects don't stale-close.
  const webStorageRef = useRef<Storage | null>(null);
  useEffect(() => {
    webStorageRef.current = getWebStorage(storage);
  }, [storage]);

  useEffect(() => {
    const nextStorage = getWebStorage(storage);
    webStorageRef.current = nextStorage;
    setHistory(readFromStorage(nextStorage, storageKey));
  }, [storage, storageKey]);

  // Sync history to web storage whenever it changes.
  useEffect(() => {
    if (history.length === 0) {
      try {
        webStorageRef.current?.removeItem(storageKey);
      } catch {
        // fail silently if storage access is denied
      }
    } else {
      writeToStorage(webStorageRef.current, storageKey, history);
    }
  }, [history, storageKey]);

  const addToHistory = useCallback(
    (result: UnifiedPaymentResult, provider?: PaymentProvider) => {
      setHistory((prev) => {
        // Deduplicate: silently ignore already-recorded transaction IDs.
        const alreadyExists = prev.some(
          (e) => e.transactionId === result.transactionId
        );
        if (alreadyExists) return prev;

        const entry: PaymentHistoryEntry = {
          ...result,
          provider,
          recordedAt: new Date().toISOString(),
        };

        const updated = [entry, ...prev];

        // Enforce the maxEntries cap by trimming the oldest entries.
        return updated.length > maxEntries
          ? updated.slice(0, maxEntries)
          : updated;
      });
    },
    [maxEntries]
  );

  const removeFromHistory = useCallback((transactionId: string) => {
    setHistory((prev) =>
      prev.filter((e) => e.transactionId !== transactionId)
    );
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const lastTransaction = history.length > 0 ? history[0] : null;
  const totalPaid = history.reduce((sum, e) => sum + e.amount, 0);

  return {
    history,
    lastTransaction,
    totalPaid,
    count: history.length,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
