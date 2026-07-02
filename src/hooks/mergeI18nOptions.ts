import type { ErrorMessageResolver, PaymentMessageOverrides } from "../types/validation";
import type { EnvironmentWarningMessages } from "../utils/keyValidator";

interface I18nConfig {
  messages?: PaymentMessageOverrides;
  resolveErrorMessage?: ErrorMessageResolver;
  environmentWarnings?: EnvironmentWarningMessages;
}

/**
 * Merges a hook's local `messages`/`resolveErrorMessage`/`environmentWarnings`
 * with `BeninPaymentProvider`'s global config — local wins per validation
 * code, and `resolveErrorMessage` tries local first, then global. Shared by
 * `useFedaPay`/`useKkiaPay`/`useBeninPay` so the precedence rule lives in one place.
 */
export function mergeI18nOptions(
  global: I18nConfig,
  local: I18nConfig
): Required<Pick<I18nConfig, "messages" | "environmentWarnings">> &
  Pick<I18nConfig, "resolveErrorMessage"> {
  return {
    messages: { ...global.messages, ...local.messages },
    resolveErrorMessage: (error) => local.resolveErrorMessage?.(error) ?? global.resolveErrorMessage?.(error),
    environmentWarnings: { ...global.environmentWarnings, ...local.environmentWarnings },
  };
}
