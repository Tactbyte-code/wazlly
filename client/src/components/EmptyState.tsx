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

// components/common/EmptyState.tsx
import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  iconClassName?: string;
  iconBgClassName?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  buttonText,
  onButtonClick,
  iconClassName = "w-10 h-10 text-gray-400",
  iconBgClassName = "w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-lg border border-gray-200">
      <div className={iconBgClassName}>
        <Icon className={iconClassName} />
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-gray-500 text-center max-w-md mb-6">
          {description}
        </p>
      )}

      {buttonText && onButtonClick && (
        <button
          onClick={onButtonClick}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}
