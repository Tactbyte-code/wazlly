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

import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ResetPassword from "@/components/ResetPassword";
import VerifyOtp from "@/components/VerifyOtp";
import ForgotPasswordEmail from "@/components/ForgotPasswordEmail";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  MessageSquare,
  User,
  Lock,
  Eye,
  EyeOff,
  Zap,
  BarChart3,
  Shield,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { AppSettings } from "@/types/types";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),

});

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [step, setStep] = useState<"login" | "forgot" | "verify" | "reset">(
    "login"
  );
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      console.log(data);
      const response = await apiRequest("POST", "/api/auth/login", data);

      let json: any;
      try {
        json = await response.json();
      } catch {
        json = {};
      }

      if (!response.ok) {
        throw new Error(json?.error || "Login failed. Please try again.");
      }

      return json;
    },
    onSuccess: () => {
      try {
        sessionStorage.setItem("fromLogin", "true");
      } catch (e) {
        console.error("Failed to set sessionStorage:", e);
      }

      // Now redirect
      window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      console.log("error", error);
      let errorMessage = error?.message || "Login failed. Please try again.";

      if (error.message.includes("401")) {
        errorMessage = "Invalid username or password";
      } else if (error.message.includes("403")) {
        errorMessage = "Account is inactive. Please contact administrator.";
      }

      setError(errorMessage);
    },
  });
  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setError(null);

    loginMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
  };

  const features = [
    {
      icon: Zap,
      title: "Instant Campaigns",
      description: "Launch WhatsApp campaigns in minutes",
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Track delivery, reads, and engagement",
    },
    {
      icon: Users,
      title: "Contact Management",
      description: "Organize and segment your audience",
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "GDPR compliant with enterprise security",
    },
  ];

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-green-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white w-full">
          <div className="mb-10">
            {brandSettings?.logo ? (
              <img
                src={brandSettings?.logo}
                alt="Logo"
                className="h-12 object-contain brightness-0 invert"
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 backdrop-blur-sm rounded-xl p-2.5">
                  <MessageSquare className="h-7 w-7 text-green-400" />
                </div>
                <span className="text-2xl font-bold">WhatsWay</span>
              </div>
            )}
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Power your business with WhatsApp Marketing
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Reach your customers where they are. Drive engagement, boost sales, and build relationships.
          </p>

          <div className="space-y-5">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="bg-green-500/10 rounded-lg p-2.5 shrink-0">
                  <feature.icon className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:hidden mb-6">
              {brandSettings?.logo ? (
                <img
                  src={brandSettings?.logo}
                  alt="Logo"
                  className="h-14 object-contain"
                />
              ) : (
                <div className="bg-slate-800 text-white rounded-full p-3">
                  <MessageSquare className="h-8 w-8" />
                </div>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {step === "login" && "Welcome Back"}
              {step === "forgot" && "Forgot Password"}
              {step === "verify" && "Verify OTP"}
              {step === "reset" && "Reset Password"}
            </h1>
            <p className="mt-1.5 text-gray-500">
              {step === "login" && "Sign in to your WhatsApp marketing dashboard"}
              {step === "forgot" && "Enter your email to receive a reset code"}
              {step === "verify" && "Enter the code sent to your email"}
              {step === "reset" && "Create a new secure password"}
            </p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6 pb-6 px-6">
              {step === "login" && (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                {...field}
                                placeholder="Enter your username"
                                autoComplete="username"
                                autoFocus
                                className="pl-10"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                className="pl-10 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                        onClick={() => setStep("forgot")}
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 h-11 text-base"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              {step === "forgot" && (
                <ForgotPasswordEmail
                  onEmailSent={(sentEmail) => {
                    setEmail(sentEmail);
                    setStep("verify");
                  }}
                  onBack={() => setStep("login")}
                />
              )}

              {step === "verify" && (
                <VerifyOtp
                  email={email}
                  onVerified={(otp) => {
                    setOtpCode(otp);
                    setStep("reset");
                  }}
                />
              )}

              {step === "reset" && (
                <ResetPassword
                  email={email}
                  otpCode={otpCode}
                  onReset={() => setStep("login")}
                />
              )}

              {step === "login" && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{" "}
                    <Link
                      to="/signup"
                      className="text-green-600 hover:text-green-700 font-semibold"
                    >
                      Sign up for free
                    </Link>
                  </p>
                </div>
              )}

            </CardContent>
          </Card>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Secure Login</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
