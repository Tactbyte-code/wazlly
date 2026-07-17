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
  ArrowRight,
  MessageSquare,
  Webhook,
  Server,
  CheckCircle,
} from "lucide-react";

export function WebhookFlowDiagram() {
  return (
    <div className="bg-white rounded-lg border ">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4 py-4">
        {/* Step 1 */}
        <div className="flex flex-col items-center text-center flex-1">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
            <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
          </div>
          <p className="text-sm font-medium">User sends message</p>
          <p className="text-xs text-gray-500 mt-1">Via WhatsApp</p>
        </div>

        <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 rotate-90 sm:rotate-0" />

        {/* Step 2 */}
        <div className="flex flex-col items-center text-center flex-1">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
            <Server className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          </div>
          <p className="text-sm font-medium">WhatsApp server</p>
          <p className="text-xs text-gray-500 mt-1">Processes message</p>
        </div>

        <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 rotate-90 sm:rotate-0" />

        {/* Step 3 */}
        <div className="flex flex-col items-center text-center flex-1">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mb-2">
            <Webhook className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
          </div>
          <p className="text-sm font-medium">Webhook sent</p>
          <p className="text-xs text-gray-500 mt-1">To your URL</p>
        </div>

        <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 rotate-90 sm:rotate-0" />

        {/* Step 4 */}
        <div className="flex flex-col items-center text-center flex-1">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-2">
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
          </div>
          <p className="text-sm font-medium">WhatsWay receives</p>
          <p className="text-xs text-gray-500 mt-1">Updates inbox</p>
        </div>
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-4 text-center sm:text-left overflow-x-auto">
        <p className="text-sm text-gray-600 select-all  break-all ">
          <strong>Your webhook URL format:</strong>{" "}
          {typeof window !== "undefined" ? window.location.origin : ""}
          /webhook/[your-channel-id]
        </p>
      </div>
    </div>
  );
}
