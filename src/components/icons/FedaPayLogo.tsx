"use client";

import React from "react";

/**
 * FedaPay logo SVG component.
 * 
 * Customizable via standard SVG props (width, height, fill, className, etc.)
 * Uses `currentColor` for text, allowing color inheritance from parent.
 * 
 * @example
 * ```tsx
 * import { FedaPayLogo } from "react-benin-payments";
 * 
 * // Default size
 * <FedaPayLogo />
 * 
 * // Custom size and color
 * <FedaPayLogo width={80} height={28} className="text-green-600" />
 * ```
 */
export function FedaPayLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 40"
      width="120"
      height="40"
      fill="currentColor"
      aria-label="FedaPay"
      role="img"
      {...props}
    >
      <rect x="2" y="8" width="24" height="24" rx="4" fill="#0AB67A" />
      <path
        d="M8 16h12M8 20h8M8 24h10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x="32"
        y="26"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="currentColor"
      >
        FedaPay
      </text>
    </svg>
  );
}
