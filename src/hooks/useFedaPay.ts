

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadScript } from "../utils/scriptLoader";
import { createLogger } from "../utils/logger";
import { validateKeyEnvironment, logSandboxMode } from "../utils/keyValidator";
import { generateMockTransactionId } from "../utils/currency";
import { isTestEnvironment } from "../utils/environment";
import { verifyTransaction } from "../utils/verifyTransaction";
import { createParsedError } from "../utils/errors";
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
  
  const { onError } = options;
  const log = useMemo(() => createLogger(resolvedDebug), [resolvedDebug]);

  const [loading, setLoading] = useState(!isMockMode);
  const [error, setError] = useState<Error | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(isMockMode);
  const [isVerifying, setIsVerifying] = useState(false);

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

      try {
        await loadScript(FEDAPAY_SCRIPT_URL, FEDAPAY_SCRIPT_ID);
        if (isMounted) {
          setScriptLoaded(true);
          setLoading(false);
          log.success("FedaPay SDK loaded successfully");
        }
      } catch (err) {
        if (isMounted) {
          const loadError = createParsedError(err);
          setError(loadError);
          setLoading(false);
          log.error("Failed to load FedaPay SDK", err);
        }
      }
    };

    initScript();

    return () => {
      isMounted = false;
    };
  }, [log, isMockMode]);

  const handlePaymentSuccess = useCallback(
    async (response: FedaPayCallbackResponse) => {
      log.success("Payment completed by provider", response);

      if (config.verifyUrl) {
        setIsVerifying(true);
        log.info("🔐 Verifying transaction with backend...", { url: config.verifyUrl });

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
          config.onComplete?.(response);
        } catch (err) {
          setIsVerifying(false);
          const verifyError = err instanceof Error ? err : new Error("Verification failed");
          log.error("🔐 Backend verification failed", verifyError);
          onError?.({
            code: "SDK_ERROR",
            message: verifyError.message,
          });
        }
      } else {
        config.onComplete?.(response);
      }
    },
    [config, log, onError]
  );

  const openDialog = useCallback(() => {
    log.info("Opening FedaPay dialog...", { config, isMockMode });

    if (!isMockMode) {
      if (!resolvedPublicKey || resolvedPublicKey.trim() === "") {
        const validationError: PaymentValidationError = {
          code: "MISSING_PUBLIC_KEY",
          message: "Missing Public Key. Provide it via config or BeninPaymentProvider.",
        };
        log.error("Validation failed: Missing Public Key.");
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
      onError?.(validationError);
      return;
    }

    if (isMockMode) {
      log.info("🧪 Simulating payment...");
      
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

      const checkout = window.FedaPay.init("#fedapay-checkout-container", {
        public_key: resolvedPublicKey,
        transaction: transactionWithMetadata,
        customer: config.customer,
        currency: { iso: resolvedCurrency },
        onComplete: handlePaymentSuccess,
        onClose: () => {
          log.info("Payment dialog closed by user");
          config.onClose?.();
        },
      });

      checkout.open();
      log.success("FedaPay dialog opened successfully");
    } catch (err) {
      log.error("Failed to open FedaPay dialog", err);
      const sdkError =
        err instanceof Error ? err : new Error("Failed to open FedaPay dialog");
      setError(sdkError);
      onError?.({
        code: "SDK_ERROR",
        message: sdkError.message,
      });
    }
  }, [scriptLoaded, config, resolvedPublicKey, resolvedCurrency, log, onError, isMockMode, handlePaymentSuccess]);

  return {
    openDialog,
    loading,
    error,
    scriptLoaded,
    isMockMode,
    isVerifying,
  };
}
