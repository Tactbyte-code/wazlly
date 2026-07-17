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

import { createContext, useContext, ReactNode, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { AppSettings, CountryCurrency, SubscriptionResponse } from "@/types/types";

interface User {
  createdBy: any;
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: string;
  permissions: string[];
  avatar?: string;
  createdAt?: string;
  
}

interface BrandSettings {
  title: string;
  tagline: string;
  currency: string;
  country: string;
  logo: string;
  favicon: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isBrandSettingsLoading: boolean;
  currency: string; // Direct access to currency
  logout: () => void;
  currencySymbol: string | undefined;
  userPlans: any[];  
  isUserPlansLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          throw new Error("Failed to fetch user");
        }
        return response.json();
      } catch (error) {
        console.error("Auth check failed:", error);
        return null;
      }
    },
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: !isLoggedOut,
  });


const {
    data: userPlans,
    isLoading: isUserPlansLoading
  } = useQuery<SubscriptionResponse>({
    queryKey: [`api/subscriptions/user/${user?.id}`],
    queryFn: () =>
      apiRequest("GET", `api/subscriptions/user/${user?.id}`).then((res) =>
        res.json()
      ),
    enabled: !!user?.id,
  });


  // Brand Settings Query
  const { data: brandSettings, isLoading: isBrandSettingsLoading } =
    useQuery<AppSettings>({
      queryKey: ["/api/brand-settings"],
      queryFn: async () => {
        const response = await fetch("/api/brand-settings");
        if (!response.ok) {
          throw new Error("Failed to fetch brand settings");
        }
        return response.json();
      },
      staleTime: 5 * 60 * 1000,
      retry: 1,
    });

  const { data: countryCurrency } = useQuery<CountryCurrency[]>({
    queryKey: ["/api/auth/country-data"],
    queryFn: async () => {
      const response = await fetch("/api/auth/country-data");
      if (!response.ok) {
        throw new Error("Failed to fetch country data");
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const getCurrencyByCode = () => {
    return countryCurrency?.find(
      (item) => item.currency_code === brandSettings?.currency
    );
  };

  const currency = getCurrencyByCode();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      setIsLoggedOut(true);
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      setLocation("/");
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user,

        isBrandSettingsLoading,
        currency: brandSettings?.currency || "INR",
        currencySymbol: currency?.symbol,
        logout,
        userPlans: userPlans || [],
        isUserPlansLoading,

      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
