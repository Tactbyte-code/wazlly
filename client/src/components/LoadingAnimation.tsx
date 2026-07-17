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

import React from "react";
import {
  MessageCircle,
  Zap,
  Users,
  TrendingUp,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

interface LoadingAnimationProps {
  onComplete?: () => void;
  size?: "sm" | "md" | "lg";
  color?: "green" | "white" | "blue";
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  onComplete,
  size = "lg",
  color = "green",
}) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [progress, setProgress] = React.useState(0);

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const steps = [
    {
      text: "Initializing WhatsApp Marketing Platform...",
      icon: MessageCircle,
    },
    { text: "Loading Campaign Builder...", icon: Zap },
    { text: "Setting up Analytics Dashboard...", icon: TrendingUp },
    { text: "Preparing Contact Management...", icon: Users },
    { text: "Ready to Scale Your Business!", icon: CheckCircle },
  ];

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
        setProgress((prev) => prev + 20);
      } else {
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          }
        }, 1000);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [currentStep, steps.length, onComplete]);

  // Small loading spinner for buttons
  if (size === "sm") {
    return (
      <div
        className={`animate-spin rounded-full border-2 border-t-transparent ${
          size === "sm" ? "w-4 h-4" : "w-6 h-6"
        } ${
          color === "white"
            ? "border-white"
            : color === "blue"
            ? "border-blue-600"
            : "border-green-600"
        }`}
      ></div>
    );
  }

  // Medium loading spinner
  if (size === "md") {
    return (
      <div
        className={`animate-spin rounded-full border-2 border-t-transparent w-6 h-6 ${
          color === "white"
            ? "border-white"
            : color === "blue"
            ? "border-blue-600"
            : "border-green-600"
        }`}
      ></div>
    );
  }

  // Full page loading animation - WHITE MODE
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-white via-gray-50 to-white flex items-center justify-center z-50">
      {/* Animated Gradient Background - LIGHT VERSION */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      </div>

      {/* Light Overlay for Better Contrast */}
      <div className="absolute inset-0 bg-white opacity-30 backdrop-blur-sm"></div>

      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        {/* Logo with Enhanced Animation */}
        <div className="flex items-center justify-center space-x-3 mb-12">
          {brandSettings?.logo ? (
            <img
              src={brandSettings?.logo}
              alt="Logo"
              className="h-12  object-contain animate-bounce"
            />
          ) : (
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-4 rounded-2xl shadow-2xl ">
              <MessageCircle
                className="w-10 h-10 text-white"
                strokeWidth={1.5}
              />
            </div>
          )}
        </div>

        {/* Floating Messages Animation */}
        <div className="relative mb-12 h-40 perspective">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`absolute bg-white p-4 rounded-3xl shadow-xl border border-gray-200 backdrop-blur-md ${
                i === 0
                  ? "left-0 top-0 animation-delay-0"
                  : i === 1
                  ? "right-0 top-6 animation-delay-1000"
                  : "left-1/2 transform -translate-x-1/2 top-12 animation-delay-2000"
              }`}
              style={{
                animation: `float 3s ease-in-out infinite`,
                animationDelay: `${i * 1}s`,
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">
                  {i === 0
                    ? "Campaign sent! ✓"
                    : i === 1
                    ? "Message delivered ✓"
                    : "Customer engaged ✓"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Loading Step with Icon Animation */}
        <div className="mb-8 bg-white bg-opacity-60 backdrop-blur-md p-6 rounded-2xl border border-gray-200 shadow-lg">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-3 rounded-xl shadow-lg">
              {React.createElement(steps[currentStep].icon, {
                className: "w-7 h-7 text-white animate-pulse",
                strokeWidth: 1.5,
              })}
            </div>
            <span className="text-lg font-semibold text-gray-800 drop-shadow-lg">
              {steps[currentStep].text}
            </span>
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-6 backdrop-blur-sm border border-gray-300 shadow-md overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-400 via-emerald-500 to-blue-500 h-3 rounded-full transition-all duration-800 ease-out shadow-lg shadow-green-400/50"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Status Text */}
        <p className="text-base font-medium text-gray-700 drop-shadow-lg">
          Setting up your WhatsApp marketing platform...
        </p>

        {/* Loading Dots */}
        <div className="flex justify-center space-x-2 mt-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.2}s`,
              }}
            ></div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animation-delay-0 {
          animation-delay: 0s;
        }

        .animation-delay-1000 {
          animation-delay: 1s;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .perspective {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
};

export default LoadingAnimation;
