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

// KKiaPay hooks
export { useKkiaPay } from "./hooks/useKkiaPay";
export { usePaymentStatus } from "./hooks/usePaymentStatus";
export { usePaymentHistory } from "./hooks/usePaymentHistory";
export { useRetryPayment } from "./hooks/useRetryPayment";

// Hook types
export type {
  UseKkiaPayOptions,
  UseKkiaPayReturn,
  UseKkiaPayConfig,
} from "./hooks/useKkiaPay";
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
} from "./types/validation";
export type {
  BeninPaymentAnalyticsEventName,
  BeninPaymentAnalyticsEvent,
  BeninPaymentAnalyticsHandler,
} from "./utils/analytics";

// KKiaPay components
export { KkiaPayButton } from "./components/KkiaPayButton";
export { KkiaPayConsumer } from "./components/KkiaPayConsumer";
export { KkiaPayLogo } from "./components/icons/KkiaPayLogo";
export { PaymentStatusBadge } from "./components/PaymentStatusBadge";

// Component types
export type { KkiaPayButtonProps } from "./components/KkiaPayButton";
export type {
  KkiaPayConsumerProps,
  KkiaPayRenderProps,
} from "./components/KkiaPayConsumer";
export type { PaymentStatusBadgeProps } from "./components/PaymentStatusBadge";

// KKiaPay and shared core types
export type {
  Currency,
  PaymentMethod,
  VerifyMethod,
  VerificationConfig,
  VerificationResponse,
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
