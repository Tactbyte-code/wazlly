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

import { AppSettings } from "@/types/types";
import { useQuery } from "@tanstack/react-query";

// setMeta.ts
export interface MetaOptions {
  title?: string;
  favicon?: string;
  description?: string;
  keywords?: string;
}

export function setMeta(options: MetaOptions) {
  // const { data: brandSettings } = useQuery<AppSettings>({
  //   queryKey: ["/api/brand-settings"],
  //   queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
  //   staleTime: 5 * 60 * 1000,
  // });

  const head = document.head;

  // ---- Title ----
  if (options.title) {
    document.title = options.title + " | Whatsapp Marketing and Automation Platform"; // to be changed after the apis are integrated
  }

  // to be changed after the apis are integrated
  if (options.favicon) {
    // Remove existing favicons
    head.querySelectorAll("link[rel*='icon']").forEach((el) => el.remove());

    // Add new favicon (cache-bust with timestamp)
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = options.favicon + `?v=${Date.now()}`;
    head.appendChild(link);
  }

  // ---- Description ----
  if (options?.description) {
    let descTag = head.querySelector<HTMLMetaElement>(
      "meta[name='description']",
    );
    if (!descTag) {
      descTag = document.createElement("meta");
      descTag.name = "description";
      head.appendChild(descTag);
    }
    descTag.content = options?.description;
  }

  // ---- Keywords ----
  if (options.keywords) {
    let keywordsTag = head.querySelector<HTMLMetaElement>(
      "meta[name='keywords']",
    );
    if (!keywordsTag) {
      keywordsTag = document.createElement("meta");
      keywordsTag.name = "keywords";
      head.appendChild(keywordsTag);
    }
    keywordsTag.content = options.keywords;
  };
}
