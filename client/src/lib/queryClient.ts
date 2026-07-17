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

import { QueryClient, QueryFunction } from "@tanstack/react-query";

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const parts = document.cookie.split(";");
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const k = p.slice(0, eq).trim();
    if (k === name) {
      try {
        return decodeURIComponent(p.slice(eq + 1).trim());
      } catch {
        return p.slice(eq + 1).trim();
      }
    }
  }
  return undefined;
}

let csrfTokenCache: string | undefined;

async function getCsrfToken(): Promise<string | undefined> {
  const cookie = readCookie("csrf_token");
  if (cookie) {
    csrfTokenCache = cookie;
    return cookie;
  }
  if (csrfTokenCache) return csrfTokenCache;
  try {
    const res = await fetch("/api/csrf-token", { credentials: "include" });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const token = data?.csrfToken || readCookie("csrf_token");
      if (token) csrfTokenCache = token;
      return token;
    }
  } catch {
    // ignore; server will 403 on next mutation and caller can retry
  }
  return undefined;
}

function isMutatingMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m !== "GET" && m !== "HEAD" && m !== "OPTIONS";
}

async function throwIfResNotOk(res: Response) {
  if (res.ok) return;

  let message = "Something went wrong";

  try {
    const data = await res.json();

    if (typeof data?.message === "string") {
      message = data.message;
    } else if (typeof data?.error === "string") {
      message = data.error;
    }
  } catch {
    // ignore JSON parse error
  }

  throw new Error(message);
}


export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";

  if (isMutatingMethod(method)) {
    const token = await getCsrfToken();
    if (token) headers["X-CSRF-Token"] = token;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Streaming variant of apiRequest. Like apiRequest, attaches CSRF on
 * mutating methods and includes credentials, but does NOT consume the
 * response body — callers can read `res.body` for SSE / chunked
 * streams. Throws (with the parsed `error`/`message`) when the server
 * responds non-2xx.
 */
export async function apiRequestStream(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";

  if (isMutatingMethod(method)) {
    const token = await getCsrfToken();
    if (token) headers["X-CSRF-Token"] = token;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

export async function apiRequestFormData(
  method: string,
  url: string,
  formData: FormData
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (isMutatingMethod(method)) {
    const token = await getCsrfToken();
    if (token) headers["X-CSRF-Token"] = token;
  }
  const res = await fetch(url, {
    method,
    headers,
    body: formData,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}



type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
