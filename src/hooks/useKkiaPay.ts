

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadScript } from "../utils/scriptLoader";
import { createLogger } from "../utils/logger";
import { validateKeyEnvironment, logSandboxMode } from "../utils/keyValidator";
import { generateMockTransactionId } from "../utils/currency";
import { isTestEnvironment } from "../utils/environment";
import { verifyTransaction } from "../utils/verifyTransaction";
import { createParsedError } from "../utils/errors";
import {
  createAnalyticsEmitter,
  type BeninPaymentAnalyticsHandler,
} from "../utils/analytics";
import { useBeninConfig } from "../context";
import type {
  KkiaPayConfig,
  KkiaPaySuccessResponse,
  KkiaPayFailedResponse,
  VerificationConfig,
} from "../types";
import type { PaymentValidationError } from "../types/validation";

const KKIAPAY_SCRIPT_URL = "https://cdn.kkiapay.me/k.js";
const KKIAPAY_SCRIPT_ID = "kkiapay-widget-script";

const kkiaPaySubscribers = {
  success: new Set<(data: KkiaPaySuccessResponse) => void>(),
  failed: new Set<(data: KkiaPayFailedResponse) => void>(),
  close: new Set<() => void>(),
};

let globalKkiaPayListenersAttached = false;

function attachGlobalKkiaPayListeners(log: ReturnType<typeof createLogger>): void {
  if (globalKkiaPayListenersAttached || !window.addKkiapayListener) {
    return;
  }

  window.addKkiapayListener<KkiaPaySuccessResponse>("success", (data) => {
    kkiaPaySubscribers.success.forEach((callback) => callback(data));
  });
  window.addKkiapayListener<KkiaPayFailedResponse>("failed", (data) => {
    kkiaPaySubscribers.failed.forEach((callback) => callback(data));
  });
  window.addKkiapayListener("close", () => {
    kkiaPaySubscribers.close.forEach((callback) => callback());
  });

  globalKkiaPayListenersAttached = true;
  log.info("Global KKiaPay event listeners attached");
}

/**
 * Options for the useKkiaPay hook.
 */
export interface UseKkiaPayOptions extends VerificationConfig {
  /** 
   * Enable debug mode with styled console logs.
   * If not provided, uses the value from BeninPaymentProvider.
   * @default false
   */
  debug?: boolean;
  /** 
   * Enable mock mode for testing.
   * When true, no real SDK is loaded and payments are simulated.
   * Automatically enabled when process.env.NODE_ENV === 'test'.
   * @default false
   */
  mock?: boolean;
  /**
   * Runs before opening the payment widget.
   * Return `false` to cancel opening without throwing an error.
   */
  onBeforePayment?: () => void | boolean | Promise<void | boolean>;
  /**
   * Receives standardized analytics events for the payment lifecycle.
   */
  onAnalyticsEvent?: BeninPaymentAnalyticsHandler;
  /** 
   * Callback fired when payment is successful (after backend verification if configured).
   * @param data - Contains transactionId, amount, and phone
   */
  onSuccess?: (data: KkiaPaySuccessResponse) => void;
  /** 
   * Callback fired when payment fails.
   * @param data - Contains error code and message
   */
  onFailed?: (data: KkiaPayFailedResponse) => void;
  /** 
   * Callback fired when the widget is closed without completing payment.
   */
  onClose?: () => void;
  /** 
   * Callback fired when validation fails or SDK errors occur.
   * @param error - The validation error with code and message
   */
  onValidationError?: (error: PaymentValidationError) => void;
}

/**
 * Return type for the useKkiaPay hook.
 */
export interface UseKkiaPayReturn {
  /** Function to open the KKiaPay payment widget */
  openKkiapay: (config: UseKkiaPayConfig) => void;
  /** Whether the SDK is currently loading */
  loading: boolean;
  /** Error object if SDK loading failed */
  error: Error | null;
  /** Whether the SDK script has been successfully loaded */
  scriptLoaded: boolean;
  /** Whether running in mock mode */
  isMockMode: boolean;
  /** Whether backend verification is in progress */
  isVerifying: boolean;
  /** Whether async pre-validation is in progress */
  isPreparing: boolean;
}

/**
 * Configuration for useKkiaPay that supports optional key.
 * When used inside BeninPaymentProvider, key can be omitted.
 */
export type UseKkiaPayConfig = Omit<KkiaPayConfig, "key"> & {
  /** 
   * Your KKiaPay public key.
   * Optional if using BeninPaymentProvider with kkiaPayPublicKey set.
   */
  key?: string;
};

/**
 * React hook for integrating KKiaPay payments.
 * 
 * Handles script loading, event listeners, validation, widget management, and backend verification.
 * Supports mock mode for testing without loading the actual SDK.
 * 
 * @param options - Configuration for callbacks, debug mode, mock mode, and verification
 * @returns Object with `openKkiapay` function, loading states, and `isVerifying`
 * 
 * @example
 * ```tsx
 * // With automatic backend verification
 * const { openKkiapay, loading, isVerifying } = useKkiaPay({
 *   verifyUrl: "/api/payments/verify",
 *   customVerifyHeaders: { "Authorization": "Bearer xxx" },
 *   onSuccess: (data) => {
 *     // Called AFTER backend verification succeeds
 *     console.log("Payment verified!", data.transactionId);
 *   }
 * });
 * ```
 */
export function useKkiaPay(options: UseKkiaPayOptions = {}): UseKkiaPayReturn {
  const globalConfig = useBeninConfig();
  
  const resolvedDebug = options.debug ?? globalConfig.debug;
  const isMockMode = options.mock ?? isTestEnvironment();
  
  const {
    onSuccess,
    onFailed,
    onClose,
    onValidationError,
    onBeforePayment,
    onAnalyticsEvent,
  } = options;
  
  const log = useMemo(() => createLogger(resolvedDebug), [resolvedDebug]);
  const emitAnalytics = useMemo(
    () =>
      createAnalyticsEmitter(
        [globalConfig.onAnalyticsEvent, onAnalyticsEvent],
        log.warn
      ),
    [globalConfig.onAnalyticsEvent, onAnalyticsEvent, log]
  );

  const [loading, setLoading] = useState(!isMockMode);
  const [error, setError] = useState<Error | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(isMockMode);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  // BUG FIX 3: Store callbacks in refs so the listener useEffect never needs
  // them as dependencies. Without this, inline functions passed by the caller
  // change every render, triggering an infinite remove/re-attach cycle of
  // the global KKiaPay event listeners.
  const onFailedRef = useRef(onFailed);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onFailedRef.current = onFailed; }, [onFailed]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const handlePaymentSuccess = useCallback(
    async (data: KkiaPaySuccessResponse) => {
      log.success("Payment completed by provider", data);

      if (options.verifyUrl) {
        setIsVerifying(true);
        log.info("🔐 Verifying transaction with backend...", { url: options.verifyUrl });
        emitAnalytics({
          name: "payment_verification_started",
          provider: "kkiapay",
          amount: data.amount,
          mode: isMockMode ? "mock" : "live",
          transactionId: data.transactionId,
        });

        try {
          const verifyResult = await verifyTransaction(
            {
              verifyUrl: options.verifyUrl,
              verifyMethod: options.verifyMethod,
              customVerifyHeaders: options.customVerifyHeaders,
            },
            {
              transactionId: data.transactionId,
              amount: data.amount,
              provider: "kkiapay",
            }
          );

          setIsVerifying(false);
          log.success("🔐 Backend verification successful", verifyResult);
          emitAnalytics({
            name: "payment_verification_succeeded",
            provider: "kkiapay",
            amount: data.amount,
            mode: isMockMode ? "mock" : "live",
            transactionId: data.transactionId,
          });
          emitAnalytics({
            name: "payment_completed",
            provider: "kkiapay",
            amount: data.amount,
            mode: isMockMode ? "mock" : "live",
            transactionId: data.transactionId,
          });
          onSuccess?.(data);
        } catch (err) {
          setIsVerifying(false);
          const verifyError = err instanceof Error ? err : new Error("Verification failed");
          log.error("🔐 Backend verification failed", verifyError);
          emitAnalytics({
            name: "payment_verification_failed",
            provider: "kkiapay",
            amount: data.amount,
            mode: isMockMode ? "mock" : "live",
            transactionId: data.transactionId,
            errorMessage: verifyError.message,
          });
          onValidationError?.({
            code: "SDK_ERROR",
            message: verifyError.message,
          });
        }
      } else {
        emitAnalytics({
          name: "payment_completed",
          provider: "kkiapay",
          amount: data.amount,
          mode: isMockMode ? "mock" : "live",
          transactionId: data.transactionId,
        });
        onSuccess?.(data);
      }
    },
    [
      options.verifyUrl,
      options.verifyMethod,
      options.customVerifyHeaders,
      log,
      onSuccess,
      onValidationError,
      emitAnalytics,
      isMockMode,
    ]
  );

  useEffect(() => {
    if (isMockMode) {
      log.info("🧪 Running in Mock Mode - No real SDK loaded");
      setScriptLoaded(true);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const initScript = async () => {
      log.info("Loading KKiaPay SDK...");
      emitAnalytics({
        name: "sdk_load_started",
        provider: "kkiapay",
        mode: "live",
      });

      try {
        await loadScript(KKIAPAY_SCRIPT_URL, KKIAPAY_SCRIPT_ID);
        if (isMounted) {
          setScriptLoaded(true);
          setLoading(false);
          log.success("KKiaPay SDK loaded successfully");
          emitAnalytics({
            name: "sdk_load_succeeded",
            provider: "kkiapay",
            mode: "live",
          });
        }
      } catch (err) {
        if (isMounted) {
          const loadError = createParsedError(err);
          setError(loadError);
          setLoading(false);
          log.error("Failed to load KKiaPay SDK", err);
          emitAnalytics({
            name: "sdk_load_failed",
            provider: "kkiapay",
            mode: "live",
            errorMessage: loadError.message,
          });
        }
      }
    };

    initScript();

    return () => {
      isMounted = false;
    };
  }, [log, isMockMode, emitAnalytics]);

  useEffect(() => {
    if (!scriptLoaded || isMockMode) return;

    attachGlobalKkiaPayListeners(log);

    const handleFailed = (data: KkiaPayFailedResponse) => {
      log.error("Payment failed", data);
      onFailedRef.current?.(data);
    };

    const handleSuccess = (data: KkiaPaySuccessResponse) => {
      handlePaymentSuccess(data);
    };

    const handleClose = () => {
      log.info("Payment widget closed by user");
      onCloseRef.current?.();
    };

    kkiaPaySubscribers.success.add(handleSuccess);
    kkiaPaySubscribers.failed.add(handleFailed);
    kkiaPaySubscribers.close.add(handleClose);
    log.info("KKiaPay hook listeners subscribed");

    return () => {
      kkiaPaySubscribers.success.delete(handleSuccess);
      kkiaPaySubscribers.failed.delete(handleFailed);
      kkiaPaySubscribers.close.delete(handleClose);
      log.info("KKiaPay hook listeners unsubscribed");
    };
  // onFailed and onClose are intentionally omitted — read via refs above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded, handlePaymentSuccess, log, isMockMode]);

  const openKkiapay = useCallback(
    (config: UseKkiaPayConfig) => {
      if (isPreparing) {
        log.warn("Payment pre-validation already in progress");
        return;
      }

      const run = async () => {
        const resolvedKey = config.key || globalConfig.kkiaPayPublicKey || "";
        const resolvedSandbox = config.sandbox ?? globalConfig.isTestMode;

        if (!isMockMode) {
          if (resolvedKey) {
            validateKeyEnvironment(resolvedKey, resolvedSandbox, "KKiaPay");
          }
          logSandboxMode(resolvedSandbox, "KKiaPay");
        }

        log.info("Opening KKiaPay widget...", { config, isMockMode });

        if (!isMockMode && (!resolvedKey || resolvedKey.trim() === "")) {
          const validationError: PaymentValidationError = {
            code: "MISSING_PUBLIC_KEY",
            message: "Missing Public Key. Provide it via config or BeninPaymentProvider.",
          };
          log.error("Validation failed: Missing Public Key.");
          emitAnalytics({
            name: "payment_validation_failed",
            provider: "kkiapay",
            amount: config.amount,
            mode: "live",
            errorCode: validationError.code,
            errorMessage: validationError.message,
          });
          onValidationError?.(validationError);
          return;
        }

        if (!config.amount || config.amount <= 0) {
          const validationError: PaymentValidationError = {
            code: "INVALID_AMOUNT",
            message: "Invalid amount. Amount must be greater than 0.",
          };
          log.error("Validation failed: Invalid amount", { amount: config.amount });
          emitAnalytics({
            name: "payment_validation_failed",
            provider: "kkiapay",
            amount: config.amount,
            mode: isMockMode ? "mock" : "live",
            errorCode: validationError.code,
            errorMessage: validationError.message,
          });
          onValidationError?.(validationError);
          return;
        }

        emitAnalytics({
          name: "payment_open_attempted",
          provider: "kkiapay",
          amount: config.amount,
          mode: isMockMode ? "mock" : "live",
        });

        if (onBeforePayment) {
          try {
            setIsPreparing(true);
            emitAnalytics({
              name: "payment_pre_validation_started",
              provider: "kkiapay",
              amount: config.amount,
              mode: isMockMode ? "mock" : "live",
            });
            const shouldContinue = await onBeforePayment();
            if (shouldContinue === false) {
              log.info("Payment opening cancelled by onBeforePayment");
              emitAnalytics({
                name: "payment_pre_validation_cancelled",
                provider: "kkiapay",
                amount: config.amount,
                mode: isMockMode ? "mock" : "live",
              });
              return;
            }
            emitAnalytics({
              name: "payment_pre_validation_succeeded",
              provider: "kkiapay",
              amount: config.amount,
              mode: isMockMode ? "mock" : "live",
            });
          } catch (err) {
            const preValidationError =
              err instanceof Error
                ? err
                : new Error("Payment pre-validation failed");
            setError(preValidationError);
            log.error("onBeforePayment failed", preValidationError);
            emitAnalytics({
              name: "payment_pre_validation_failed",
              provider: "kkiapay",
              amount: config.amount,
              mode: isMockMode ? "mock" : "live",
              errorMessage: preValidationError.message,
            });
            onValidationError?.({
              code: "PRE_VALIDATION_FAILED",
              message: preValidationError.message,
            });
            return;
          } finally {
            setIsPreparing(false);
          }
        }

        if (isMockMode) {
          log.info("🧪 Simulating payment...");
          emitAnalytics({
            name: "payment_opened",
            provider: "kkiapay",
            amount: config.amount,
            mode: "mock",
          });

          setTimeout(() => {
            const mockResponse: KkiaPaySuccessResponse = {
              transactionId: generateMockTransactionId(),
              amount: config.amount,
              phone: config.phone || "+22900000000",
            };

            log.success("🧪 Mock Payment Successful", mockResponse);
            handlePaymentSuccess(mockResponse);
          }, 1000);

          return;
        }

        if (!scriptLoaded || !window.openKkiapayWidget) {
          const validationError: PaymentValidationError = {
            code: "SDK_NOT_LOADED",
            message: "KKiaPay SDK not loaded. Please wait for the script to load.",
          };
          log.error("SDK not loaded. Cannot open widget.");
          emitAnalytics({
            name: "payment_validation_failed",
            provider: "kkiapay",
            amount: config.amount,
            mode: "live",
            errorCode: validationError.code,
            errorMessage: validationError.message,
          });
          onValidationError?.(validationError);
          return;
        }

        try {
          const configWithDefaults: KkiaPayConfig = {
            ...config,
            key: resolvedKey,
            theme: config.theme ?? "#4E6BFF",
            sandbox: resolvedSandbox,
            paymentMethods: config.paymentMethods ?? ["momo", "card"],
          };

          window.openKkiapayWidget(configWithDefaults);
          log.success("KKiaPay widget opened successfully");
          emitAnalytics({
            name: "payment_opened",
            provider: "kkiapay",
            amount: config.amount,
            mode: "live",
          });
        } catch (err) {
          log.error("Failed to open KKiaPay widget", err);
          const sdkError =
            err instanceof Error ? err : new Error("Failed to open KKiaPay widget");
          setError(sdkError);
          emitAnalytics({
            name: "payment_failed",
            provider: "kkiapay",
            amount: config.amount,
            mode: "live",
            errorCode: "SDK_ERROR",
            errorMessage: sdkError.message,
          });
          onValidationError?.({
            code: "SDK_ERROR",
            message: sdkError.message,
          });
        }
      };

      void run();
    },
    [
      scriptLoaded,
      globalConfig,
      log,
      onValidationError,
      handlePaymentSuccess,
      isMockMode,
      onBeforePayment,
      isPreparing,
      emitAnalytics,
    ]
  );

  return {
    openKkiapay,
    loading,
    error,
    scriptLoaded,
    isMockMode,
    isVerifying,
    isPreparing,
  };
}
