/**
 * Supported currencies for payment transactions.
 * @default "XOF" - West African CFA Franc (default for Benin)
 */
export type Currency = "XOF" | "USD" | "EUR";

/**
 * Available payment methods.
 */
export type PaymentMethod = "momo" | "card" | "direct_debit";

/**
 * HTTP methods for backend verification.
 */
export type VerifyMethod = "POST" | "GET";

/**
 * Backend verification configuration.
 * Used to automatically verify transactions with your backend.
 */
export interface VerificationConfig {
  /** 
   * URL of your backend API endpoint for transaction verification.
   * The transaction_id will be sent to this endpoint.
   * @example "https://api.yoursite.com/payments/verify"
   */
  verifyUrl?: string;
  /** 
   * HTTP method to use for verification.
   * @default "POST"
   */
  verifyMethod?: VerifyMethod;
  /** 
   * Custom headers to include in the verification request.
   * Useful for authentication tokens.
   * @example { "Authorization": "Bearer xxx" }
   */
  customVerifyHeaders?: Record<string, string>;
}

/**
 * Response from backend verification.
 */
export interface VerificationResponse {
  /** Whether verification was successful */
  success: boolean;
  /** Optional message from the backend */
  message?: string;
  /** Optional additional data from the backend */
  data?: Record<string, unknown>;
}

/**
 * FedaPay transaction details.
 * Contains information about the payment amount and metadata.
 */
export interface FedaPayTransaction {
  /** Unique transaction ID (auto-generated if not provided) */
  id?: number;
  /** Amount to charge in the smallest currency unit (e.g., 5000 for 5000 XOF) */
  amount: number;
  /** Human-readable description of the transaction */
  description?: string;
  /** URL to redirect after successful payment */
  callback_url?: string;
  /** Custom data to attach to the transaction (accessible in webhooks) */
  custom_metadata?: Record<string, unknown>;
}

/**
 * FedaPay customer information.
 * Used to pre-fill the payment form and for transaction records.
 */
export interface FedaPayCustomer {
  /** Customer's first name */
  firstname?: string;
  /** Customer's last name */
  lastname?: string;
  /** Customer's email address (required for receipts) */
  email: string;
  /** Customer's phone number with country code */
  phone_number?: {
    /** Phone number without country code */
    number: string;
    /** ISO country code (e.g., "BJ" for Benin) */
    country: string;
  };
}

/**
 * Configuration object for useFedaPay hook.
 * @example
 * ```tsx
 * const config: FedaPayConfig = {
 *   public_key: "pk_live_xxxxxxxxxxxx",
 *   transaction: { amount: 5000, description: "Premium subscription" },
 *   customer: { email: "user@example.com" },
 *   sandbox: false,
 *   verifyUrl: "https://api.yoursite.com/payments/verify",
 *   onComplete: (response) => console.log("Paid!", response.transaction.id)
 * };
 * ```
 */
export interface FedaPayConfig extends VerificationConfig {
  /** 
   * Your FedaPay public key.
   * Starts with `pk_live_` for production or `pk_sandbox_` for testing.
   * @example "pk_live_xxxxxxxxxxxxxxxx"
   */
  public_key: string;
  /** Transaction details including amount */
  transaction: FedaPayTransaction;
  /** Optional customer information to pre-fill the form */
  customer?: FedaPayCustomer;
  /** 
   * Currency configuration.
   * @default { iso: "XOF" }
   */
  currency?: {
    /** ISO 4217 currency code */
    iso: Currency;
  };
  /** Additional metadata to attach to the transaction */
  metadata?: Record<string, unknown>;
  /** 
   * Enable sandbox/test mode.
   * When true, no real transactions are processed.
   * @default false
   */
  sandbox?: boolean;
  /** 
   * Allowed payment methods.
   * @default ["momo", "card"]
   */
  allowedPaymentMethods?: PaymentMethod[];
  /** 
   * Callback fired when payment is completed successfully.
   * @param response - Contains transaction details and status
   */
  onComplete?: (response: FedaPayCallbackResponse) => void;
  /** Callback fired when the payment dialog is closed without completing */
  onClose?: () => void;
}

/**
 * Response received after a FedaPay transaction.
 * Passed to the `onComplete` callback.
 */
export interface FedaPayCallbackResponse {
  /** Reason for the callback (e.g., "transaction_completed") */
  reason: string;
  /** Transaction details */
  transaction: {
    /** Unique transaction ID */
    id: number;
    /** Transaction reference for tracking */
    reference: string;
    /** Amount charged */
    amount: number;
    /** Final transaction status */
    status: "approved" | "declined" | "canceled" | "pending";
  };
}

/**
 * FedaPay checkout widget instance.
 * Returned by `window.FedaPay.init()`.
 */
export interface FedaPayCheckoutInstance {
  /** Initialize the widget in a DOM container */
  init: (containerId: string, config: FedaPayWidgetConfig) => void;
  /** Open the payment dialog */
  open: () => void;
}

/**
 * Internal configuration for FedaPay widget initialization.
 * @internal
 */
export interface FedaPayWidgetConfig {
  public_key: string;
  transaction: FedaPayTransaction;
  customer?: FedaPayCustomer;
  currency?: {
    iso: Currency;
  };
  onComplete?: (response: FedaPayCallbackResponse) => void;
  onClose?: () => void;
}

/**
 * Configuration object for useKkiaPay hook.
 * @example
 * ```tsx
 * const config: KkiaPayConfig = {
 *   amount: 5000,
 *   key: "pk_xxxxxxxxxxxxxxxx",
 *   sandbox: true,
 *   name: "John Doe",
 *   phone: "22967000000",
 *   theme: "#4E6BFF",
 *   verifyUrl: "https://api.yoursite.com/payments/verify",
 *   paymentMethods: ["momo", "card"]
 * };
 * ```
 */
export interface KkiaPayConfig extends VerificationConfig {
  /** 
   * Amount to charge in the smallest currency unit.
   * @example 5000 // 5000 XOF
   */
  amount: number;
  /** 
   * Your KKiaPay public API key.
   * @example "pk_xxxxxxxxxxxxxxxx"
   */
  key: string;
  /** 
   * Enable sandbox mode for testing.
   * When true, no real transactions are processed.
   * @default false
   */
  sandbox?: boolean;
  /** Customer's phone number (used for mobile money) */
  phone?: string;
  /** Customer's full name */
  name?: string;
  /** Customer's email address */
  email?: string;
  /** Reason or description for the payment */
  reason?: string;
  /** 
   * Primary color for the widget theme.
   * @default "#4E6BFF"
   * @example "#22C55E"
   */
  theme?: string;
  /** Your KKiaPay partner ID (if applicable) */
  partnerId?: string;
  /** 
   * Allowed payment methods.
   * @default ["momo", "card"]
   */
  paymentMethods?: PaymentMethod[];
  /** Custom data to attach to the transaction */
  data?: Record<string, unknown>;
}

/**
 * Response received after a successful KKiaPay payment.
 * Passed to the `onSuccess` callback.
 */
export interface KkiaPaySuccessResponse {
  /** Unique transaction ID from KKiaPay */
  transactionId: string;
  /** Amount that was charged */
  amount: number;
  /** Phone number used for the transaction */
  phone: string;
}

/**
 * Response received when a KKiaPay payment fails.
 * Passed to the `onFailed` callback.
 */
export interface KkiaPayFailedResponse {
  /** Error code */
  error: string;
  /** Human-readable error message */
  message: string;
}

/**
 * KKiaPay event types for listeners.
 */
export type KkiaPayEventType = "success" | "failed" | "close";

/**
 * Generic callback type for KKiaPay events.
 * @template T - The type of data passed to the callback
 */
export type KkiaPayEventCallback<T = unknown> = (data: T) => void;

/**
 * General payment status.
 * Useful for tracking payment flow in your UI.
 */
export type PaymentStatus = "idle" | "pending" | "success" | "error";

/**
 * Generic payment error structure.
 */
export interface PaymentError {
  /** Machine-readable error code */
  code: string;
  /** Human-readable error message */
  message: string;
}

declare global {
  interface Window {
    FedaPay?: {
      init: (options: FedaPayWidgetConfig) => FedaPayCheckoutInstance;
      CHECKOUT_COMPLETED?: number;
      DIALOG_DISMISSED?: number;
    };
    openKkiapayWidget?: (config: KkiaPayConfig) => void;
    addKkiapayListener?: <T = unknown>(
      event: KkiaPayEventType,
      callback: KkiaPayEventCallback<T>
    ) => void;
    removeKkiapayListener?: (event: KkiaPayEventType) => void;
  }
}

