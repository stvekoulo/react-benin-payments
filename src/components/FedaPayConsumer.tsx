

import { useFedaPay } from "../hooks/useFedaPay";
import type { UseFedaPayConfig } from "../hooks/useFedaPay";
import type { PaymentValidationError } from "../types/validation";
import type { ReactNode } from "react";

export interface FedaPayRenderProps {
  open: () => void;
  loading: boolean;
  error: Error | null;
  scriptLoaded: boolean;
  isVerifying: boolean;
}

export interface FedaPayConsumerProps {
  config: UseFedaPayConfig;
  debug?: boolean;
  onPaymentError?: (error: PaymentValidationError) => void;
  children: (props: FedaPayRenderProps) => ReactNode;
}

export function FedaPayConsumer({
  config,
  debug = false,
  onPaymentError,
  children,
}: FedaPayConsumerProps): ReactNode {
  const { openDialog, loading, error, scriptLoaded, isVerifying } = useFedaPay(config, {
    debug,
    onError: onPaymentError,
  });

  return children({
    open: openDialog,
    loading,
    error,
    scriptLoaded,
    isVerifying,
  });
}
