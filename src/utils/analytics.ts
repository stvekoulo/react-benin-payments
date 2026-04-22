import type { PaymentProvider } from "../hooks/useBeninPay";

export type BeninPaymentAnalyticsEventName =
  | "sdk_load_started"
  | "sdk_load_succeeded"
  | "sdk_load_failed"
  | "payment_validation_failed"
  | "payment_pre_validation_started"
  | "payment_pre_validation_succeeded"
  | "payment_pre_validation_cancelled"
  | "payment_pre_validation_failed"
  | "payment_open_attempted"
  | "payment_opened"
  | "payment_completed"
  | "payment_failed"
  | "payment_closed"
  | "payment_verification_started"
  | "payment_verification_succeeded"
  | "payment_verification_failed";

export interface BeninPaymentAnalyticsEvent {
  name: BeninPaymentAnalyticsEventName;
  provider: PaymentProvider;
  amount?: number;
  currency?: string;
  mode: "mock" | "live";
  transactionId?: string;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type BeninPaymentAnalyticsHandler = (
  event: BeninPaymentAnalyticsEvent
) => void | Promise<void>;

export function createAnalyticsEmitter(
  handlers: Array<BeninPaymentAnalyticsHandler | undefined>,
  debugLog?: (message: string, ...args: unknown[]) => void
): (event: Omit<BeninPaymentAnalyticsEvent, "timestamp">) => void {
  return (event) => {
    const fullEvent: BeninPaymentAnalyticsEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    handlers.forEach((handler) => {
      if (!handler) return;

      try {
        void Promise.resolve(handler(fullEvent)).catch((error) => {
          debugLog?.("Analytics handler failed", error);
        });
      } catch (error) {
        debugLog?.("Analytics handler failed", error);
      }
    });
  };
}
