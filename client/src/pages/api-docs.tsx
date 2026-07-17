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

import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Book,
  Code,
  Copy,
  Download,
  Send,
  Users,
  FileText,
  Megaphone,
  Key,
  Globe,
  AlertTriangle,
  Shield,
  Webhook,
  Info,
} from "lucide-react";
import Header from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = `${window.location.origin}/api/v1`;

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  query?: string;
  body?: string;
  response?: string;
  note?: string;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  endpoints: Endpoint[];
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  POST: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PUT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const sections: Section[] = [
  {
    id: "messaging",
    title: "Messaging",
    icon: <Send className="w-5 h-5" />,
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/messages/template",
        description: "Send a template message to a contact",
        note: `Phone number format: digits only with country code, no spaces or + sign (e.g. 919876543210 for India, 14155552671 for US).\n\nFor templates with variables, pass a components array. Example with body variables:\n{\n  "type": "body",\n  "parameters": [\n    { "type": "text", "text": "John Doe" },\n    { "type": "text", "text": "ORD-12345" }\n  ]\n}`,
        body: JSON.stringify(
          {
            to: "919876543210",
            templateName: "hello_world",
            language: "en_US",
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: "John Doe" },
                  { type: "text", text: "ORD-12345" },
                ],
              },
            ],
          },
          null,
          2
        ),
        response: JSON.stringify(
          {
            success: true,
            data: {
              messageId: "uuid-xxx",
              whatsappMessageId: "wamid.xxx",
              contactId: "uuid-xxx",
              conversationId: "uuid-xxx",
              status: "sent",
            },
          },
          null,
          2
        ),
      },
      {
        method: "POST",
        path: "/api/v1/messages/reply",
        description: "Send a free-text reply within the 24-hour customer service window",
        note: "This endpoint only works when the contact has sent you a message in the last 24 hours (WhatsApp's customer service window). If the window has expired, use the template message endpoint instead.\n\nPhone number format: digits only with country code (e.g. 919876543210).",
        body: JSON.stringify({ to: "919876543210", message: "Hello! Your order has been shipped." }, null, 2),
        response: JSON.stringify(
          {
            success: true,
            data: {
              messageId: "uuid-xxx",
              whatsappMessageId: "wamid.xxx",
              status: "sent",
            },
          },
          null,
          2
        ),
      },
      {
        method: "GET",
        path: "/api/v1/messages/:contactPhone",
        description: "Get message history for a contact",
        query: "?limit=50&offset=0",
        note: "Replace :contactPhone with the contact's phone number (digits only, with country code).",
        response: JSON.stringify(
          { success: true, data: { messages: [], total: 0, limit: 50, offset: 0 } },
          null,
          2
        ),
      },
      {
        method: "GET",
        path: "/api/v1/messages/status/:messageId",
        description: "Get delivery status of a specific message",
        note: "Replace :messageId with the messageId returned when the message was sent.",
        response: JSON.stringify(
          {
            success: true,
            data: {
              id: "uuid-xxx",
              whatsappMessageId: "wamid.xxx",
              status: "delivered",
              deliveredAt: "2024-01-01T12:00:00Z",
              readAt: null,
              errorCode: null,
              errorMessage: null,
              createdAt: "2024-01-01T11:59:00Z",
            },
          },
          null,
          2
        ),
      },
    ],
  },
  {
    id: "contacts",
    title: "Contacts",
    icon: <Users className="w-5 h-5" />,
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/contacts",
        description: "List all contacts with optional filters",
        query: "?search=John&limit=50&offset=0&groupId=xxx",
        response: JSON.stringify(
          { success: true, data: { contacts: [], total: 0 } },
          null,
          2
        ),
      },
      {
        method: "POST",
        path: "/api/v1/contacts",
        description: "Create a new contact",
        body: JSON.stringify(
          { phone: "919876543210", name: "John Doe", email: "john@example.com" },
          null,
          2
        ),
        note: "Phone number must include country code, digits only (e.g. 919876543210). Returns 409 if the contact already exists.",
        response: JSON.stringify(
          { success: true, data: { id: "uuid-xxx", phone: "919876543210", name: "John Doe" } },
          null,
          2
        ),
      },
      {
        method: "PUT",
        path: "/api/v1/contacts/:id",
        description: "Update an existing contact's name or email",
        body: JSON.stringify({ name: "John Updated", email: "john.new@example.com" }, null, 2),
        response: JSON.stringify({ success: true, data: { id: "uuid-xxx", name: "John Updated" } }, null, 2),
      },
      {
        method: "DELETE",
        path: "/api/v1/contacts/:id",
        description: "Delete a contact permanently",
        response: JSON.stringify({ success: true, data: { message: "Contact deleted successfully" } }, null, 2),
      },
      {
        method: "GET",
        path: "/api/v1/contacts/groups",
        description: "List all contact groups",
        response: JSON.stringify({ success: true, data: [] }, null, 2),
      },
      {
        method: "POST",
        path: "/api/v1/contacts/groups/:groupId/add",
        description: "Add a contact to a group",
        body: JSON.stringify({ contactId: "uuid-xxx" }, null, 2),
        response: JSON.stringify({ success: true, data: { message: "Contact added to group" } }, null, 2),
      },
      {
        method: "POST",
        path: "/api/v1/contacts/groups/:groupId/remove",
        description: "Remove a contact from a group",
        body: JSON.stringify({ contactId: "uuid-xxx" }, null, 2),
        response: JSON.stringify({ success: true, data: { message: "Contact removed from group" } }, null, 2),
      },
    ],
  },
  {
    id: "templates",
    title: "Templates",
    icon: <FileText className="w-5 h-5" />,
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/templates",
        description: "List all message templates for the channel",
        query: "?status=APPROVED",
        note: "Filter by status to get only approved templates ready for sending. Common status values: APPROVED, PENDING, REJECTED.",
        response: JSON.stringify(
          {
            success: true,
            data: [
              {
                id: "uuid-xxx",
                name: "hello_world",
                status: "APPROVED",
                language: "en_US",
                category: "MARKETING",
              },
            ],
          },
          null,
          2
        ),
      },
    ],
  },
  {
    id: "campaigns",
    title: "Campaigns",
    icon: <Megaphone className="w-5 h-5" />,
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/campaigns",
        description: "List all campaigns with optional filters",
        query: "?status=completed&limit=10&offset=0",
        response: JSON.stringify(
          { success: true, data: { campaigns: [], total: 0, limit: 10, offset: 0 } },
          null,
          2
        ),
      },
    ],
  },
  {
    id: "account",
    title: "Account",
    icon: <Globe className="w-5 h-5" />,
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/account",
        description: "Get channel information and API key details",
        response: JSON.stringify(
          {
            success: true,
            data: {
              userId: "uuid-xxx",
              channel: {
                id: "uuid-xxx",
                name: "My Channel",
                phoneNumber: "+919876543210",
                isActive: true,
                healthStatus: "healthy",
              },
              usage: {
                requestCount: 1250,
                monthlyRequestCount: 340,
                monthlyResetAt: "2024-02-01T00:00:00Z",
                lastUsedAt: "2024-01-15T10:30:00Z",
              },
            },
          },
          null,
          2
        ),
      },
      {
        method: "GET",
        path: "/api/v1/account/usage",
        description: "Get detailed API usage breakdown by time period",
        response: JSON.stringify(
          {
            success: true,
            data: {
              last24Hours: 42,
              last7Days: 310,
              total: 1250,
              recentRequests: [
                {
                  endpoint: "/api/v1/messages/template",
                  method: "POST",
                  statusCode: 200,
                  responseTime: 312,
                  createdAt: "2024-01-15T10:30:00Z",
                },
              ],
            },
          },
          null,
          2
        ),
      },
    ],
  },
  {
    id: "webhooks",
    title: "Webhooks",
    icon: <Webhook className="w-5 h-5" />,
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/webhooks",
        description: "List all registered webhooks for your account",
        response: JSON.stringify(
          {
            success: true,
            data: [
              {
                id: "uuid-xxx",
                url: "https://yourserver.com/webhooks/whatsapp",
                events: ["message.sent", "message.delivered"],
                isActive: true,
                createdAt: "2024-01-01T00:00:00Z",
              },
            ],
          },
          null,
          2
        ),
      },
      {
        method: "POST",
        path: "/api/v1/webhooks",
        description: "Register a new webhook URL to receive event notifications",
        note: `Available events:\n• message.sent — fired when a message is dispatched\n• message.delivered — fired when WhatsApp confirms delivery\n• message.read — fired when the recipient reads the message\n• message.failed — fired when a message fails to deliver\n• conversation.new — fired when a new conversation starts\n• contact.new — fired when a new contact is created\n\nThe response includes a secret — store it securely and use it to verify the webhook signature on your server.`,
        body: JSON.stringify(
          {
            url: "https://yourserver.com/webhooks/whatsapp",
            events: ["message.sent", "message.delivered", "message.read", "message.failed"],
          },
          null,
          2
        ),
        response: JSON.stringify(
          {
            success: true,
            data: {
              id: "uuid-xxx",
              url: "https://yourserver.com/webhooks/whatsapp",
              secret: "your-webhook-secret-store-this-safely",
              events: ["message.sent", "message.delivered", "message.read", "message.failed"],
              isActive: true,
              note: "Store the webhook secret securely for signature verification.",
            },
          },
          null,
          2
        ),
      },
      {
        method: "PUT",
        path: "/api/v1/webhooks/:id",
        description: "Update an existing webhook's URL, events, or active status",
        body: JSON.stringify(
          {
            url: "https://yourserver.com/webhooks/new-endpoint",
            events: ["message.sent", "message.failed"],
            isActive: true,
          },
          null,
          2
        ),
        response: JSON.stringify(
          {
            success: true,
            data: {
              id: "uuid-xxx",
              url: "https://yourserver.com/webhooks/new-endpoint",
              events: ["message.sent", "message.failed"],
              isActive: true,
              updatedAt: "2024-01-15T10:30:00Z",
            },
          },
          null,
          2
        ),
      },
      {
        method: "DELETE",
        path: "/api/v1/webhooks/:id",
        description: "Delete a webhook permanently",
        response: JSON.stringify(
          { success: true, data: { message: "Webhook deleted successfully" } },
          null,
          2
        ),
      },
    ],
  },
];

const ERROR_CODES = [
  { code: 400, label: "Bad Request", description: "The request body or parameters are invalid" },
  { code: 401, label: "Unauthorized", description: "Invalid or missing API key/secret" },
  { code: 403, label: "Forbidden", description: "Insufficient permissions for this action or 24-hour window expired" },
  { code: 404, label: "Not Found", description: "The requested resource does not exist" },
  { code: 409, label: "Conflict", description: "Resource already exists (e.g. duplicate contact phone)" },
  { code: 429, label: "Rate Limited", description: "Too many requests — slow down or upgrade your plan" },
  { code: 500, label: "Internal Server Error", description: "Something went wrong on our end" },
];

function generateCurl(endpoint: Endpoint): string {
  const fullUrl = `${BASE_URL}${endpoint.path}${endpoint.query || ""}`;
  let curl = `curl -X ${endpoint.method} "${fullUrl}"`;
  curl += ` \\\n  -H "X-API-Key: YOUR_API_KEY"`;
  curl += ` \\\n  -H "X-API-Secret: YOUR_API_SECRET"`;
  curl += ` \\\n  -H "X-Channel-Id: YOUR_CHANNEL_ID"`;
  if (endpoint.body) {
    curl += ` \\\n  -H "Content-Type: application/json"`;
    curl += ` \\\n  -d '${endpoint.body}'`;
  }
  return curl;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generateHtmlDocument(): string {
  const methodColors: Record<string, string> = {
    GET: "background:#ecfdf5;color:#065f46;",
    POST: "background:#eff6ff;color:#1e40af;",
    PUT: "background:#fefce8;color:#854d0e;",
    DELETE: "background:#fef2f2;color:#991b1b;",
  };

  const sectionHtml = sections
    .map((section) => {
      const endpointsHtml = section.endpoints
        .map((ep) => {
          const curl = generateCurl(ep);
          let html = `<div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;overflow:hidden;">`;
          html += `<div style="padding:14px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:12px;">`;
          html += `<span style="${methodColors[ep.method]}font-weight:600;font-size:12px;padding:3px 10px;border-radius:4px;font-family:monospace;">${escapeHtml(ep.method)}</span>`;
          html += `<div><code style="font-size:14px;font-weight:600;">${escapeHtml(ep.path)}</code><br/><span style="font-size:13px;color:#64748b;">${escapeHtml(ep.description)}</span></div>`;
          html += `</div>`;
          html += `<div style="padding:14px 18px;">`;
          if (ep.note) {
            html += `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#1e40af;white-space:pre-wrap;">${escapeHtml(ep.note)}</div>`;
          }
          if (ep.query) {
            html += `<p style="font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Query Parameters</p>`;
            html += `<code style="display:block;background:#f8fafc;padding:8px 12px;border-radius:6px;font-size:13px;margin-bottom:14px;">${escapeHtml(ep.query)}</code>`;
          }
          if (ep.body) {
            html += `<p style="font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Request Body</p>`;
            html += `<pre style="background:#1e293b;color:#e2e8f0;padding:14px;border-radius:6px;font-size:13px;overflow-x:auto;margin-bottom:14px;">${escapeHtml(ep.body)}</pre>`;
          }
          if (ep.response) {
            html += `<p style="font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Response</p>`;
            html += `<pre style="background:#1e293b;color:#e2e8f0;padding:14px;border-radius:6px;font-size:13px;overflow-x:auto;margin-bottom:14px;">${escapeHtml(ep.response)}</pre>`;
          }
          html += `<p style="font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">cURL</p>`;
          html += `<pre style="background:#f8fafc;color:#334155;padding:14px;border-radius:6px;font-size:13px;overflow-x:auto;white-space:pre-wrap;border:1px solid #e2e8f0;">${escapeHtml(curl)}</pre>`;
          html += `</div></div>`;
          return html;
        })
        .join("");
      return `<div style="margin-bottom:40px;"><h2 style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e2e8f0;">${escapeHtml(section.title)}</h2>${endpointsHtml}</div>`;
    })
    .join("");

  const errorsHtml = ERROR_CODES.map(
    (err) =>
      `<div style="display:flex;align-items:flex-start;gap:12px;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:8px;">
        <span style="font-family:monospace;font-size:13px;font-weight:600;padding:2px 8px;border-radius:4px;border:1px solid ${err.code >= 500 ? "#fca5a5" : "#fcd34d"};color:${err.code >= 500 ? "#b91c1c" : "#92400e"};">${err.code}</span>
        <div><strong style="font-size:14px;">${escapeHtml(err.label)}</strong><br/><span style="font-size:13px;color:#64748b;">${escapeHtml(err.description)}</span></div>
      </div>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>API Documentation</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #0f172a; line-height: 1.6; }
  .container { max-width: 900px; margin: 0 auto; padding: 40px 32px 80px; }
  h1 { font-size: 32px; font-weight: 800; margin-bottom: 6px; }
  h1 span { color: #64748b; font-size: 16px; font-weight: 400; display: block; margin-top: 4px; }
  h2 { font-size: 22px; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: 'SF Mono', Monaco, Consolas, monospace; }
  pre { font-family: 'SF Mono', Monaco, Consolas, monospace; }
  .section { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
  .section h3 { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
  .warning { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; font-size: 14px; color: #92400e; margin-top: 14px; }
  @media print { .container { padding: 20px; } .section { break-inside: avoid; } }
</style>
</head>
<body>
<div class="container">
  <h1>API Documentation<span>Complete REST API reference</span></h1>

  <div class="section" style="margin-top:24px;">
    <h3>REST API Reference</h3>
    <p style="font-size:15px;color:#475569;margin-bottom:12px;">Use the REST API to integrate messaging, contacts, campaigns, webhooks, and more into your applications. All endpoints require authentication via API key and secret headers.</p>
    <p><strong>Base URL:</strong></p>
    <code style="display:inline-block;padding:8px 14px;font-size:14px;margin:8px 0;">${BASE_URL}</code>
    <p style="font-size:13px;color:#64748b;margin-top:8px;">All responses follow this format: <code>{ success: boolean, data?: any, error?: string }</code></p>
  </div>

  <div class="section">
    <h3>Authentication</h3>
    <p style="font-size:15px;color:#475569;margin-bottom:12px;">All API requests must include your API key and secret in the request headers. You can generate API keys from the Settings page.</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:8px;"><span style="background:#f1f5f9;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;">Header</span><code>X-API-Key: YOUR_API_KEY</code></div>
      <div style="display:flex;align-items:center;gap:8px;"><span style="background:#f1f5f9;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;">Header</span><code>X-API-Secret: YOUR_API_SECRET</code></div>
      <div style="display:flex;align-items:center;gap:8px;"><span style="background:#f1f5f9;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;">Header</span><code>X-Channel-Id: YOUR_CHANNEL_ID</code> <span style="font-size:12px;color:#64748b;">(required if API key is not locked to a specific channel; can also pass as <code>?channel_id=</code> query param)</span></div>
    </div>
    <div class="warning">Keep your API secret safe. Never expose it in client-side code or public repositories. If compromised, revoke it immediately and generate a new one.</div>
    <div style="margin-top:16px;">
      <p style="font-size:12px;font-weight:600;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">Example authenticated request</p>
      <pre style="background:#1e293b;color:#e2e8f0;padding:14px;border-radius:6px;font-size:13px;overflow-x:auto;">curl -X GET "${BASE_URL}/account" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-API-Secret: YOUR_API_SECRET" \\
  -H "X-Channel-Id: YOUR_CHANNEL_ID"</pre>
    </div>
  </div>

  <div class="section">
    <h3>Rate Limiting</h3>
    <p style="font-size:15px;color:#475569;margin-bottom:12px;">API usage is rate-limited based on your subscription plan. Exceeding limits will result in a 429 status code response.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;"><strong style="font-size:14px;">Monthly Limit</strong><p style="font-size:13px;color:#64748b;margin-top:4px;">Based on your subscription plan tier</p></div>
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;"><strong style="font-size:14px;">Per-Minute Limit</strong><p style="font-size:13px;color:#64748b;margin-top:4px;">60 requests per minute per API key</p></div>
    </div>
    <p style="font-size:12px;font-weight:600;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">Rate limit exceeded response</p>
    <pre style="background:#f8fafc;color:#334155;padding:14px;border-radius:6px;font-size:13px;border:1px solid #e2e8f0;">${JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }, null, 2)}</pre>
  </div>

  ${sectionHtml}

  <div class="section">
    <h3>Error Codes</h3>
    <div style="margin-top:12px;">${errorsHtml}</div>
  </div>

  <div style="text-align:center;padding:30px 0;color:#94a3b8;font-size:13px;">
    <p>Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>
</div>
</body>
</html>`;
}

function downloadHtml() {
  const html = generateHtmlDocument();
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "API-Documentation.html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ApiDocs() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t("apiDocs.copied"),
      description: t("apiDocs.copiedToClipboard"),
    });
  };

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex-1 min-h-screen dots-bg">
      <Header
        title={t("apiDocs.title")}
        subtitle={t("apiDocs.subtitle")}
      />

      <div className="flex gap-6 p-6">
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-6 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t("apiDocs.navigation")}
            </p>
            <button
              onClick={() => scrollToSection("authentication")}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            >
              <Key className="w-4 h-4" />
              {t("apiDocs.sections.authentication")}
            </button>
            <button
              onClick={() => scrollToSection("rate-limiting")}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            >
              <Shield className="w-4 h-4" />
              {t("apiDocs.sections.rateLimiting")}
            </button>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
              >
                {section.icon}
                {section.title}
              </button>
            ))}
            <button
              onClick={() => scrollToSection("errors")}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              {t("apiDocs.sections.errorCodes")}
            </button>
            <div className="pt-4 mt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={downloadHtml}
              >
                <Download className="w-4 h-4" />
                Download as HTML
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Book className="w-6 h-6 text-primary mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-lg font-semibold mb-1">{t("apiDocs.overview.title")}</h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("apiDocs.overview.description")}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-3 py-1.5 rounded font-mono">{BASE_URL}</code>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(BASE_URL)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("apiDocs.overview.responseFormat")}:{" "}
                    <code className="bg-muted px-1 py-0.5 rounded">
                      {"{ success: boolean, data?: any, error?: string }"}
                    </code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div ref={(el) => { sectionRefs.current["authentication"] = el; }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  {t("apiDocs.sections.authentication")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("apiDocs.auth.description")}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Header</Badge>
                    <code className="text-sm bg-muted px-2 py-1 rounded font-mono">X-API-Key: YOUR_API_KEY</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Header</Badge>
                    <code className="text-sm bg-muted px-2 py-1 rounded font-mono">X-API-Secret: YOUR_API_SECRET</code>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">Header</Badge>
                    <code className="text-sm bg-muted px-2 py-1 rounded font-mono">X-Channel-Id: YOUR_CHANNEL_ID</code>
                    <span className="text-xs text-muted-foreground">(required if API key covers all channels; can also use <code className="text-xs">?channel_id=</code> query param)</span>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {t("apiDocs.auth.warning")}
                    </p>
                  </div>
                </div>
                <Accordion type="single" collapsible defaultValue="auth-example">
                  <AccordionItem value="auth-example">
                    <AccordionTrigger className="text-sm">
                      <span className="flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        {t("apiDocs.auth.curlExample")}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="relative">
                        <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto font-mono">
{`curl -X GET "${BASE_URL}/account" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-API-Secret: YOUR_API_SECRET" \\
  -H "X-Channel-Id: YOUR_CHANNEL_ID"`}
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() =>
                            copyToClipboard(
                              `curl -X GET "${BASE_URL}/account" \\\n  -H "X-API-Key: YOUR_API_KEY" \\\n  -H "X-API-Secret: YOUR_API_SECRET" \\\n  -H "X-Channel-Id: YOUR_CHANNEL_ID"`
                            )
                          }
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>

          <div ref={(el) => { sectionRefs.current["rate-limiting"] = el; }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {t("apiDocs.sections.rateLimiting")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("apiDocs.rateLimit.description")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium mb-1">{t("apiDocs.rateLimit.monthly")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("apiDocs.rateLimit.monthlyDesc")}
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium mb-1">{t("apiDocs.rateLimit.perMinute")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("apiDocs.rateLimit.perMinuteDesc")}
                    </p>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">{t("apiDocs.rateLimit.exceeded")}</p>
                  <pre className="text-sm font-mono overflow-x-auto">
{JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>

          {sections.map((section) => (
            <div
              key={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el; }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {section.icon}
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion
                    type="multiple"
                    defaultValue={section.endpoints.map((_, idx) => `${section.id}-${idx}`)}
                    className="space-y-2"
                  >
                    {section.endpoints.map((endpoint, idx) => {
                      const curlCmd = generateCurl(endpoint);
                      return (
                        <AccordionItem
                          key={`${section.id}-${idx}`}
                          value={`${section.id}-${idx}`}
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center gap-3 text-left">
                              <Badge
                                className={`${METHOD_COLORS[endpoint.method]} font-mono text-xs px-2 py-0.5 border-0 shrink-0`}
                              >
                                {endpoint.method}
                              </Badge>
                              <div className="min-w-0">
                                <code className="text-sm font-mono font-medium">{endpoint.path}</code>
                                <p className="text-xs text-muted-foreground mt-0.5">{endpoint.description}</p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 pt-2 pb-4">
                            {endpoint.note && (
                              <div className="flex gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{endpoint.note}</p>
                              </div>
                            )}

                            {endpoint.query && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                  Query Parameters
                                </p>
                                <code className="text-sm bg-muted px-2 py-1 rounded font-mono block">
                                  {endpoint.query}
                                </code>
                              </div>
                            )}

                            {endpoint.body && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                  Request Body
                                </p>
                                <pre className="text-sm bg-muted p-3 rounded-lg overflow-x-auto font-mono">
                                  {endpoint.body}
                                </pre>
                              </div>
                            )}

                            {endpoint.response && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                  Response
                                </p>
                                <pre className="text-sm bg-muted p-3 rounded-lg overflow-x-auto font-mono">
                                  {endpoint.response}
                                </pre>
                              </div>
                            )}

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  cURL
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => copyToClipboard(curlCmd)}
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  {t("apiDocs.copyCurl")}
                                </Button>
                              </div>
                              <pre className="text-sm bg-muted p-3 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap">
                                {curlCmd}
                              </pre>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          ))}

          <div ref={(el) => { sectionRefs.current["errors"] = el; }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {t("apiDocs.sections.errorCodes")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ERROR_CODES.map((err) => (
                    <div
                      key={err.code}
                      className="flex items-start gap-3 border rounded-lg p-3"
                    >
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs shrink-0 ${
                          err.code >= 500
                            ? "border-red-300 text-red-700 dark:text-red-400"
                            : err.code >= 400
                              ? "border-amber-300 text-amber-700 dark:text-amber-400"
                              : "border-gray-300"
                        }`}
                      >
                        {err.code}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{err.label}</p>
                        <p className="text-xs text-muted-foreground">{err.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
