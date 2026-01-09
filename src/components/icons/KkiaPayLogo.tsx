"use client";

import React from "react";

/**
 * KKiaPay logo SVG component.
 * 
 * Customizable via standard SVG props (width, height, fill, className, etc.)
 * Uses `currentColor` for text, allowing color inheritance from parent.
 * 
 * @example
 * ```tsx
 * import { KkiaPayLogo } from "react-benin-payments";
 * 
 * // Default size
 * <KkiaPayLogo />
 * 
 * // Custom size and color
 * <KkiaPayLogo width={80} height={28} className="text-blue-600" />
 * ```
 */
export function KkiaPayLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 40"
      width="120"
      height="40"
      fill="currentColor"
      aria-label="KkiaPay"
      role="img"
      {...props}
    >
      <circle cx="14" cy="20" r="12" fill="#4E6BFF" />
      <path
        d="M10 15l4 5-4 5M14 20h6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text
        x="32"
        y="26"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="currentColor"
      >
        KkiaPay
      </text>
    </svg>
  );
}
