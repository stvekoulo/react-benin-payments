"use client";

import { useFedaPay } from "../hooks/useFedaPay";
import type { UseFedaPayConfig } from "../hooks/useFedaPay";
import type { PaymentValidationError } from "../types/validation";
import type { ReactNode } from "react";
import type { BeninPaymentAnalyticsHandler } from "../utils/analytics";

export interface FedaPayRenderProps {
  open: () => void;
  loading: boolean;
  error: Error | null;
  scriptLoaded: boolean;
  isVerifying: boolean;
  isPreparing: boolean;
}

export interface FedaPayConsumerProps {
  config: UseFedaPayConfig;
  debug?: boolean;
  onBeforePayment?: () => void | boolean | Promise<void | boolean>;
  onAnalyticsEvent?: BeninPaymentAnalyticsHandler;
  onPaymentError?: (error: PaymentValidationError) => void;
  children: (props: FedaPayRenderProps) => ReactNode;
}

export function FedaPayConsumer({
  config,
  debug = false,
  onBeforePayment,
  onAnalyticsEvent,
  onPaymentError,
  children,
}: FedaPayConsumerProps): ReactNode {
  const { openDialog, loading, error, scriptLoaded, isVerifying, isPreparing } = useFedaPay(config, {
    debug,
    onBeforePayment,
    onAnalyticsEvent,
    onError: onPaymentError,
  });

  return children({
    open: openDialog,
    loading,
    error,
    scriptLoaded,
    isVerifying,
    isPreparing,
  });
}
