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

// SignupPopupHandler.tsx - Complete Updated Component
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  X,
  MessageCircle,
  ArrowRight,
  CheckCircle,
  Zap,
  Users,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

export function SignupPopupHandler() {
  const { isAuthenticated } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Only for unauthenticated users
    if (isAuthenticated) return;

    const popupShown = sessionStorage.getItem("signupPopupShown");
    if (popupShown === "true") return;

    // Show after 30 seconds
    const timer = setTimeout(() => {
      setShowPopup(true);
      sessionStorage.setItem("signupPopupShown", "true");
    }, 30000);

    // Show on scroll
    const handleScroll = () => {
      const alreadyShown = sessionStorage.getItem("signupPopupShown");
      if (
        window.scrollY > window.innerHeight * 0.5 &&
        alreadyShown !== "true"
      ) {
        setShowPopup(true);
        sessionStorage.setItem("signupPopupShown", "true");
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isAuthenticated]);

  const handleClose = () => {
    setShowPopup(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubmitted(true);
      setTimeout(() => {
        // Redirect to signup page with email pre-filled
        window.location.href = `/signup?email=${encodeURIComponent(email)}`;
      }, 2000);
    }
  };

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title ?? "";

  // Don't show if authenticated or popup not triggered
  if (!showPopup || isAuthenticated) return null;

  // Success state
  if (isSubmitted) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="bg-green-100 p-4 rounded-full w-fit mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to {appName}!
          </h3>
          <p className="text-gray-600">
            Redirecting you to complete your registration...
          </p>
        </div>
      </div>
    );
  }

  // Main popup
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex justify-end p-2 flex-shrink-0">
          <button
            onClick={handleClose}
            aria-label="Close"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left Side - Benefits */}
            <div className="hidden md:block bg-gradient-to-br from-green-500 to-green-600 p-8 text-white">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-white/20 p-2 rounded-lg">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-xl font-bold">{appName}</span>
              </div>

              <h2 className="text-2xl font-bold mb-4">
                Start Your WhatsApp Marketing Journey
              </h2>
              <p className="text-green-100 mb-6">
                Join thousands of businesses already growing with our platform
              </p>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-1 rounded-full">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-sm">Setup in under 5 minutes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-1 rounded-full">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-sm">Free for up to 1,000 contacts</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-1 rounded-full">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-sm">300% average ROI increase</span>
                </div>
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="p-5 sm:p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Get Started Free
              </h3>
              <p className="text-gray-600 mb-6">
                No credit card required. Start sending campaigns in minutes.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your work email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center group"
                >
                  Create Free Account
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  By signing up, you agree to our{" "}
                  <a href="/terms" className="text-green-600 hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy-policy"
                    className="text-green-600 hover:underline"
                  >
                    Privacy Policy
                  </a>
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>No setup fees</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Cancel anytime</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
