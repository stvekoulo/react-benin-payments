"use client";

import { useCallback } from "react";
import { usePaymentEngine } from "../core/usePaymentEngine";
import { createKkiaPayDriver } from "../providers/kkiapay";
import { isTestEnvironment } from "../utils/environment";
import { useBeninConfig } from "../context";
import { mergeI18nOptions } from "./mergeI18nOptions";
import type {
  KkiaPayConfig,
  KkiaPaySuccessResponse,
  KkiaPayFailedResponse,
  VerificationConfig,
} from "../types";
import type {
  ErrorMessageResolver,
  PaymentMessageOverrides,
  PaymentValidationError,
} from "../types/validation";
import type { EnvironmentWarningMessages } from "../utils/keyValidator";
import type { BeninPaymentAnalyticsHandler } from "../utils/analytics";

const kkiaPayDriver = createKkiaPayDriver();

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
  /**
   * Overrides the wording of validation error messages for this hook only
   * (takes precedence over `BeninPaymentProvider`'s `messages`).
   */
  messages?: PaymentMessageOverrides;
  /**
   * Resolves the message for arbitrary caught errors (SDK load failures...)
   * for this hook only. Falls back to the provider's `resolveErrorMessage`,
   * then to the built-in translations.
   */
  resolveErrorMessage?: ErrorMessageResolver;
  /**
   * Overrides the wording of dev-time console warnings for this hook only
   * (takes precedence over `BeninPaymentProvider`'s `environmentWarnings`).
   */
  environmentWarnings?: EnvironmentWarningMessages;
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
 * Internally this is a thin binding over the framework-agnostic payment
 * engine (see `src/core`) configured with the KKiaPay driver — the same
 * engine that powers `useFedaPay`.
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
  const isMockMode = options.mock ?? isTestEnvironment();

  const {
    onSuccess,
    onFailed,
    onClose,
    onValidationError,
    onBeforePayment,
    onAnalyticsEvent,
    verifyUrl,
    verifyMethod,
    customVerifyHeaders,
    messages,
    resolveErrorMessage,
    environmentWarnings,
  } = options;

  const [state, open] = usePaymentEngine(kkiaPayDriver, () => ({
    debug: options.debug ?? globalConfig.debug,
    isMockMode,
    verification: { verifyUrl, verifyMethod, customVerifyHeaders },
    onBeforePayment,
    onAnalyticsEvent,
    globalAnalyticsHandler: globalConfig.onAnalyticsEvent,
    onRawSuccess: (data: KkiaPaySuccessResponse) => onSuccess?.(data),
    onRawFailure: (data) => onFailed?.(data as KkiaPayFailedResponse),
    onClose,
    onValidationError,
    ...mergeI18nOptions(globalConfig, { messages, resolveErrorMessage, environmentWarnings }),
  }));

  const openKkiapay = useCallback(
    (config: UseKkiaPayConfig) => {
      const resolvedKey = config.key || globalConfig.kkiaPayPublicKey || "";
      const resolvedSandbox = config.sandbox ?? globalConfig.isTestMode;

      open({
        ...config,
        key: resolvedKey,
        sandbox: resolvedSandbox,
      });
    },
    [open, globalConfig.kkiaPayPublicKey, globalConfig.isTestMode]
  );

  return {
    openKkiapay,
    loading: state.loading,
    error: state.error,
    scriptLoaded: state.scriptLoaded,
    isMockMode,
    isVerifying: state.isVerifying,
    isPreparing: state.isPreparing,
  };
}
