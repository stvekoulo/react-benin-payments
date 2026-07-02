import { validateKeyEnvironment, logSandboxMode } from "../utils/keyValidator";
import { generateMockTransactionId } from "../utils/currency";
import { validatePublicKeyAndAmount } from "../core/validateCommonConfig";
import type { PaymentDriver, PaymentDriverHandlers } from "../core/types";
import type { KkiaPayConfig, KkiaPaySuccessResponse, KkiaPayFailedResponse } from "../types";

const KKIAPAY_SCRIPT_URL = "https://cdn.kkiapay.me/k.js";
const KKIAPAY_SCRIPT_ID = "kkiapay-widget-script";

// The KKiaPay SDK exposes ONE global event bus (`addKkiapayListener`) and
// only ever supports one open widget at a time. So rather than a persistent
// per-engine subscription (which would relay one real event to every
// mounted useKkiaPay() instance, not just the one that opened the widget),
// we track a single "active call" reference: whichever `open()` call is
// currently in flight owns the next success/failed/close event.
let activeHandlers: PaymentDriverHandlers<KkiaPaySuccessResponse> | null = null;
let globalListenersAttached = false;

function ensureGlobalListeners(): void {
  if (globalListenersAttached || typeof window === "undefined" || !window.addKkiapayListener) {
    return;
  }

  window.addKkiapayListener<KkiaPaySuccessResponse>("success", (data) => {
    const handlers = activeHandlers;
    activeHandlers = null;
    handlers?.onSuccess(data);
  });
  window.addKkiapayListener<KkiaPayFailedResponse>("failed", (data) => {
    const handlers = activeHandlers;
    activeHandlers = null;
    handlers?.onFailure(data);
  });
  window.addKkiapayListener("close", () => {
    const handlers = activeHandlers;
    activeHandlers = null;
    handlers?.onClose();
  });

  globalListenersAttached = true;
}

/**
 * KKiaPay adapter for `createPaymentEngine`. Unlike FedaPay, the SDK relays
 * success/failure/close through a global event bus rather than a per-call
 * callback, so `open()` registers itself as the "active call" just before
 * triggering the widget instead of receiving an inline callback.
 */
export function createKkiaPayDriver(): PaymentDriver<KkiaPayConfig, KkiaPaySuccessResponse> {
  return {
    name: "kkiapay",
    scriptUrl: KKIAPAY_SCRIPT_URL,
    scriptId: KKIAPAY_SCRIPT_ID,

    isSdkReady: () => typeof window !== "undefined" && !!window.openKkiapayWidget,

    logEnvironmentWarnings(config, { isMockMode, environmentWarnings }) {
      if (isMockMode) return;
      if (config.key) {
        validateKeyEnvironment(config.key, !!config.sandbox, "KKiaPay", environmentWarnings);
      }
      logSandboxMode(!!config.sandbox, "KKiaPay", environmentWarnings);
    },

    validate: (config, { isMockMode }) =>
      validatePublicKeyAndAmount(config.key, config.amount, isMockMode),

    getAmount: (config) => config?.amount,

    buildMockSuccess: (config) => ({
      transactionId: generateMockTransactionId(),
      amount: config.amount,
      phone: config.phone || "+22900000000",
    }),

    toVerifyPayload: (raw) => ({
      transactionId: raw.transactionId,
      amount: raw.amount,
    }),

    open(config, handlers) {
      ensureGlobalListeners();
      activeHandlers = handlers;

      const configWithDefaults: KkiaPayConfig = {
        ...config,
        theme: config.theme ?? "#4E6BFF",
        paymentMethods: config.paymentMethods ?? ["momo", "card"],
      };
      window.openKkiapayWidget!(configWithDefaults);
    },
  };
}
