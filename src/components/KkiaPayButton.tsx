

"use client";

import React, { forwardRef } from "react";
import { useKkiaPay } from "../hooks/useKkiaPay";
import type { UseKkiaPayConfig } from "../hooks/useKkiaPay";
import type { KkiaPaySuccessResponse, KkiaPayFailedResponse } from "../types";
import type { PaymentValidationError } from "../types/validation";
import type { BeninPaymentAnalyticsHandler } from "../utils/analytics";

export interface KkiaPayButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  config: UseKkiaPayConfig;
  onSuccess?: (data: KkiaPaySuccessResponse) => void;
  onFailed?: (data: KkiaPayFailedResponse) => void;
  onPaymentClose?: () => void;
  onValidationError?: (error: PaymentValidationError) => void;
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
  verifyUrl?: string;
  customVerifyHeaders?: Record<string, string>;
}

export const KkiaPayButton = forwardRef<HTMLButtonElement, KkiaPayButtonProps>(
  (
    {
      config,
      onSuccess,
      onFailed,
      onPaymentClose,
      onValidationError,
      text = "Payer",
      loadingText = "Chargement...",
      verifyingText = "Vérification...",
      debug = false,
      onBeforePayment,
      onAnalyticsEvent,
      verifyUrl,
      customVerifyHeaders,
      children,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const { openKkiapay, loading, scriptLoaded, isVerifying, isPreparing } = useKkiaPay({
      debug,
      onBeforePayment,
      onAnalyticsEvent,
      onSuccess,
      onFailed,
      onClose: onPaymentClose,
      onValidationError,
      verifyUrl,
      customVerifyHeaders,
    });

    const isDisabled = disabled || loading || !scriptLoaded || isVerifying || isPreparing;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      openKkiapay(config);
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

KkiaPayButton.displayName = "KkiaPayButton";
