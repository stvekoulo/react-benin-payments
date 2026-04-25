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
export { usePaymentStatus } from "./hooks/usePaymentStatus";
export { usePaymentHistory } from "./hooks/usePaymentHistory";
export { useRetryPayment } from "./hooks/useRetryPayment";
export { usePaymentReceipt } from "./hooks/usePaymentReceipt";

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
export type {
  TransactionStatus,
  PaymentStatusTransport,
  PaymentStatusWebSocketLike,
  UsePaymentStatusWebSocketMessage,
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
export type {
  UsePaymentReceiptReturn,
} from "./hooks/usePaymentReceipt";
export type {
  ReceiptConfig,
  ReceiptTransactionData,
  ReceiptField,
  ReceiptLabels,
  ReceiptEmailConfig,
  ReceiptEmailParams,
} from "./types/receipt";
export type { GenerateReceiptResult } from "./utils/generateReceipt";
export { generateReceiptPdf } from "./utils/generateReceipt";

// Validation types
export type {
  ValidationErrorCode,
  PaymentValidationError,
} from "./types/validation";
export type {
  BeninPaymentAnalyticsEventName,
  BeninPaymentAnalyticsEvent,
  BeninPaymentAnalyticsHandler,
} from "./utils/analytics";

// Components
export {
  FedaPayButton,
  KkiaPayButton,
  FedaPayConsumer,
  KkiaPayConsumer,
  FedaPayLogo,
  KkiaPayLogo,
  PaymentStatusBadge,
} from "./components";

// Component types
export type {
  FedaPayButtonProps,
  KkiaPayButtonProps,
  FedaPayConsumerProps,
  FedaPayRenderProps,
  KkiaPayConsumerProps,
  KkiaPayRenderProps,
  PaymentStatusBadgeProps,
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
