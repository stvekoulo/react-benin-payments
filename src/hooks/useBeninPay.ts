"use client";

import { useState } from "react";
import { useFedaPay, type UseFedaPayConfig, type UseFedaPayOptions } from "./useFedaPay";
import { useKkiaPay, type UseKkiaPayConfig } from "./useKkiaPay";
import type { FedaPayCallbackResponse, KkiaPaySuccessResponse, KkiaPayFailedResponse } from "../types";
import type {
  ErrorMessageResolver,
  PaymentMessageOverrides,
  PaymentValidationError,
} from "../types/validation";
import type { BeninPaymentAnalyticsHandler } from "../utils/analytics";
import type { EnvironmentWarningMessages } from "../utils/keyValidator";
import type { PaymentProvider } from "../core/types";

export type { PaymentProvider };

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
  /** Runs before opening the selected payment provider modal/widget */
  onBeforePayment?: () => void | boolean | Promise<void | boolean>;
  /** Receives standardized analytics events for the payment lifecycle */
  onAnalyticsEvent?: BeninPaymentAnalyticsHandler;
  /** Callback on successful payment */
  onSuccess?: (result: UnifiedPaymentResult) => void;
  /** Callback on failed payment */
  onFailed?: (error: KkiaPayFailedResponse) => void;
  /** Callback when payment dialog is closed */
  onClose?: () => void;
  /** Callback on validation errors */
  onError?: (error: PaymentValidationError) => void;
  /** Overrides the wording of validation error messages for this hook only. */
  messages?: PaymentMessageOverrides;
  /** Resolves the message for arbitrary caught errors (SDK load failures...) for this hook only. */
  resolveErrorMessage?: ErrorMessageResolver;
  /** Overrides the wording of dev-time console warnings for this hook only. */
  environmentWarnings?: EnvironmentWarningMessages;
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
  /** The most recent successful transaction, if any */
  lastTransaction: UnifiedPaymentResult | null;
  /** Whether async pre-validation is in progress */
  isPreparing: boolean;
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
  const {
    debug,
    mock,
    onBeforePayment,
    onAnalyticsEvent,
    onSuccess,
    onFailed,
    onClose,
    onError,
    messages,
    resolveErrorMessage,
    environmentWarnings,
  } = options;
  const [lastTransaction, setLastTransaction] =
    useState<UnifiedPaymentResult | null>(null);

  // BUG FIX 1: Pass mock:true to the non-selected provider so its SDK script
  // is never loaded. Both hooks must always be called (React rules of hooks),
  // but only the active provider's real SDK is fetched.
  const fedaPayOptions: UseFedaPayOptions = {
    debug,
    mock: provider !== "fedapay" ? true : mock,
    onBeforePayment,
    onAnalyticsEvent,
    onError,
    messages,
    resolveErrorMessage,
    environmentWarnings,
  };

  // BUG FIX 2: Build a new config object with spread instead of mutating the
  // fedapay prop reference directly (which caused subtle re-render bugs).
  const fedaPayConfig: UseFedaPayConfig = {
    ...(fedapay ?? { transaction: { amount: 0 } }),
    ...(fedapay && onSuccess
      ? {
          onComplete: (response) => {
            const unified: UnifiedPaymentResult = {
              transactionId: response.transaction.reference,
              amount: response.transaction.amount,
              status:
                response.transaction.status === "approved" ? "success" : "pending",
              rawResponse: response,
            };
            setLastTransaction(unified);
            fedapay.onComplete?.(response);
            onSuccess(unified);
          },
        }
      : {}),
    ...(fedapay && onClose
      ? {
          onClose: () => {
            fedapay.onClose?.();
            onClose();
          },
        }
      : {}),
  };

  const {
    openDialog,
    loading: fedaLoading,
    error: fedaError,
    scriptLoaded: fedaReady,
    isMockMode: fedaMock,
    isVerifying: fedaVerifying,
    isPreparing: fedaPreparing,
  } = useFedaPay(fedaPayConfig, fedaPayOptions);

  // BUG FIX 1 (continued): mirror the same mock-bypass for KKiaPay.
  const {
    openKkiapay,
    loading: kkiaLoading,
    error: kkiaError,
    scriptLoaded: kkiaReady,
    isMockMode: kkiaMock,
    isVerifying: kkiaVerifying,
    isPreparing: kkiaPreparing,
  } = useKkiaPay({
    debug,
    mock: provider !== "kkiapay" ? true : mock,
    verifyUrl: kkiapay?.verifyUrl,
    verifyMethod: kkiapay?.verifyMethod,
    customVerifyHeaders: kkiapay?.customVerifyHeaders,
    onBeforePayment,
    onAnalyticsEvent,
    onSuccess: onSuccess
      ? (data) => {
          const unified: UnifiedPaymentResult = {
            transactionId: data.transactionId,
            amount: data.amount,
            status: "success",
            rawResponse: data,
          };
          setLastTransaction(unified);
          onSuccess(unified);
        }
      : undefined,
    onFailed,
    onClose: onClose
      ? () => {
          onClose();
        }
      : undefined,
    onValidationError: onError,
    messages,
    resolveErrorMessage,
    environmentWarnings,
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
      lastTransaction,
      isPreparing: fedaPreparing,
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
    lastTransaction,
    isPreparing: kkiaPreparing,
  };
}
