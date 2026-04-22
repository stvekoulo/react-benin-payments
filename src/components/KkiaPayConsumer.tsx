"use client";

import { useKkiaPay } from "../hooks/useKkiaPay";
import type { UseKkiaPayConfig } from "../hooks/useKkiaPay";
import type { KkiaPaySuccessResponse, KkiaPayFailedResponse } from "../types";
import type { PaymentValidationError } from "../types/validation";
import type { ReactNode } from "react";
import type { BeninPaymentAnalyticsHandler } from "../utils/analytics";

export interface KkiaPayRenderProps {
  open: (config: UseKkiaPayConfig) => void;
  loading: boolean;
  error: Error | null;
  scriptLoaded: boolean;
  isVerifying: boolean;
  isPreparing: boolean;
}

export interface KkiaPayConsumerProps {
  debug?: boolean;
  onSuccess?: (data: KkiaPaySuccessResponse) => void;
  onFailed?: (data: KkiaPayFailedResponse) => void;
  onClose?: () => void;
  onBeforePayment?: () => void | boolean | Promise<void | boolean>;
  onAnalyticsEvent?: BeninPaymentAnalyticsHandler;
  onValidationError?: (error: PaymentValidationError) => void;
  verifyUrl?: string;
  customVerifyHeaders?: Record<string, string>;
  children: (props: KkiaPayRenderProps) => ReactNode;
}

export function KkiaPayConsumer({
  debug = false,
  onSuccess,
  onFailed,
  onClose,
  onBeforePayment,
  onAnalyticsEvent,
  onValidationError,
  verifyUrl,
  customVerifyHeaders,
  children,
}: KkiaPayConsumerProps): ReactNode {
  const { openKkiapay, loading, error, scriptLoaded, isVerifying, isPreparing } = useKkiaPay({
    debug,
    onSuccess,
    onFailed,
    onClose,
    onBeforePayment,
    onAnalyticsEvent,
    onValidationError,
    verifyUrl,
    customVerifyHeaders,
  });

  return children({
    open: openKkiapay,
    loading,
    error,
    scriptLoaded,
    isVerifying,
    isPreparing,
  });
}
