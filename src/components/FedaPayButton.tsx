"use client";

import React, { forwardRef } from "react";
import { useFedaPay } from "../hooks/useFedaPay";
import type { UseFedaPayConfig } from "../hooks/useFedaPay";
import type { PaymentValidationError } from "../types/validation";
import type { BeninPaymentAnalyticsHandler } from "../utils/analytics";

export interface FedaPayButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  config: UseFedaPayConfig;
  /** @default "Payer" */
  text?: string;
  /** @default "Chargement..." */
  loadingText?: string;
  /** @default "Vérification..." */
  verifyingText?: string;
  /** @default false */
  debug?: boolean;
  onBeforePayment?: () => void | boolean | Promise<void | boolean>;
  onAnalyticsEvent?: BeninPaymentAnalyticsHandler;
  onPaymentError?: (error: PaymentValidationError) => void;
}

export const FedaPayButton = forwardRef<HTMLButtonElement, FedaPayButtonProps>(
  (
    {
      config,
      text = "Payer",
      loadingText = "Chargement...",
      verifyingText = "Vérification...",
      debug = false,
      onBeforePayment,
      onAnalyticsEvent,
      onPaymentError,
      children,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const { openDialog, loading, scriptLoaded, isVerifying, isPreparing } = useFedaPay(config, {
      debug,
      onBeforePayment,
      onAnalyticsEvent,
      onError: onPaymentError,
    });

    const isDisabled = disabled || loading || !scriptLoaded || isVerifying || isPreparing;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      openDialog();
      props.onClick?.(e);
    };

    const getButtonText = () => {
      if (loading || isPreparing) return loadingText;
      if (isVerifying) return verifyingText;
      return children ?? text;
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        aria-busy={loading || isVerifying || isPreparing}
        onClick={handleClick}
        style={{ cursor: isDisabled ? "not-allowed" : "pointer", ...style }}
        {...props}
      >
        {getButtonText()}
      </button>
    );
  }
);

FedaPayButton.displayName = "FedaPayButton";
