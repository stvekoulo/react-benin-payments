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

// FedaPay hooks
export { useFedaPay } from "./hooks/useFedaPay";
export { usePaymentStatus } from "./hooks/usePaymentStatus";
export { usePaymentHistory } from "./hooks/usePaymentHistory";
export { useRetryPayment } from "./hooks/useRetryPayment";

// Hook types
export type {
  UseFedaPayOptions,
  UseFedaPayReturn,
  UseFedaPayConfig,
} from "./hooks/useFedaPay";
export type {
  TransactionStatus,
  UsePaymentStatusOptions,
  UsePaymentStatusReturn,
} from "./hooks/usePaymentStatus";
export type {
  PaymentHistoryStorage,
  PaymentHistoryEntry,
  UsePaymentHistoryOptions,
  UsePaymentHistoryReturn,
} from "./hooks/usePaymentHistory";
export type {
  UseRetryPaymentOptions,
  UseRetryPaymentReturn,
} from "./hooks/useRetryPayment";

// Validation & analytics types
export type {
  ValidationErrorCode,
  PaymentValidationError,
  PaymentMessageOverrides,
  ErrorMessageResolver,
} from "./types/validation";
export type { EnvironmentWarningMessages } from "./utils/keyValidator";
export type {
  BeninPaymentAnalyticsEventName,
  BeninPaymentAnalyticsEvent,
  BeninPaymentAnalyticsHandler,
} from "./utils/analytics";

// FedaPay components
export { FedaPayButton } from "./components/FedaPayButton";
export { FedaPayConsumer } from "./components/FedaPayConsumer";
export { FedaPayLogo } from "./components/icons/FedaPayLogo";
export { PaymentStatusBadge } from "./components/PaymentStatusBadge";

// Component types
export type { FedaPayButtonProps } from "./components/FedaPayButton";
export type {
  FedaPayConsumerProps,
  FedaPayRenderProps,
} from "./components/FedaPayConsumer";
export type { PaymentStatusBadgeProps } from "./components/PaymentStatusBadge";

// FedaPay and shared core types
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
  PaymentStatus,
  PaymentError,
} from "./types";

// Utilities
export { formatXOF, formatCurrency, generateMockTransactionId } from "./utils/currency";
export { parseError, createParsedError, DEFAULT_ERROR_PATTERNS } from "./utils/errors";
export type { ErrorPattern, ParseErrorOptions } from "./utils/errors";
