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

// components/common/MinimalLoader.tsx
import React, { useEffect } from "react";

interface MinimalLoaderProps {
  onComplete?: () => void;
  duration?: number;
  color?: string;
  variant?: "spinner" | "pulse" | "dots" | "ring" | "dual";
}

const MinimalLoader: React.FC<MinimalLoaderProps> = ({
  onComplete,
  duration = 2000,
  color = "green",
  variant = "spinner",
}) => {
  useEffect(() => {
    if (onComplete && duration > 0) {
      const timer = setTimeout(() => {
        onComplete();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [onComplete, duration]);

  const colorClasses = {
    green: {
      primary: "border-green-600",
      secondary: "bg-green-600",
      gradient: "from-green-400 to-emerald-600",
    },
    blue: {
      primary: "border-blue-600",
      secondary: "bg-blue-600",
      gradient: "from-blue-400 to-indigo-600",
    },
    gray: {
      primary: "border-gray-600",
      secondary: "bg-gray-600",
      gradient: "from-gray-400 to-gray-600",
    },
  };

  const colors =
    colorClasses[color as keyof typeof colorClasses] || colorClasses.green;

  // Variant 1: Enhanced Spinner with Gradient
  if (variant === "spinner") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
        <div className="relative">
          {/* Outer ring with glow */}
          <div className="absolute inset-0 blur-xl opacity-30">
            <div
              className={`w-20 h-20 border-4 ${colors.primary} rounded-full animate-spin`}
            />
          </div>

          {/* Main spinner */}
          <div
            className={`w-20 h-20 border-4 border-t-transparent ${colors.primary} rounded-full animate-spin`}
            style={{ animationDuration: "0.8s" }}
          />

          {/* Inner dot */}
          <div
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 ${colors.secondary} rounded-full animate-pulse`}
          />
        </div>
      </div>
    );
  }

  // Variant 2: Pulsing Circles
  if (variant === "pulse") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
        <div className="relative w-24 h-24">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`absolute inset-0 ${colors.secondary} rounded-full opacity-20 animate-ping`}
              style={{
                animationDelay: `${i * 0.3}s`,
                animationDuration: "1.5s",
              }}
            />
          ))}
          <div
            className={`absolute inset-0 m-auto w-12 h-12 ${colors.secondary} rounded-full`}
          />
        </div>
      </div>
    );
  }

  // Variant 3: Bouncing Dots
  if (variant === "dots") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
        <div className="flex space-x-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 ${colors.secondary} rounded-full animate-bounce`}
              style={{
                animationDelay: `${i * 0.15}s`,
                animationDuration: "0.6s",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Variant 4: Ring Loader
  if (variant === "ring") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
        <div className="relative w-20 h-20">
          <div
            className={`absolute inset-0 border-4 border-gray-200 rounded-full`}
          />
          <div
            className={`absolute inset-0 border-4 border-t-transparent ${colors.primary} rounded-full animate-spin`}
            style={{ animationDuration: "1s" }}
          />
          <div
            className={`absolute inset-2 border-4 border-b-transparent ${colors.primary} opacity-50 rounded-full animate-spin`}
            style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
          />
        </div>
      </div>
    );
  }

  // Variant 5: Dual Ring (Default Enhanced)
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
      <div className="relative">
        {/* Glow effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} rounded-full blur-2xl opacity-20 animate-pulse`}
        />

        {/* Outer ring */}
        <div
          className={`w-24 h-24 border-[6px] border-t-transparent border-r-transparent ${colors.primary} rounded-full animate-spin`}
          style={{ animationDuration: "1.2s" }}
        />

        {/* Inner ring counter-rotating */}
        <div
          className={`absolute inset-0 m-4 border-[6px] border-b-transparent border-l-transparent ${colors.primary} opacity-40 rounded-full animate-spin`}
          style={{ animationDuration: "0.8s", animationDirection: "reverse" }}
        />

        {/* Center dot with pulse */}
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-gradient-to-r ${colors.gradient} rounded-full animate-pulse shadow-lg`}
        />
      </div>
    </div>
  );
};

export default MinimalLoader;
