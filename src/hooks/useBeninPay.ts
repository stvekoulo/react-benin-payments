"use client";

import { useFedaPay, type UseFedaPayConfig, type UseFedaPayOptions } from "./useFedaPay";
import { useKkiaPay, type UseKkiaPayConfig } from "./useKkiaPay";
import type { FedaPayCallbackResponse, KkiaPaySuccessResponse, KkiaPayFailedResponse } from "../types";
import type { PaymentValidationError } from "../types/validation";

/**
 * Supported payment providers.
 */
export type PaymentProvider = "fedapay" | "kkiapay";

/**
 * Unified payment result from any provider.
 */
export interface UnifiedPaymentResult {
  /** Transaction ID from the provider */
  transactionId: string;
  /** Amount that was charged */
  amount: number;
  /** Payment status */
  status: "success" | "failed" | "pending";
  /** Original provider-specific response */
  rawResponse: FedaPayCallbackResponse | KkiaPaySuccessResponse;
}

/**
 * Config for useBeninPay hook.
 */
export interface UseBeninPayConfig {
  /** The payment provider to use */
  provider: PaymentProvider;
  /** 
   * FedaPay specific configuration.
   * Required when provider is "fedapay".
   */
  fedapay?: UseFedaPayConfig;
  /** 
   * KKiaPay specific configuration.
   * Required when provider is "kkiapay".
   */
  kkiapay?: UseKkiaPayConfig;
}

/**
 * Options for useBeninPay hook.
 */
export interface UseBeninPayOptions {
  /** Enable debug mode */
  debug?: boolean;
  /** Enable mock mode for testing */
  mock?: boolean;
  /** Callback on successful payment */
  onSuccess?: (result: UnifiedPaymentResult) => void;
  /** Callback on failed payment */
  onFailed?: (error: KkiaPayFailedResponse) => void;
  /** Callback when payment dialog is closed */
  onClose?: () => void;
  /** Callback on validation errors */
  onError?: (error: PaymentValidationError) => void;
}

/**
 * Return type for useBeninPay hook.
 */
export interface UseBeninPayReturn {
  /** Function to initiate payment */
  pay: () => void;
  /** Whether the SDK is loading */
  loading: boolean;
  /** Error if SDK loading failed */
  error: Error | null;
  /** Whether SDK is ready */
  isReady: boolean;
  /** Current provider being used */
  provider: PaymentProvider;
  /** Whether running in mock mode */
  isMockMode: boolean;
  /** Whether backend verification is in progress */
  isVerifying: boolean;
}

/**
 * Universal payment hook that abstracts FedaPay and KKiaPay.
 * 
 * Allows switching between payment providers without changing your code structure.
 * Provides a unified interface for both providers.
 * 
 * @param config - Configuration including provider selection
 * @param options - Options for callbacks and modes
 * @returns Unified payment interface
 * 
 * @example
 * ```tsx
 * import { useBeninPay } from "react-benin-payments";
 * 
 * function PaymentButton() {
 *   // Easy provider switching - just change this value!
 *   const provider = useFeatureFlag("payment_provider") || "fedapay";
 * 
 *   const { pay, loading, isReady } = useBeninPay(
 *     {
 *       provider,
 *       fedapay: { transaction: { amount: 5000 } },
 *       kkiapay: { amount: 5000 }
 *     },
 *     {
 *       onSuccess: (result) => {
 *         console.log(`Paid via ${provider}!`, result.transactionId);
 *       }
 *     }
 *   );
 * 
 *   return (
 *     <button onClick={pay} disabled={loading || !isReady}>
 *       {loading ? "Loading..." : `Pay with ${provider}`}
 *     </button>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Mock mode for testing
 * const { pay, isMockMode } = useBeninPay(
 *   { provider: "fedapay", fedapay: { transaction: { amount: 1000 } } },
 *   { mock: true }
 * );
 * ```
 */
export function useBeninPay(
  config: UseBeninPayConfig,
  options: UseBeninPayOptions = {}
): UseBeninPayReturn {
  const { provider, fedapay, kkiapay } = config;
  const { debug, mock, onSuccess, onFailed, onClose, onError } = options;

  const fedaPayOptions: UseFedaPayOptions = {
    debug,
    mock,
    onError,
  };

  const fedaPayConfig: UseFedaPayConfig = fedapay ?? {
    transaction: { amount: 0 },
  };

  if (fedapay && onSuccess) {
    fedaPayConfig.onComplete = (response) => {
      const unified: UnifiedPaymentResult = {
        transactionId: response.transaction.reference,
        amount: response.transaction.amount,
        status: response.transaction.status === "approved" ? "success" : "pending",
        rawResponse: response,
      };
      onSuccess(unified);
    };
  }
  if (fedapay && onClose) {
    fedaPayConfig.onClose = onClose;
  }

  const {
    openDialog,
    loading: fedaLoading,
    error: fedaError,
    scriptLoaded: fedaReady,
    isMockMode: fedaMock,
    isVerifying: fedaVerifying,
  } = useFedaPay(fedaPayConfig, fedaPayOptions);

  const {
    openKkiapay,
    loading: kkiaLoading,
    error: kkiaError,
    scriptLoaded: kkiaReady,
    isMockMode: kkiaMock,
    isVerifying: kkiaVerifying,
  } = useKkiaPay({
    debug,
    mock,
    onSuccess: onSuccess
      ? (data) => {
          const unified: UnifiedPaymentResult = {
            transactionId: data.transactionId,
            amount: data.amount,
            status: "success",
            rawResponse: data,
          };
          onSuccess(unified);
        }
      : undefined,
    onFailed,
    onClose,
    onValidationError: onError,
  });

  if (provider === "fedapay") {
    return {
      pay: openDialog,
      loading: fedaLoading,
      error: fedaError,
      isReady: fedaReady,
      provider: "fedapay",
      isMockMode: fedaMock,
      isVerifying: fedaVerifying,
    };
  }

  const kkiaPayConfig: UseKkiaPayConfig = kkiapay ?? { amount: 0 };

  return {
    pay: () => openKkiapay(kkiaPayConfig),
    loading: kkiaLoading,
    error: kkiaError,
    isReady: kkiaReady,
    provider: "kkiapay",
    isMockMode: kkiaMock,
    isVerifying: kkiaVerifying,
  };
}
