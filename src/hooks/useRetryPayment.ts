"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface UseRetryPaymentOptions<TResult = unknown> {
  /**
   * Nombre maximum de tentatives après le premier échec.
   * @default 3
   */
  maxRetries?: number;
  /**
   * Délai de base en millisecondes avant la première tentative de retry.
   * @default 1000
   */
  baseDelay?: number;
  /**
   * Facteur multiplicateur exponentiel pour le délai après chaque échec.
   * Exemple pour factor = 2, delay = 1000: 1000ms, 2000ms, 4000ms...
   * @default 2
   */
  backoffFactor?: number;
  /** Callback appelé avant chaque nouvelle tentative */
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
  /** Callback appelé en cas de succès final */
  onSuccess?: (data: TResult) => void;
  /** Callback appelé quand toutes les tentatives sont épuisées */
  onFail?: (error: unknown) => void;
}

export interface UseRetryPaymentReturn<TArgs extends unknown[], TResult> {
  /** Déclenche l'action asynchrone avec backoff en cas d'échec */
  execute: (...args: TArgs) => Promise<TResult | undefined>;
  /** Annule la tentative en cours et stoppe le retry */
  cancel: () => void;
  /** Indique si l'action (ou ses retrys) est en cours d'exécution */
  isPending: boolean;
  /** L'erreur du dernier échec rencontré */
  error: unknown | null;
  /** Le nombre de retrys effectués jusqu'à présent (0 si premier essai) */
  attemptCount: number;
}

/**
 * Hook utilitaire pour retenter automatiquement une action de paiement
 * (ex: vérification de statut API, initialisation asynchrone) avec
 * un système de délai exponentiel (exponential backoff).
 *
 * @example
 * ```tsx
 * const { execute, isPending, error, attemptCount } = useRetryPayment(
 *   async (transactionId) => {
 *     return await verifyOnMyBackend(transactionId);
 *   },
 *   {
 *     maxRetries: 3,
 *     baseDelay: 2000,
 *     onSuccess: (data) => console.log("Paiement validé !", data),
 *     onFail: (err) => console.error("Échec définitif", err),
 *     onRetry: (attempt, delay) => console.log(`Essai ${attempt} dans ${delay}ms`)
 *   }
 * );
 * ```
 */
export function useRetryPayment<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: UseRetryPaymentOptions<TResult> = {}
): UseRetryPaymentReturn<TArgs, TResult> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    backoffFactor = 2,
  } = options;

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCancelledRef = useRef(false);

  // Utilisation de refs pour l'action et les options afin d'éviter
  // de redéclencher les useEffect/useCallback à chaque rendu.
  const actionRef = useRef(action);
  const optionsRef = useRef(options);

  useEffect(() => {
    actionRef.current = action;
    optionsRef.current = options;
  });

  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPending(false);
  }, []);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      cancel(); // Annule toute exécution précédente en cours
      isCancelledRef.current = false;
      setIsPending(true);
      setError(null);
      setAttemptCount(0);

      let currentAttempt = 0;

      const attempt = async (): Promise<TResult | undefined> => {
        if (isCancelledRef.current) return undefined;

        try {
          const result = await actionRef.current(...args);
          if (isCancelledRef.current) return undefined;

          setIsPending(false);
          optionsRef.current.onSuccess?.(result);
          return result;
        } catch (err) {
          if (isCancelledRef.current) return undefined;

          setError(err);

          if (currentAttempt < maxRetries) {
            currentAttempt++;
            setAttemptCount(currentAttempt);

            const delayMs = baseDelay * Math.pow(backoffFactor, currentAttempt - 1);
            optionsRef.current.onRetry?.(currentAttempt, delayMs, err);

            return new Promise<TResult | undefined>((resolve) => {
              timeoutRef.current = setTimeout(() => {
                resolve(attempt());
              }, delayMs);
            });
          } else {
            setIsPending(false);
            optionsRef.current.onFail?.(err);
            throw err;
          }
        }
      };

      return attempt();
    },
    [baseDelay, backoffFactor, maxRetries, cancel]
  );

  // Nettoyage lors du démontage du composant
  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  return {
    execute,
    cancel,
    isPending,
    error,
    attemptCount,
  };
}
