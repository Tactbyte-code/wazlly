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

import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { SubscriptionResponse } from "@/types/types";
import { useQuery } from "@tanstack/react-query";
import { Crown, Check } from "lucide-react";
import { useLocation } from "wouter";

export function AdminCreditBox() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: activeplandata, isLoading } = useQuery<SubscriptionResponse>({
    queryKey: [`api/subscriptions/user/${user?.id}`],
    queryFn: () =>
      apiRequest("GET", `api/subscriptions/user/${user?.id}`).then((res) =>
        res.json()
      ),
    enabled: !!user?.id,
  });

  const activePlans =
    activeplandata?.data?.filter((p) => p.subscription.status === "active") ||
    [];

  const hasActivePlan = activePlans.length > 0;

  const totalPermissions: Record<string, string | number> = {};
  activePlans.forEach((plan) => {
    const permissions = plan.subscription.planData?.permissions || {};
    Object.keys(permissions).forEach((key) => {
      const val = permissions[key];
      if (String(val).toLowerCase() === "unlimited") {
        totalPermissions[key] = "Unlimited";
      } else if (totalPermissions[key] !== "Unlimited") {
        totalPermissions[key] = (Number(totalPermissions[key]) || 0) + (Number(val) || 0);
      }
    });
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 animate-pulse h-28" />
    );
  }

  const handleClick = () => {
    if (hasActivePlan) {
      setLocation("/settings?tab=billing");
    } else {
      setLocation("/plan-upgrade");
    }
  };

  return (
    <div
      onClick={handleClick}
      className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50/50 to-purple-50/50 p-3 shadow-sm hover:shadow-md hover:border-green-300 transition-all cursor-pointer"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 bg-yellow-100 rounded">
            <Crown className="h-3 w-3 text-yellow-600" />
          </div>
          <span className="text-xs font-semibold text-gray-800">Plan</span>
        </div>

        {hasActivePlan ? (
          <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
            PRO
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-blue-600 hover:underline">
            Upgrade
          </span>
        )}
      </div>

      <div className="space-y-1">
        {hasActivePlan ? (
          Object.entries(totalPermissions)
            .slice(0, 3)
            .map(([key, value], idx) => (
              <div key={key} className="flex items-center gap-1.5">
                <Check
                  className={`w-2.5 h-2.5 flex-shrink-0 ${
                    idx % 2 === 0 ? "text-blue-600" : "text-purple-600"
                  }`}
                />
                <span className="text-[10px] text-gray-700">
                  <span className="font-semibold">{value}</span>{" "}
                  <span className="text-gray-500 capitalize">{key}</span>
                </span>
              </div>
            ))
        ) : (
          <p className="text-[10px] text-gray-500 text-center py-2">
            No active plan
          </p>
        )}
      </div>
    </div>
  );
}
