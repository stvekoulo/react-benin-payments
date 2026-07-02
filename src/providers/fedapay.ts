import { validateKeyEnvironment, logSandboxMode } from "../utils/keyValidator";
import { generateMockTransactionId } from "../utils/currency";
import { validatePublicKeyAndAmount } from "../core/validateCommonConfig";
import type { PaymentDriver } from "../core/types";
import type { FedaPayConfig, FedaPayCallbackResponse } from "../types";

const FEDAPAY_SCRIPT_URL = "https://cdn.fedapay.com/checkout.js?v=1.1.7";
const FEDAPAY_SCRIPT_ID = "fedapay-checkout-script";

/**
 * FedaPay adapter for `createPaymentEngine`. FedaPay's SDK takes inline
 * `onComplete`/`onClose` callbacks per call (`window.FedaPay.init(...).open()`),
 * so `open()` wires the engine's handlers directly into that call.
 */
export function createFedaPayDriver(): PaymentDriver<FedaPayConfig, FedaPayCallbackResponse> {
  return {
    name: "fedapay",
    scriptUrl: FEDAPAY_SCRIPT_URL,
    scriptId: FEDAPAY_SCRIPT_ID,

    isSdkReady: () => typeof window !== "undefined" && !!window.FedaPay,

    logEnvironmentWarnings(config, { isMockMode, environmentWarnings }) {
      if (isMockMode) return;
      if (config.public_key) {
        validateKeyEnvironment(config.public_key, !!config.sandbox, "FedaPay", environmentWarnings);
      }
      logSandboxMode(!!config.sandbox, "FedaPay", environmentWarnings);
    },

    validate: (config, { isMockMode }) =>
      validatePublicKeyAndAmount(config.public_key, config.transaction?.amount, isMockMode),

    getAmount: (config) => config?.transaction?.amount,

    getAnalyticsExtras: (config) => ({ currency: config?.currency?.iso }),

    buildMockSuccess: (config) => ({
      reason: "mock_transaction_completed",
      transaction: {
        id: Math.floor(Math.random() * 1000000),
        reference: generateMockTransactionId(),
        amount: config.transaction.amount,
        status: "approved",
      },
    }),

    toVerifyPayload: (raw, config) => ({
      transactionId: raw.transaction.reference,
      amount: raw.transaction.amount,
      metadata: config.metadata,
    }),

    getStatus: (raw) => raw.transaction.status,

    open(config, handlers, ctx) {
      const transactionWithMetadata = {
        ...config.transaction,
        custom_metadata: {
          ...config.transaction.custom_metadata,
          ...config.metadata,
        },
      };

      const widget = window.FedaPay!.init({
        public_key: config.public_key,
        transaction: transactionWithMetadata,
        customer: config.customer,
        currency: config.currency,
        onComplete: (response: FedaPayCallbackResponse) => handlers.onSuccess(response),
        onClose: () => {
          ctx.log.info("Payment dialog closed by user");
          ctx.emit({ name: "payment_closed" });
          handlers.onClose();
        },
      });

      widget.open();
    },
  };
}
