

import React, { forwardRef } from "react";
import { useFedaPay } from "../hooks/useFedaPay";
import type { UseFedaPayConfig } from "../hooks/useFedaPay";
import type { PaymentValidationError } from "../types/validation";

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
      onPaymentError,
      children,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const { openDialog, loading, scriptLoaded, isVerifying } = useFedaPay(config, {
      debug,
      onError: onPaymentError,
    });

    const isDisabled = disabled || loading || !scriptLoaded || isVerifying;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      openDialog();
      props.onClick?.(e);
    };

    const getButtonText = () => {
      if (loading) return loadingText;
      if (isVerifying) return verifyingText;
      return children ?? text;
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
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
