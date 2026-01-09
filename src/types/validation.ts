/**
 * Validation error codes for payment operations.
 */
export type ValidationErrorCode =
  | "INVALID_AMOUNT"
  | "MISSING_PUBLIC_KEY"
  | "SDK_NOT_LOADED"
  | "SDK_ERROR";

/**
 * Validation error returned when payment configuration is invalid.
 */
export interface PaymentValidationError {
  /** Machine-readable error code */
  code: ValidationErrorCode;
  /** Human-readable error message */
  message: string;
}
