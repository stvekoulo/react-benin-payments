"use client";

import React from "react";
import type { TransactionStatus } from "../hooks/usePaymentStatus";

export interface PaymentStatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** Le statut de la transaction à afficher */
  status: TransactionStatus;
  /** Surcharge des libellés par défaut pour chaque statut */
  labels?: Partial<Record<TransactionStatus, React.ReactNode>>;
  /** Surcharge des classes CSS spécifiques par statut (ex: Tailwind) */
  statusClasses?: Partial<Record<TransactionStatus, string>>;
  /** Si true, aucun style en ligne par défaut ne sera appliqué (Headless) */
  unstyled?: boolean;
}

const DEFAULT_LABELS: Record<TransactionStatus, string> = {
  pending: "En attente",
  approved: "Approuvé",
  declined: "Refusé",
  cancelled: "Annulé",
  unknown: "Inconnu",
};

const DEFAULT_STYLES: Record<TransactionStatus, React.CSSProperties> = {
  pending: { backgroundColor: "#fef3c7", color: "#d97706" }, // Amber
  approved: { backgroundColor: "#d1fae5", color: "#059669" }, // Emerald
  declined: { backgroundColor: "#fee2e2", color: "#dc2626" }, // Red
  cancelled: { backgroundColor: "#f3f4f6", color: "#4b5563" }, // Gray
  unknown: { backgroundColor: "#e5e7eb", color: "#374151" }, // Gray
};

const BASE_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.25rem 0.75rem",
  borderRadius: "9999px",
  fontSize: "0.875rem",
  fontWeight: 500,
  lineHeight: 1,
};

/**
 * Composant visuel permettant d'afficher le statut d'un paiement.
 * 
 * Il intègre des couleurs et libellés par défaut (en français) pour chaque statut.
 * Peut être utilisé en mode "Headless" (`unstyled={true}`) pour laisser 
 * votre propre framework CSS (comme Tailwind) gérer le visuel via `statusClasses`.
 * 
 * @example
 * // Mode par défaut (styles en ligne injectés)
 * <PaymentStatusBadge status="approved" />
 * 
 * @example
 * // Mode Headless avec Tailwind CSS
 * <PaymentStatusBadge 
 *   status="pending" 
 *   unstyled 
 *   className="px-3 py-1 rounded-full text-sm font-medium"
 *   statusClasses={{
 *     pending: "bg-yellow-100 text-yellow-800",
 *     approved: "bg-green-100 text-green-800"
 *   }}
 * />
 */
export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  status,
  labels,
  statusClasses,
  unstyled = false,
  className,
  style,
  ...rest
}) => {
  const label = labels?.[status] ?? DEFAULT_LABELS[status];

  const computedStyle: React.CSSProperties = unstyled
    ? { ...style }
    : { ...BASE_STYLE, ...DEFAULT_STYLES[status], ...style };

  const combinedClassName =
    [className, statusClasses?.[status]].filter(Boolean).join(" ") || undefined;

  return (
    <span
      className={combinedClassName}
      style={Object.keys(computedStyle).length > 0 ? computedStyle : undefined}
      data-status={status}
      data-testid="payment-status-badge"
      {...rest}
    >
      {label}
    </span>
  );
};
