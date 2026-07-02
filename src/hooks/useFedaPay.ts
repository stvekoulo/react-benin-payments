"use client";

import { useCallback, useMemo, useRef } from "react";
import { usePaymentEngine } from "../core/usePaymentEngine";
import { createFedaPayDriver } from "../providers/fedapay";
import { isTestEnvironment } from "../utils/environment";
import { useBeninConfig } from "../context";
import { mergeI18nOptions } from "./mergeI18nOptions";
import type { FedaPayConfig, FedaPayCallbackResponse, Currency } from "../types";
import type {
  ErrorMessageResolver,
  PaymentMessageOverrides,
  PaymentValidationError,
} from "../types/validation";
import type { EnvironmentWarningMessages } from "../utils/keyValidator";
import type { BeninPaymentAnalyticsHandler } from "../utils/analytics";

const fedaPayDriver = createFedaPayDriver();

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
 * Internally this is a thin binding over the framework-agnostic payment
 * engine (see `src/core`) configured with the FedaPay driver — the same
 * engine that powers `useKkiaPay`.
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
  const isMockMode = options.mock ?? isTestEnvironment();

  // Fully-resolved config handed to the driver/engine — it never needs to
  // know about BeninPaymentProvider defaults.
  const resolvedConfig: FedaPayConfig = useMemo(
    () => ({
      ...config,
      public_key: resolvedPublicKey,
      sandbox: resolvedSandbox,
      currency: { iso: resolvedCurrency },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, resolvedPublicKey, resolvedSandbox, resolvedCurrency]
  );

  const configRef = useRef(resolvedConfig);
  configRef.current = resolvedConfig;

  const { onError, onBeforePayment, onAnalyticsEvent, messages, resolveErrorMessage, environmentWarnings } =
    options;

  const [state, open] = usePaymentEngine(fedaPayDriver, () => ({
    debug: options.debug ?? globalConfig.debug,
    isMockMode,
    verification: {
      verifyUrl: config.verifyUrl,
      verifyMethod: config.verifyMethod,
      customVerifyHeaders: config.customVerifyHeaders,
    },
    onBeforePayment,
    onAnalyticsEvent,
    globalAnalyticsHandler: globalConfig.onAnalyticsEvent,
    onRawSuccess: (response: FedaPayCallbackResponse) => config.onComplete?.(response),
    onClose: config.onClose,
    onValidationError: onError,
    getAnalyticsConfig: () => configRef.current,
    ...mergeI18nOptions(globalConfig, { messages, resolveErrorMessage, environmentWarnings }),
  }));

  const openDialog = useCallback(() => {
    open(configRef.current);
  }, [open]);

  return {
    openDialog,
    loading: state.loading,
    error: state.error,
    scriptLoaded: state.scriptLoaded,
    isMockMode,
    isVerifying: state.isVerifying,
    isPreparing: state.isPreparing,
  };
}
