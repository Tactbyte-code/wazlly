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

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { setMeta } from "@/hooks/setMeta";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { useSocket } from "@/contexts/socket-context";
import { useGlobalNotifications } from "../notification/useGlobalNotifications.tsx";
import { useUnreadCount } from "@/contexts/UnreadCountContext";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: brandSettings } = useQuery({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });


 const { socket } = useSocket();
 const unreadCount = useUnreadCount();

  useGlobalNotifications(socket, unreadCount);

  useEffect(() => {
    if (brandSettings && !brandSettings.error) {
      setMeta({
        title: brandSettings.title,
        favicon: brandSettings.favicon,
        description: brandSettings.tagline,
        keywords: `${brandSettings.title || ""} ${brandSettings.tagline || ""}`,
      });

      const root = document.documentElement;

      const hexToHslData = (hex: string) => {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
          r = parseInt(hex[1] + hex[1], 16);
          g = parseInt(hex[2] + hex[2], 16);
          b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
          r = parseInt(hex.substring(1, 3), 16);
          g = parseInt(hex.substring(3, 5), 16);
          b = parseInt(hex.substring(5, 7), 16);
        }
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s: number = 0, l = (max + min) / 2;
        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        return { 
          h: Math.round(h * 360), 
          s: Math.round(s * 100), 
          l: Math.round(l * 100) 
        };
      };

      const hexToHsl = (hex: string) => {
        const data = hexToHslData(hex);
        if (!data) return "";
        return `hsl(${data.h}, ${data.s}%, ${data.l}%)`;
      };

      const hexToRgbNumbers = (hex: string) => {
        if (!hex || typeof hex !== 'string') return "";
        let r = 0, g = 0, b = 0;
        const cleanHex = hex.trim();
        if (cleanHex.length === 4) {
          r = parseInt(cleanHex[1] + cleanHex[1], 16);
          g = parseInt(cleanHex[2] + cleanHex[2], 16);
          b = parseInt(cleanHex[3] + cleanHex[3], 16);
        } else if (cleanHex.length === 7) {
          r = parseInt(cleanHex.slice(1, 3), 16);
          g = parseInt(cleanHex.slice(3, 5), 16);
          b = parseInt(cleanHex.slice(5, 7), 16);
        } else {
          return "";
        }
        return `${r}, ${g}, ${b}`;
      };

      // Apply primary color
      const pColor = brandSettings.primaryColor || "#1c781f";
      if (pColor && pColor.startsWith('#')) {
        const hsl = hexToHsl(pColor);
        const rgb = hexToRgbNumbers(pColor);
        if (hsl) {
          root.style.setProperty('--primary', hsl);
          root.style.setProperty('--ring', hsl);
          if (rgb) root.style.setProperty('--primary-rgb', rgb);
        }
      }

      // Apply background color and handle contrast
      if (brandSettings.backgroundColor && typeof brandSettings.backgroundColor === 'string' && brandSettings.backgroundColor.startsWith('#')) {
        const hslData = hexToHslData(brandSettings.backgroundColor);
        if (hslData) {
          const { h, s, l } = hslData;
          const hslStr = `hsl(${h}, ${s}%, ${l}%)`;
          
          root.style.setProperty('--background', hslStr);
          root.style.setProperty('--card', hslStr);
          root.style.setProperty('--popover', hslStr);
          
          // Contrast logic for text and UI elements
          const isDark = l < 60; // Using 60 as threshold for better readability on light-ish colors
          
          const foreground = isDark ? "hsl(0, 0%, 100%)" : "hsl(240, 10%, 3.9%)";
          const mutedForeground = isDark ? "hsl(240, 5%, 80%)" : "hsl(240, 3.8%, 46.1%)";
          const muted = isDark ? `hsl(${h}, ${s}%, ${Math.max(0, l + 10)}%)` : `hsl(${h}, ${s}%, ${Math.max(0, l - 5)}%)`;
          const border = isDark ? `hsl(${h}, ${s}%, ${Math.min(100, l + 15)}%)` : `hsl(${h}, ${s}%, ${Math.max(0, l - 10)}%)`;

          root.style.setProperty('--foreground', foreground);
          root.style.setProperty('--muted-foreground', mutedForeground);
          root.style.setProperty('--muted', muted);
          root.style.setProperty('--border', border);
          root.style.setProperty('--popover-foreground', foreground);
          root.style.setProperty('--card-foreground', foreground);
          
          document.body.style.backgroundColor = brandSettings.backgroundColor;
          document.body.style.color = isDark ? "#ffffff" : "#000000";
        }
      }

      // Apply button color
      const bColor = brandSettings.buttonColor || pColor;
      if (bColor && bColor.startsWith('#')) {
        const hsl = hexToHsl(bColor);
        if (hsl) {
          root.style.setProperty('--button-primary', hsl);
        }
      }

      if (brandSettings.fontFamily) {
        root.style.setProperty('--font-sans', brandSettings.fontFamily);
        root.style.setProperty('--font-mono', brandSettings.fontFamily);
        document.body.style.fontFamily = brandSettings.fontFamily;
      }

      // Inject global overrides for hardcoded background classes and green utilities
      let styleTag = document.getElementById('dynamic-theme-overrides');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-theme-overrides';
        document.head.appendChild(styleTag);
      }

      let overrides = "";
      
      // Override background classes if needed
      if (brandSettings.backgroundColor && brandSettings.backgroundColor.toLowerCase() !== '#ffffff') {
        overrides += `
          .bg-white, .bg-gray-50, .bg-slate-50, .bg-neutral-50 { 
            background-color: var(--background) !important; 
          }
          .bg-white\\/70, .bg-white\\/80, .bg-white\\/90, .bg-white\\/95 {
             background-color: var(--background) !important;
             backdrop-filter: blur(10px);
          }
          .border-gray-100, .border-gray-200, .border-slate-100 {
            border-color: var(--border) !important;
          }
          .text-gray-400, .text-gray-500, .text-gray-600, .text-slate-500, .text-slate-600 {
            color: var(--muted-foreground) !important;
          }
          .hover\\:bg-gray-50:hover, .bg-gray-50 {
            background-color: var(--muted) !important;
          }
        `;
      }

      // Map primary action elements to button color
      if (bColor) {
        overrides += `
          button.bg-primary, 
          .bg-primary[role="button"],
          .bg-primary.hover-lift,
          button[type="submit"],
          .bg-green-600, .bg-emerald-600, .bg-teal-600,
          .hover\\:bg-green-700:hover, .hover\\:bg-emerald-700:hover, .hover\\:bg-teal-700:hover {
            background-color: var(--button-primary) !important;
            background-image: none !important;
          }
        `;
      }

      // GLOBAL FIX for hardcoded brand colors (green, emerald, teal)
      // Map all these utilities to the theme's primary color
      if (pColor && pColor.toLowerCase() !== '#10b981' && pColor.toLowerCase() !== '#059669') {
        overrides += `
          /* Text Colors */
          .text-green-400, .text-green-500, .text-green-600, .text-green-700, .text-green-800,
          .text-emerald-400, .text-emerald-500, .text-emerald-600, .text-emerald-700, .text-emerald-800,
          .text-teal-400, .text-teal-500, .text-teal-600, .text-teal-700, .text-teal-800 {
            color: var(--primary) !important;
          }

          /* Background Colors */
          .bg-green-50, .bg-green-100, .bg-green-400, .bg-green-500, .bg-green-600, .bg-green-700,
          .bg-emerald-50, .bg-emerald-100, .bg-emerald-400, .bg-emerald-500, .bg-emerald-600, .bg-emerald-700,
          .bg-teal-50, .bg-teal-100, .bg-teal-400, .bg-teal-500, .bg-teal-600, .bg-teal-700 {
            background-color: var(--primary) !important;
          }
          
          /* Special case for light backgrounds - use opacity */
          .bg-green-50, .bg-emerald-50, .bg-teal-50, .bg-green-100, .bg-emerald-100, .bg-teal-100 {
            background-color: color-mix(in srgb, var(--primary), transparent 90%) !important;
          }

          /* Gradients */
          .from-green-400, .from-green-500, .from-green-600,
          .from-emerald-400, .from-emerald-500, .from-emerald-600,
          .from-teal-400, .from-teal-500, .from-teal-600 {
            --tw-gradient-from: var(--primary) !important;
            --tw-gradient-to: color-mix(in srgb, var(--primary), black 20%) !important;
            --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
          }
          
          .to-green-400, .to-green-500, .to-green-600,
          .to-emerald-400, .to-emerald-500, .to-emerald-600,
          .to-teal-400, .to-teal-500, .to-teal-600 {
            --tw-gradient-to: var(--primary) !important;
          }

          /* Border Colors */
          .border-green-100, .border-green-200, .border-green-500, .border-green-600,
          .border-emerald-100, .border-emerald-200, .border-emerald-500, .border-emerald-600,
          .border-teal-100, .border-teal-200, .border-teal-500, .border-teal-600 {
            border-color: var(--primary) !important;
            border-opacity: 0.3;
          }

          /* Rings and Shadows */
          .ring-green-400, .ring-emerald-400, .ring-teal-400,
          .ring-green-500, .ring-emerald-500, .ring-teal-500 {
            --tw-ring-color: var(--primary) !important;
          }
          
          .shadow-green-500\\/20, .shadow-emerald-500\\/20, .shadow-teal-500\\/20,
          .shadow-green-500\\/30, .shadow-emerald-500\\/30, .shadow-teal-500\\/30 {
            --tw-shadow-color: var(--primary) !important;
          }

          /* Hover States */
          .hover\\:bg-green-700:hover, .hover\\:bg-emerald-700:hover, .hover\\:bg-teal-700:hover,
          .hover\\:text-green-700:hover, .hover\\:text-emerald-700:hover, .hover\\:text-teal-700:hover {
             opacity: 0.9 !important;
          }

          /* Opacity variants */
          .bg-green-500\\/10, .bg-emerald-500\\/10, .bg-teal-500\\/10, .bg-primary\\/10 {
            background-color: color-mix(in srgb, var(--primary), transparent 90%) !important;
          }
          .bg-green-500\\/5, .bg-emerald-500\\/5, .bg-teal-500\\/5, .bg-primary\\/5 {
            background-color: color-mix(in srgb, var(--primary), transparent 95%) !important;
          }
        `;
      }

      styleTag.innerHTML = overrides;
    }
  }, [brandSettings]);

  return (
    <>
      <SidebarProvider>{children}</SidebarProvider>
    </>
  );
}
