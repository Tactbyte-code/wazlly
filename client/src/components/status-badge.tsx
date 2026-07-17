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

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const getVariantClass = () => {
    switch (variant) {
      case "success":
        return "bg-success/10 text-success hover:bg-success/20";
      case "warning":
        return "bg-warning/10 text-warning hover:bg-warning/20";
      case "destructive":
        return "bg-destructive/10 text-destructive hover:bg-destructive/20";
      case "info":
        return "bg-info/10 text-info hover:bg-info/20";
      default:
        return "";
    }
  };

  return (
    <Badge
      variant={variant === "default" || !variant ? "default" : "outline"}
      className={cn("text-xs uppercase", getVariantClass())}
    >
      {status}
    </Badge>
  );
}
