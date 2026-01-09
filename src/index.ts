"use client";

// Context & Provider
export {
  BeninPaymentProvider,
  useBeninConfig,
  useIsBeninProviderMounted,
} from "./context";
export type {
  BeninPaymentConfig,
  BeninPaymentProviderProps,
} from "./context";

// Hooks
export { useFedaPay } from "./hooks/useFedaPay";
export { useKkiaPay } from "./hooks/useKkiaPay";
export { useBeninPay } from "./hooks/useBeninPay";

// Hook types
export type {
  UseFedaPayOptions,
  UseFedaPayReturn,
  UseFedaPayConfig,
} from "./hooks/useFedaPay";
export type {
  UseKkiaPayOptions,
  UseKkiaPayReturn,
  UseKkiaPayConfig,
} from "./hooks/useKkiaPay";
export type {
  PaymentProvider,
  UnifiedPaymentResult,
  UseBeninPayConfig,
  UseBeninPayOptions,
  UseBeninPayReturn,
} from "./hooks/useBeninPay";

// Validation types
export type {
  ValidationErrorCode,
  PaymentValidationError,
} from "./types/validation";

// Components
export {
  FedaPayButton,
  KkiaPayButton,
  FedaPayConsumer,
  KkiaPayConsumer,
  FedaPayLogo,
  KkiaPayLogo,
} from "./components";

// Component types
export type {
  FedaPayButtonProps,
  KkiaPayButtonProps,
  FedaPayConsumerProps,
  FedaPayRenderProps,
  KkiaPayConsumerProps,
  KkiaPayRenderProps,
} from "./components";

// Core types
export type {
  Currency,
  PaymentMethod,
  VerifyMethod,
  VerificationConfig,
  VerificationResponse,
  FedaPayTransaction,
  FedaPayCustomer,
  FedaPayConfig,
  FedaPayCallbackResponse,
  FedaPayCheckoutInstance,
  FedaPayWidgetConfig,
  KkiaPayConfig,
  KkiaPaySuccessResponse,
  KkiaPayFailedResponse,
  KkiaPayEventType,
  KkiaPayEventCallback,
  PaymentStatus,
  PaymentError,
} from "./types";

// Utilities
export { formatXOF, formatCurrency, generateMockTransactionId } from "./utils/currency";
export { parseError, createParsedError } from "./utils/errors";
