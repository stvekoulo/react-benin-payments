"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
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

export type PaymentStatusTransport = "polling" | "websocket";

export interface PaymentStatusWebSocketLike {
  close: () => void;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
}

export interface UsePaymentStatusWebSocketMessage {
  status?: TransactionStatus;
}

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
  checkUrl?: string;
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
   * Transport used to follow status updates.
   * @default "polling"
   */
  transport?: PaymentStatusTransport;
  /**
   * WebSocket endpoint used when `transport` is `"websocket"`.
   * @example "wss://api.example.com/payments/status"
   */
  websocketUrl?: string;
  /**
   * Optional WebSocket protocols.
   */
  websocketProtocols?: string | string[];
  /**
   * Optional factory used to create the WebSocket instance.
   * Useful for tests or custom runtimes.
   */
  websocketFactory?: (
    url: string,
    protocols?: string | string[]
  ) => PaymentStatusWebSocketLike;
  /**
   * Parses incoming WebSocket messages into a transaction status.
   * By default expects either a raw status string or `{ status: ... }`.
   */
  parseWebSocketMessage?: (
    event: MessageEvent
  ) => TransactionStatus | UsePaymentStatusWebSocketMessage | null | undefined;
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
    transport = "polling",
    websocketUrl,
    websocketProtocols,
    websocketFactory,
    parseWebSocketMessage,
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
  const webSocketRef = useRef<PaymentStatusWebSocketLike | null>(null);

  // Stabilise les callbacks passés en props pour éviter des re-runs d'effet inutiles
  // lorsque l'appelant crée des fonctions inline (nouvelle référence à chaque render).
  const websocketFactoryRef = useRef(websocketFactory) as MutableRefObject<typeof websocketFactory>;
  websocketFactoryRef.current = websocketFactory;
  const parseWebSocketMessageRef = useRef(parseWebSocketMessage) as MutableRefObject<typeof parseWebSocketMessage>;
  parseWebSocketMessageRef.current = parseWebSocketMessage;

  useEffect(() => {
    isPollingRef.current = isPolling;
  }, [isPolling]);

  const applyStatus = useCallback(
    (newStatus: TransactionStatus) => {
      if (newStatus !== statusRef.current) {
        statusRef.current = newStatus;
        setStatus(newStatus);
        log.info(`Transaction status: ${newStatus}`);
        onStatusChange?.(newStatus);
      }

      if (TERMINAL_STATUSES.includes(newStatus)) {
        log.success(`Terminal status reached: ${newStatus}`);
        setIsPolling(false);
        webSocketRef.current?.close();
        webSocketRef.current = null;
      }
    },
    [log, onStatusChange]
  );

  const checkStatus = useCallback(async () => {
    if (!transactionId || !checkUrl) return;

    setLoading(true);
    setError(null);
    attemptsRef.current += 1;
    setAttempts(attemptsRef.current);

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

      applyStatus(newStatus);

      if (TERMINAL_STATUSES.includes(newStatus)) {
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

      if (attemptsRef.current >= maxAttempts) {
        log.warn(`Max polling attempts (${maxAttempts}) reached after errors`);
        setIsPolling(false);
      }
    } finally {
      setLoading(false);
    }
  }, [checkUrl, transactionId, provider, customHeaders, maxAttempts, log, applyStatus]);

  const resolveWebSocketStatus = useCallback(
    (event: MessageEvent): TransactionStatus | null => {
      // Lit depuis le ref pour éviter de recréer ce callback quand parseWebSocketMessage change.
      const parsed = parseWebSocketMessageRef.current?.(event);

      if (typeof parsed === "string") {
        return parsed;
      }

      if (parsed && typeof parsed === "object" && "status" in parsed) {
        return parsed.status ?? null;
      }

      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data) as
            | UsePaymentStatusWebSocketMessage
            | TransactionStatus;

          if (typeof data === "string") {
            return data;
          }

          return data.status ?? null;
        } catch {
          return null;
        }
      }

      return null;
    },
    // parseWebSocketMessageRef est stable — pas besoin de l'ajouter ici.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (!isPolling || !transactionId) return;

    if (transport === "websocket") {
      if (!websocketUrl) return;

      // Lit depuis le ref pour éviter de recréer la socket quand le callback change de référence.
      const createSocket =
        websocketFactoryRef.current ??
        ((url: string, protocols?: string | string[]) =>
          new WebSocket(url, protocols) as unknown as PaymentStatusWebSocketLike);

      setLoading(true);
      setError(null);

      const socket = createSocket(websocketUrl, websocketProtocols);
      webSocketRef.current = socket;

      socket.onopen = () => {
        setLoading(false);
        log.info("WebSocket status tracking connected");
      };

      socket.onmessage = (event) => {
        attemptsRef.current += 1;
        setAttempts(attemptsRef.current);

        const nextStatus = resolveWebSocketStatus(event);
        if (!nextStatus) return;
        applyStatus(nextStatus);
      };

      socket.onerror = () => {
        setLoading(false);
        setError(new Error("WebSocket status tracking failed"));
        log.error("WebSocket status tracking failed");
      };

      socket.onclose = () => {
        webSocketRef.current = null;
        setLoading(false);
      };

      return () => {
        socket.close();
        if (webSocketRef.current === socket) {
          webSocketRef.current = null;
        }
      };
    }

    if (!checkUrl) return;

    // Différer la première vérification via setTimeout pour que les appels
    // synchrones (ex: startPolling dans act()) voient attempts=0 avant le premier check.
    const immediateId = setTimeout(() => {
      if (isPollingRef.current) void checkStatus();
    }, 0);

    const intervalId = setInterval(() => {
      if (!isPollingRef.current) {
        clearInterval(intervalId);
        return;
      }
      void checkStatus();
    }, pollInterval);

    return () => {
      clearTimeout(immediateId);
      clearInterval(intervalId);
    };
  }, [
    isPolling,
    transactionId,
    checkUrl,
    pollInterval,
    checkStatus,
    transport,
    websocketUrl,
    // websocketFactory et parseWebSocketMessage sont lus via refs — pas dans les deps.
    websocketProtocols,
    resolveWebSocketStatus,
    applyStatus,
    log,
  ]);

  const stopPolling = useCallback(() => {
    log.info("Polling stopped manually");
    webSocketRef.current?.close();
    webSocketRef.current = null;
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
