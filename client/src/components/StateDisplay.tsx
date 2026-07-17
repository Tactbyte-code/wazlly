/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

// components/common/StateDisplay.tsx
import React from "react";
import { LucideIcon } from "lucide-react";

interface StateDisplayProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  variant?: "error" | "empty" | "info";
  iconClassName?: string;
  buttonClassName?: string;
}

export function StateDisplay({
  icon: Icon,
  title,
  description,
  buttonText,
  onButtonClick,
  variant = "info",
  iconClassName,
  buttonClassName,
}: StateDisplayProps) {
  // Variant-based styling
  const variantStyles = {
    error: {
      border: "border-red-100",
      iconBg: "bg-red-50",
      iconColor: iconClassName || "text-red-500",
      button: buttonClassName || "bg-red-600 hover:bg-red-700",
    },
    empty: {
      border: "border-gray-200",
      iconBg: "bg-gray-100",
      iconColor: iconClassName || "text-gray-400",
      button: buttonClassName || "bg-green-600 hover:bg-green-700",
    },
    info: {
      border: "border-blue-100",
      iconBg: "bg-blue-50",
      iconColor: iconClassName || "text-blue-500",
      button: buttonClassName || "bg-blue-600 hover:bg-blue-700",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 bg-white rounded-lg border ${styles.border}`}
    >
      {/* Icon */}
      <div
        className={`w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center mb-4`}
      >
        <Icon className={`w-8 h-8 ${styles.iconColor}`} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-500 text-center max-w-md mb-6">
          {description}
        </p>
      )}

      {/* Button */}
      {buttonText && onButtonClick && (
        <button
          onClick={onButtonClick}
          className={`px-5 py-2.5 text-white rounded-lg transition-colors text-sm font-medium ${styles.button}`}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}
