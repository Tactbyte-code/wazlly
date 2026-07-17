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

import React, { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const VerifyEmail = () => {
  const [location, setLocation] = useLocation();

  const searchParams = new URLSearchParams(window.location.search);
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOtpChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const value = e.target.value.replace(/\D/, "");
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await apiRequest("POST", "/api/users/verifyEmail", {
        email,
        otpCode,
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Invalid OTP");
        setLoading(false);
        return;
      }

      setSuccess("Email verified successfully!");
      setTimeout(() => setLocation("/dashboard"), 1500);
    } catch (err) {
      setError("Verification failed, try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-md rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-4">
          Verify Your Email
        </h2>
        <p className="text-gray-600 text-center mb-6">
          A 6-digit code was sent to: <br />
          <span className="font-semibold">{email}</span>
        </p>

        <div className="flex justify-between mb-4">
          {otp.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(e, i)}
              className="w-12 h-12 border rounded-lg text-center text-xl focus:ring-2 focus:ring-green-500"
            />
          ))}
        </div>

        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-2">{success}</p>}

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full bg-green-600 text-white p-3 rounded-lg"
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
