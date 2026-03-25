import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createLogger } from "../utils/logger";
import { useBeninConfig } from "../context";

/**
 * Possible statuses for a transaction returned by your backend.
 */
export type TransactionStatus =
  | "pending"
  | "approved"
  | "declined"
  | "cancelled"
  | "unknown";

const TERMINAL_STATUSES: TransactionStatus[] = [
  "approved",
  "declined",
  "cancelled",
];

/**
 * Options for the usePaymentStatus hook.
 */
export interface UsePaymentStatusOptions {
  /**
   * URL of your backend endpoint that returns the transaction status.
   * The hook sends: GET `checkUrl?transactionId=xxx&provider=yyy`
   * Expected response: `{ status: TransactionStatus }`
   * @example "/api/payments/status"
   */
  checkUrl: string;
  /**
   * Transaction ID returned by FedaPay or KKiaPay after payment.
   */
  transactionId: string;
  /**
   * The payment provider used for this transaction.
   */
  provider: "fedapay" | "kkiapay";
  /**
   * How often to poll in milliseconds.
   * @default 3000
   */
  pollInterval?: number;
  /**
   * Maximum number of polling attempts before stopping.
   * Prevents infinite loops if the backend never returns a terminal status.
   * @default 10
   */
  maxAttempts?: number;
  /**
   * Custom headers to include in every status check request.
   * @example { "Authorization": "Bearer xxx" }
   */
  customHeaders?: Record<string, string>;
  /**
   * Called every time the status changes.
   * @param status - The new transaction status
   */
  onStatusChange?: (status: TransactionStatus) => void;
  /**
   * Whether to start polling immediately when the hook mounts.
   * Set to false to delay polling until you call startPolling().
   * @default true
   */
  enabled?: boolean;
  /**
   * Enable debug logs.
   * If not provided, uses the value from BeninPaymentProvider.
   * @default false
   */
  debug?: boolean;
}

/**
 * Return type for the usePaymentStatus hook.
 */
export interface UsePaymentStatusReturn {
  /** Current transaction status returned by your backend */
  status: TransactionStatus;
  /** Whether a status check is currently in progress */
  loading: boolean;
  /** Error from the last failed check */
  error: Error | null;
  /** Total number of polling attempts made */
  attempts: number;
  /** Whether the polling loop is currently active */
  isPolling: boolean;
  /** Stop the polling loop */
  stopPolling: () => void;
  /** Resume polling (resets attempt counter and status to pending) */
  startPolling: () => void;
  /** Trigger a single immediate check without affecting the polling loop */
  refetch: () => void;
}

/**
 * Hook to poll your backend for a transaction status after payment.
 *
 * Automatically stops polling when a terminal status is reached
 * (approved, declined, cancelled) or when maxAttempts is exceeded.
 *
 * @example
 * ```tsx
 * // After a FedaPay payment completes:
 * const { status, isPolling, attempts } = usePaymentStatus({
 *   checkUrl: "/api/payments/status",
 *   transactionId: response.transaction.reference,
 *   provider: "fedapay",
 *   pollInterval: 3000,
 *   maxAttempts: 10,
 *   onStatusChange: (status) => {
 *     if (status === "approved") router.push("/success");
 *     if (status === "declined") router.push("/failed");
 *   },
 * });
 *
 * return (
 *   <div>
 *     {isPolling && <p>Vérification en cours... (tentative {attempts}/10)</p>}
 *     {status === "approved" && <p>Paiement confirmé !</p>}
 *     {status === "declined" && <p>Paiement refusé.</p>}
 *   </div>
 * );
 * ```
 */
export function usePaymentStatus(
  options: UsePaymentStatusOptions
): UsePaymentStatusReturn {
  const {
    checkUrl,
    transactionId,
    provider,
    pollInterval = 3000,
    maxAttempts = 10,
    customHeaders,
    onStatusChange,
    enabled = true,
    debug,
  } = options;

  const globalConfig = useBeninConfig();
  const resolvedDebug = debug ?? globalConfig.debug;
  const log = useMemo(() => createLogger(resolvedDebug), [resolvedDebug]);

  const [status, setStatus] = useState<TransactionStatus>("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isPolling, setIsPolling] = useState(enabled);

  // Refs to avoid stale closures inside the async checkStatus callback
  const statusRef = useRef<TransactionStatus>("pending");
  const attemptsRef = useRef(0);
  const isPollingRef = useRef(enabled);

  useEffect(() => {
    isPollingRef.current = isPolling;
  }, [isPolling]);

  const checkStatus = useCallback(async () => {
    if (!transactionId || !checkUrl) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ transactionId, provider });
      const fullUrl = `${checkUrl}?${params.toString()}`;

      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...customHeaders,
        },
      });

      if (!response.ok) {
        let errorMessage = `Status check failed with HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) errorMessage = errorData.message;
        } catch {
          // Response is not JSON — use default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const newStatus: TransactionStatus = data.status ?? "unknown";

      // Update status and fire callback only on change
      if (newStatus !== statusRef.current) {
        statusRef.current = newStatus;
        setStatus(newStatus);
        log.info(`Transaction status: ${newStatus}`);
        onStatusChange?.(newStatus);
      }

      // Increment attempt counter
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);

      // Stop polling on terminal status
      if (TERMINAL_STATUSES.includes(newStatus)) {
        log.success(`Terminal status reached: ${newStatus}`);
        setIsPolling(false);
        return;
      }

      // Stop polling after maxAttempts
      if (attemptsRef.current >= maxAttempts) {
        log.warn(`Max polling attempts (${maxAttempts}) reached`);
        setIsPolling(false);
      }
    } catch (err) {
      const checkError =
        err instanceof Error ? err : new Error("Status check failed");
      setError(checkError);
      log.error("Status check failed", checkError);
    } finally {
      setLoading(false);
    }
  }, [checkUrl, transactionId, provider, customHeaders, maxAttempts, log, onStatusChange]);

  useEffect(() => {
    if (!isPolling || !transactionId || !checkUrl) return;

    // Initial check immediately
    checkStatus();

    const intervalId = setInterval(() => {
      if (!isPollingRef.current) {
        clearInterval(intervalId);
        return;
      }
      checkStatus();
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [isPolling, transactionId, checkUrl, pollInterval, checkStatus]);

  const stopPolling = useCallback(() => {
    log.info("Polling stopped manually");
    setIsPolling(false);
  }, [log]);

  const startPolling = useCallback(() => {
    log.info("Polling restarted");
    attemptsRef.current = 0;
    statusRef.current = "pending";
    setAttempts(0);
    setStatus("pending");
    setError(null);
    setIsPolling(true);
  }, [log]);

  const refetch = useCallback(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    status,
    loading,
    error,
    attempts,
    isPolling,
    stopPolling,
    startPolling,
    refetch,
  };
}
