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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { WidgetConfig } from "./types";

interface WidgetCodeSnippetProps {
  config: WidgetConfig;
  site: any;
  widgetCode: string;
  copyCode: () => void;
  onSave: () => void;
  isSaving: boolean;
  isDemoUser: boolean;
}

export default function WidgetCodeSnippet({
  config,
  site,
  widgetCode,
  copyCode,
  onSave,
  isSaving,
  isDemoUser,
}: WidgetCodeSnippetProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("widget.Content.Installation.title")}</CardTitle>
        <CardDescription>
          {t("widget.Content.Installation.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {site ? (
          <div className="relative">
            <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-xs">
              <code className="font-mono">{widgetCode}</code>
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={copyCode}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="relative">Please make widget any site</div>
        )}

        <Button
          onClick={onSave}
          disabled={isDemoUser || isSaving}
          className="w-full"
        >
          {isSaving
            ? "Saving..."
            : "Save Configuration"}
        </Button>
      </CardContent>
    </Card>
  );
}
