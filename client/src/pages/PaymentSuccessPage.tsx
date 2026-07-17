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

import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Clock, ArrowRight, Download, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function PaymentSuccessPage() {
  const [location, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(3);
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const verificationAttempted = useRef(false);

  const params = new URLSearchParams(window.location.search);
  const provider = params.get("provider");
  const transactionId = params.get("transactionId") || params.get("reference") || params.get("subscription_id") || params.get("preapproval_id") || "N/A";

  useEffect(() => {
    if (verificationAttempted.current) return;
    if (!provider || provider === "razorpay") {
      setVerified(true);
      return;
    }

    verificationAttempted.current = true;
    setVerifying(true);

    const verifyPayment = async () => {
      try {
        let endpoint = "";
        let body: Record<string, string> = {};

        if (provider === "stripe") {
          endpoint = "/api/payment/verify/stripe";
          body = {
            transactionId: params.get("transactionId") || "",
            subscription_id: params.get("subscription_id") || "",
            payment_intent_id: params.get("payment_intent") || "",
            setup_intent_id: params.get("setup_intent") || "",
            session_id: params.get("session_id") || "",
          };
        } else if (provider === "paypal") {
          const subscriptionId = params.get("subscription_id") || "";
          endpoint = "/api/payment/verify/paypal";
          body = { subscription_id: subscriptionId };
        } else if (provider === "paystack") {
          const reference = params.get("reference") || params.get("trxref") || "";
          endpoint = "/api/payment/verify/paystack";
          body = { reference };
        } else if (provider === "mercadopago") {
          const preapprovalId = params.get("preapproval_id") || "";
          endpoint = "/api/payment/verify/mercadopago";
          body = { preapproval_id: preapprovalId };
        }

        if (endpoint) {
          const response = await apiRequest("POST", endpoint, body);
          const data = await response.json();
          if (data.success) {
            setVerified(true);
          } else {
            setVerificationError(data.message || "Payment verification failed");
          }
        } else {
          setVerified(true);
        }
      } catch (err: any) {
        setVerificationError(err.message || "Payment verification failed");
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [provider]);

  useEffect(() => {
    if (!verified || verifying) return;
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setLocation("/dashboard");
    }
  }, [countdown, setLocation, verified, verifying]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4">
        <Card className="w-full max-w-md shadow-2xl overflow-hidden">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we confirm your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
        <Card className="w-full max-w-md shadow-2xl overflow-hidden">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{verificationError}</p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setLocation("/plans")} className="w-full">
                Back to Plans
              </Button>
              <Button onClick={() => setLocation("/dashboard")} variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 p-6 text-white text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            🎉 Payment Successful!
          </h1>
          <p className="text-green-100 text-lg">
            Your subscription is now active
          </p>
        </div>

        <CardContent className="p-6 sm:p-8">
          {/* Countdown Timer */}
          <div className="mb-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-center justify-center gap-3 text-blue-800">
              <Clock className="w-6 h-6 animate-pulse" />
              <p className="text-base font-medium">
                Redirecting to dashboard in{" "}
                <span className="text-3xl font-bold text-blue-600 inline-block min-w-[40px]">
                  {countdown}
                </span>{" "}
                {countdown === 1 ? "second" : "seconds"}
              </p>
            </div>
            {/* Progress Bar */}
            <div className="mt-3 w-full bg-blue-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${((8 - countdown) / 8) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-6 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Payment Details
              </h3>
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600">Status</span>
                  <span className="font-semibold text-green-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Confirmed
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">Transaction ID</span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded-lg text-xs font-mono text-gray-700 border break-all">
                      {transactionId}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(transactionId);
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Unlocked */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ✨ Features Unlocked
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "Unlimited contacts",
                  "WhatsApp channels",
                  "Advanced automation",
                  "Priority support",
                  "Analytics dashboard",
                  "API access",
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Confirmation Message */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Confirmation Email Sent
                </p>
                <p className="text-xs text-blue-700">
                  A confirmation email with your receipt has been sent to your
                  registered email address.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={() => setLocation("/dashboard")}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              Go to Dashboard Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Receipt
            </Button>
          </div>

          {/* Skip Countdown Link */}
          <div className="text-center mt-4">
            <button
              onClick={() => setLocation("/dashboard")}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Skip waiting and go now →
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-center text-xs text-gray-500 mt-6">
            Need help?{" "}
            <a
              href="/support"
              className="text-blue-600 hover:underline font-medium"
            >
              Contact Support
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
