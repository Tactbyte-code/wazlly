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

import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

const UnreadCountContext = createContext<number>(0);

export function UnreadCountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["/api/conversations/unread-count"],
    queryFn: async () => {
      const response = await fetch("/api/conversations/unread-count", {
        credentials: "include",
      });
      if (!response.ok) return 0;
      const data = await response.json();
      return data.count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // refetch every 30s
    staleTime: 20000,       // consider fresh for 20s
  });

  return (
    <UnreadCountContext.Provider value={unreadCount}>
      {children}
    </UnreadCountContext.Provider>
  );
}

export function useUnreadCount() {
  return useContext(UnreadCountContext);
}
