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

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface SiteContextType {
  selectedSiteId: string | null;
  setSelectedSiteId: (siteId: string | null) => void;
  sites: any[];
  isLoadingSites: boolean;
  sitesError: Error | null;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(() => {
    // Load from localStorage on mount
    return localStorage.getItem("selectedSiteId") || null;
  });

  const [tenantId, setTenantId] = useState<string | null>(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.tenantId || null;
  });
  const previousTenantId = useRef<string | null>(tenantId);

  // Watch for localStorage changes to update tenantId reactively
  useEffect(() => {
    const checkTenant = () => {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const currentTenantId = user.tenantId || null;
      if (currentTenantId !== tenantId) {
        setTenantId(currentTenantId);
      }
    };

    // Check on interval (simple but effective for MVP)
    const interval = setInterval(checkTenant, 1000);
    return () => clearInterval(interval);
  }, [tenantId]);

  // Fetch sites in the provider with tenant-scoped query key
  const { data: sites = [], isLoading: isLoadingSites, error: sitesError } = useQuery<any[]>({
    queryKey: ["/api/sites", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const token = localStorage.getItem("token");
      const res = await fetch("/api/sites", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
      });
      
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return [];
      }
      
      if (!res.ok) {
        throw new Error(`Failed to fetch sites: ${res.statusText}`);
      }
      
      return await res.json();
    },
    enabled: !!tenantId,
  });

  // Auto-select first site when sites load or clear if no sites
  useEffect(() => {
    if (sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(sites[0].id);
    } else if (sites.length === 0 && selectedSiteId) {
      // Clear stale site ID when tenant has no sites
      setSelectedSiteId(null);
      localStorage.removeItem("selectedSiteId");
    }
  }, [sites, selectedSiteId]);

  // Clear selected site if it no longer exists in the sites list
  useEffect(() => {
    if (selectedSiteId && sites.length > 0) {
      const siteExists = sites.some(site => site.id === selectedSiteId);
      if (!siteExists) {
        setSelectedSiteId(sites[0]?.id || null);
      }
    }
  }, [selectedSiteId, sites]);

  // Persist to localStorage whenever it changes
  useEffect(() => {
    if (selectedSiteId) {
      localStorage.setItem("selectedSiteId", selectedSiteId);
    } else {
      localStorage.removeItem("selectedSiteId");
    }
  }, [selectedSiteId]);

  // Clear selectedSiteId when tenant changes (same-tab detection with ref)
  useEffect(() => {
    // Check if tenant changed from previous render
    if (previousTenantId.current && tenantId && previousTenantId.current !== tenantId) {
      setSelectedSiteId(null);
      localStorage.removeItem("selectedSiteId");
      // Clear cached sites for previous tenant
      queryClient.removeQueries({ queryKey: ["/api/sites", previousTenantId.current] });
    }
    // Update ref for next comparison
    previousTenantId.current = tenantId;
  }, [tenantId]);

  // Cross-tab tenant change detection (storage event)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user") {
        setSelectedSiteId(null);
        localStorage.removeItem("selectedSiteId");
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <SiteContext.Provider value={{ 
      selectedSiteId, 
      setSelectedSiteId, 
      sites, 
      isLoadingSites,
      sitesError: sitesError as Error | null 
    }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error("useSite must be used within a SiteProvider");
  }
  return context;
}
