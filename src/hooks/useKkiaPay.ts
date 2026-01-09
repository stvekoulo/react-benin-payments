

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadScript } from "../utils/scriptLoader";
import { createLogger } from "../utils/logger";
import { validateKeyEnvironment, logSandboxMode } from "../utils/keyValidator";
import { generateMockTransactionId } from "../utils/currency";
import { isTestEnvironment } from "../utils/environment";
import { verifyTransaction } from "../utils/verifyTransaction";
import { createParsedError } from "../utils/errors";
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
  
  const { onSuccess, onFailed, onClose, onValidationError } = options;
  
  const log = useMemo(() => createLogger(resolvedDebug), [resolvedDebug]);

  const [loading, setLoading] = useState(!isMockMode);
  const [error, setError] = useState<Error | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(isMockMode);
  const [isVerifying, setIsVerifying] = useState(false);

  const handlePaymentSuccess = useCallback(
    async (data: KkiaPaySuccessResponse) => {
      log.success("Payment completed by provider", data);

      if (options.verifyUrl) {
        setIsVerifying(true);
        log.info("🔐 Verifying transaction with backend...", { url: options.verifyUrl });

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
          onSuccess?.(data);
        } catch (err) {
          setIsVerifying(false);
          const verifyError = err instanceof Error ? err : new Error("Verification failed");
          log.error("🔐 Backend verification failed", verifyError);
          onValidationError?.({
            code: "SDK_ERROR",
            message: verifyError.message,
          });
        }
      } else {
        onSuccess?.(data);
      }
    },
    [options.verifyUrl, options.verifyMethod, options.customVerifyHeaders, log, onSuccess, onValidationError]
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

      try {
        await loadScript(KKIAPAY_SCRIPT_URL, KKIAPAY_SCRIPT_ID);
        if (isMounted) {
          setScriptLoaded(true);
          setLoading(false);
          log.success("KKiaPay SDK loaded successfully");
        }
      } catch (err) {
        if (isMounted) {
          const loadError = createParsedError(err);
          setError(loadError);
          setLoading(false);
          log.error("Failed to load KKiaPay SDK", err);
        }
      }
    };

    initScript();

    return () => {
      isMounted = false;
    };
  }, [log, isMockMode]);

  useEffect(() => {
    if (!scriptLoaded || isMockMode) return;

    const handleFailed = (data: KkiaPayFailedResponse) => {
      log.error("Payment failed", data);
      onFailed?.(data);
    };

    const handleClose = () => {
      log.info("Payment widget closed by user");
      onClose?.();
    };

    if (window.addKkiapayListener) {
      window.addKkiapayListener("success", handlePaymentSuccess);
      window.addKkiapayListener("failed", handleFailed);
      window.addKkiapayListener("close", handleClose);
      log.info("Event listeners attached");
    }

    return () => {
      if (window.removeKkiapayListener) {
        window.removeKkiapayListener("success");
        window.removeKkiapayListener("failed");
        window.removeKkiapayListener("close");
        log.info("Event listeners removed (cleanup)");
      }
    };
  }, [scriptLoaded, handlePaymentSuccess, onFailed, onClose, log, isMockMode]);

  const openKkiapay = useCallback(
    (config: UseKkiaPayConfig) => {
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
        onValidationError?.(validationError);
        return;
      }

      if (!config.amount || config.amount <= 0) {
        const validationError: PaymentValidationError = {
          code: "INVALID_AMOUNT",
          message: "Invalid amount. Amount must be greater than 0.",
        };
        log.error("Validation failed: Invalid amount", { amount: config.amount });
        onValidationError?.(validationError);
        return;
      }

      if (isMockMode) {
        log.info("🧪 Simulating payment...");
        
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
      } catch (err) {
        log.error("Failed to open KKiaPay widget", err);
        const sdkError =
          err instanceof Error ? err : new Error("Failed to open KKiaPay widget");
        setError(sdkError);
        onValidationError?.({
          code: "SDK_ERROR",
          message: sdkError.message,
        });
      }
    },
    [scriptLoaded, globalConfig, log, onValidationError, handlePaymentSuccess, isMockMode]
  );

  return {
    openKkiapay,
    loading,
    error,
    scriptLoaded,
    isMockMode,
    isVerifying,
  };
}
