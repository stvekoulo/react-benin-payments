"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { FedaPayConfig, FedaPayCallbackResponse, Currency } from "../types";
import type { PaymentValidationError } from "../types/validation";

const FEDAPAY_SCRIPT_URL = "https://cdn.fedapay.com/checkout.js?v=1.1.7";
const FEDAPAY_SCRIPT_ID = "fedapay-checkout-script";

/**
 * Options for the useFedaPay hook.
 */
export interface UseFedaPayOptions {
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
   * Runs before opening the payment modal.
   * Return `false` to cancel opening without throwing an error.
   */
  onBeforePayment?: () => void | boolean | Promise<void | boolean>;
  /**
   * Receives standardized analytics events for the payment lifecycle.
   */
  onAnalyticsEvent?: BeninPaymentAnalyticsHandler;
  /** 
   * Callback fired when validation fails or SDK errors occur.
   * @param error - The validation error with code and message
   */
  onError?: (error: PaymentValidationError) => void;
}

/**
 * Return type for the useFedaPay hook.
 */
export interface UseFedaPayReturn {
  /** Function to open the FedaPay payment dialog */
  openDialog: () => void;
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
 * Configuration for useFedaPay that supports optional public_key.
 * When used inside BeninPaymentProvider, public_key can be omitted.
 */
export type UseFedaPayConfig = Omit<FedaPayConfig, "public_key"> & {
  /** 
   * Your FedaPay public key.
   * Optional if using BeninPaymentProvider with fedaPayPublicKey set.
   */
  public_key?: string;
};

/**
 * React hook for integrating FedaPay payments.
 * 
 * Handles script loading, validation, payment dialog, and backend verification.
 * Supports mock mode for testing without loading the actual SDK.
 * 
 * @param config - FedaPay configuration (public_key optional if using Provider)
 * @param options - Optional settings for debug mode, mock mode, and error handling
 * @returns Object with `openDialog` function, loading states, and `isVerifying`
 * 
 * @example
 * ```tsx
 * // With automatic backend verification
 * const { openDialog, loading, isVerifying } = useFedaPay({
 *   transaction: { amount: 5000 },
 *   verifyUrl: "/api/payments/verify",
 *   customVerifyHeaders: { "Authorization": "Bearer xxx" },
 *   onComplete: (response) => {
 *     // Called AFTER backend verification succeeds
 *     console.log("Payment verified!", response.transaction.id);
 *   }
 * });
 * ```
 */
export function useFedaPay(
  config: UseFedaPayConfig,
  options: UseFedaPayOptions = {}
): UseFedaPayReturn {
  const globalConfig = useBeninConfig();
  
  const resolvedPublicKey = config.public_key || globalConfig.fedaPayPublicKey || "";
  const resolvedSandbox = config.sandbox ?? globalConfig.isTestMode;
  const resolvedCurrency: Currency = config.currency?.iso || globalConfig.defaultCurrency;
  const resolvedDebug = options.debug ?? globalConfig.debug;
  
  const isMockMode = options.mock ?? isTestEnvironment();
  
  const { onError, onBeforePayment, onAnalyticsEvent } = options;
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

  useEffect(() => {
    if (resolvedPublicKey && !isMockMode) {
      validateKeyEnvironment(resolvedPublicKey, resolvedSandbox, "FedaPay");
    }
    if (!isMockMode) {
      logSandboxMode(resolvedSandbox, "FedaPay");
    }
  }, [resolvedPublicKey, resolvedSandbox, isMockMode]);

  useEffect(() => {
    if (isMockMode) {
      log.info("🧪 Running in Mock Mode - No real SDK loaded");
      setScriptLoaded(true);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const initScript = async () => {
      log.info("Loading FedaPay SDK...");
      emitAnalytics({
        name: "sdk_load_started",
        provider: "fedapay",
        amount: config.transaction?.amount,
        currency: resolvedCurrency,
        mode: "live",
      });

      try {
        await loadScript(FEDAPAY_SCRIPT_URL, FEDAPAY_SCRIPT_ID);
        if (isMounted) {
          setScriptLoaded(true);
          setLoading(false);
          log.success("FedaPay SDK loaded successfully");
          emitAnalytics({
            name: "sdk_load_succeeded",
            provider: "fedapay",
            amount: config.transaction?.amount,
            currency: resolvedCurrency,
            mode: "live",
          });
        }
      } catch (err) {
        if (isMounted) {
          const loadError = createParsedError(err);
          setError(loadError);
          setLoading(false);
          log.error("Failed to load FedaPay SDK", err);
          emitAnalytics({
            name: "sdk_load_failed",
            provider: "fedapay",
            amount: config.transaction?.amount,
            currency: resolvedCurrency,
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
  }, [log, isMockMode, emitAnalytics, config.transaction?.amount, resolvedCurrency]);

  const handlePaymentSuccess = useCallback(
    async (response: FedaPayCallbackResponse) => {
      log.success("Payment completed by provider", response);

      if (config.verifyUrl) {
        setIsVerifying(true);
        log.info("🔐 Verifying transaction with backend...", { url: config.verifyUrl });
        emitAnalytics({
          name: "payment_verification_started",
          provider: "fedapay",
          amount: response.transaction.amount,
          currency: resolvedCurrency,
          mode: isMockMode ? "mock" : "live",
          transactionId: response.transaction.reference,
        });

        try {
          const verifyResult = await verifyTransaction(
            {
              verifyUrl: config.verifyUrl,
              verifyMethod: config.verifyMethod,
              customVerifyHeaders: config.customVerifyHeaders,
            },
            {
              transactionId: response.transaction.reference,
              amount: response.transaction.amount,
              provider: "fedapay",
              metadata: config.metadata,
            }
          );

          setIsVerifying(false);
          log.success("🔐 Backend verification successful", verifyResult);
          emitAnalytics({
            name: "payment_verification_succeeded",
            provider: "fedapay",
            amount: response.transaction.amount,
            currency: resolvedCurrency,
            mode: isMockMode ? "mock" : "live",
            transactionId: response.transaction.reference,
          });
          emitAnalytics({
            name: "payment_completed",
            provider: "fedapay",
            amount: response.transaction.amount,
            currency: resolvedCurrency,
            mode: isMockMode ? "mock" : "live",
            transactionId: response.transaction.reference,
            status: response.transaction.status,
          });
          config.onComplete?.(response);
        } catch (err) {
          setIsVerifying(false);
          const verifyError = err instanceof Error ? err : new Error("Verification failed");
          log.error("🔐 Backend verification failed", verifyError);
          emitAnalytics({
            name: "payment_verification_failed",
            provider: "fedapay",
            amount: response.transaction.amount,
            currency: resolvedCurrency,
            mode: isMockMode ? "mock" : "live",
            transactionId: response.transaction.reference,
            errorMessage: verifyError.message,
          });
          onError?.({
            code: "SDK_ERROR",
            message: verifyError.message,
          });
        }
      } else {
        emitAnalytics({
          name: "payment_completed",
          provider: "fedapay",
          amount: response.transaction.amount,
          currency: resolvedCurrency,
          mode: isMockMode ? "mock" : "live",
          transactionId: response.transaction.reference,
          status: response.transaction.status,
        });
        config.onComplete?.(response);
      }
    },
    [config, log, onError, emitAnalytics, resolvedCurrency, isMockMode]
  );

  const openDialog = useCallback(() => {
    if (isPreparing) {
      log.warn("Payment pre-validation already in progress");
      return;
    }

    const run = async () => {
      log.info("Opening FedaPay dialog...", { config, isMockMode });

      if (!isMockMode) {
        if (!resolvedPublicKey || resolvedPublicKey.trim() === "") {
          const validationError: PaymentValidationError = {
            code: "MISSING_PUBLIC_KEY",
            message: "Missing Public Key. Provide it via config or BeninPaymentProvider.",
          };
          log.error("Validation failed: Missing Public Key.");
          emitAnalytics({
            name: "payment_validation_failed",
            provider: "fedapay",
            amount: config.transaction?.amount,
            currency: resolvedCurrency,
            mode: "live",
            errorCode: validationError.code,
            errorMessage: validationError.message,
          });
          onError?.(validationError);
          return;
        }
      }

      if (!config.transaction?.amount || config.transaction.amount <= 0) {
        const validationError: PaymentValidationError = {
          code: "INVALID_AMOUNT",
          message: "Invalid amount. Amount must be greater than 0.",
        };
        log.error("Validation failed: Invalid amount", {
          amount: config.transaction?.amount,
        });
        emitAnalytics({
          name: "payment_validation_failed",
          provider: "fedapay",
          amount: config.transaction?.amount,
          currency: resolvedCurrency,
          mode: isMockMode ? "mock" : "live",
          errorCode: validationError.code,
          errorMessage: validationError.message,
        });
        onError?.(validationError);
        return;
      }

      emitAnalytics({
        name: "payment_open_attempted",
        provider: "fedapay",
        amount: config.transaction.amount,
        currency: resolvedCurrency,
        mode: isMockMode ? "mock" : "live",
      });

      if (onBeforePayment) {
        try {
          setIsPreparing(true);
          emitAnalytics({
            name: "payment_pre_validation_started",
            provider: "fedapay",
            amount: config.transaction.amount,
            currency: resolvedCurrency,
            mode: isMockMode ? "mock" : "live",
          });
          const shouldContinue = await onBeforePayment();
          if (shouldContinue === false) {
            log.info("Payment opening cancelled by onBeforePayment");
            emitAnalytics({
              name: "payment_pre_validation_cancelled",
              provider: "fedapay",
              amount: config.transaction.amount,
              currency: resolvedCurrency,
              mode: isMockMode ? "mock" : "live",
            });
            return;
          }
          emitAnalytics({
            name: "payment_pre_validation_succeeded",
            provider: "fedapay",
            amount: config.transaction.amount,
            currency: resolvedCurrency,
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
            provider: "fedapay",
            amount: config.transaction.amount,
            currency: resolvedCurrency,
            mode: isMockMode ? "mock" : "live",
            errorMessage: preValidationError.message,
          });
          onError?.({
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
          provider: "fedapay",
          amount: config.transaction.amount,
          currency: resolvedCurrency,
          mode: "mock",
        });

        setTimeout(() => {
          const mockResponse: FedaPayCallbackResponse = {
            reason: "mock_transaction_completed",
            transaction: {
              id: Math.floor(Math.random() * 1000000),
              reference: generateMockTransactionId(),
              amount: config.transaction.amount,
              status: "approved",
            },
          };

          log.success("🧪 Mock Payment Successful", mockResponse);
          handlePaymentSuccess(mockResponse);
        }, 1000);

        return;
      }

      if (!scriptLoaded || !window.FedaPay) {
        const validationError: PaymentValidationError = {
          code: "SDK_NOT_LOADED",
          message: "FedaPay SDK not loaded. Please wait for the script to load.",
        };
        log.error("SDK not loaded. Cannot open dialog.");
        emitAnalytics({
          name: "payment_validation_failed",
          provider: "fedapay",
          amount: config.transaction.amount,
          currency: resolvedCurrency,
          mode: "live",
          errorCode: validationError.code,
          errorMessage: validationError.message,
        });
        onError?.(validationError);
        return;
      }

      try {
        const transactionWithMetadata = {
          ...config.transaction,
          custom_metadata: {
            ...config.transaction.custom_metadata,
            ...config.metadata,
          },
        };

        const widget = window.FedaPay.init({
          public_key: resolvedPublicKey,
          transaction: transactionWithMetadata,
          customer: config.customer,
          currency: { iso: resolvedCurrency },
          onComplete: (response: FedaPayCallbackResponse) => {
            handlePaymentSuccess(response);
          },
          onClose: () => {
            log.info("Payment dialog closed by user");
            emitAnalytics({
              name: "payment_closed",
              provider: "fedapay",
              amount: config.transaction.amount,
              currency: resolvedCurrency,
              mode: "live",
            });
            config.onClose?.();
          },
        });

        widget.open();
        log.success("FedaPay dialog opened successfully");
        emitAnalytics({
          name: "payment_opened",
          provider: "fedapay",
          amount: config.transaction.amount,
          currency: resolvedCurrency,
          mode: "live",
        });
      } catch (err) {
        log.error("Failed to open FedaPay dialog", err);
        const sdkError =
          err instanceof Error ? err : new Error("Failed to open FedaPay dialog");
        setError(sdkError);
        emitAnalytics({
          name: "payment_failed",
          provider: "fedapay",
          amount: config.transaction.amount,
          currency: resolvedCurrency,
          mode: "live",
          errorCode: "SDK_ERROR",
          errorMessage: sdkError.message,
        });
        onError?.({
          code: "SDK_ERROR",
          message: sdkError.message,
        });
      }
    };

    void run();
  }, [
    scriptLoaded,
    config,
    resolvedPublicKey,
    resolvedCurrency,
    log,
    onError,
    isMockMode,
    handlePaymentSuccess,
    onBeforePayment,
    isPreparing,
    emitAnalytics,
  ]);

  return {
    openDialog,
    loading,
    error,
    scriptLoaded,
    isMockMode,
    isVerifying,
    isPreparing,
  };
}
