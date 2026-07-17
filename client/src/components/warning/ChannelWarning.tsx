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

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface ChannelWarningProps {
  userId: string;
}

const ChannelWarning: React.FC<ChannelWarningProps> = ({ userId }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkChannels = async () => {
      setLoading(true);
      try {
        const res = await apiRequest("POST", "/api/channels/userid", { userId });
        const data = await res.json();

        if (data.status === "success" && Array.isArray(data.data)) {
          if (data.data.length === 0) {
            setShowWarning(true);
          } else {
            setShowWarning(false);
          }
        } else {
          setShowWarning(true); // fallback: treat as no channels
        }
      } catch (err) {
        console.error("Error fetching channels:", err);
        setShowWarning(true);
      } finally {
        setLoading(false);
      }
    };

    checkChannels();
  }, [userId]);

  if (loading || !showWarning) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
        <h3 className="text-lg font-semibold mb-2">⚠️ Warning</h3>
        <p className="mb-4">You don’t have any channels yet. Please create a channel first.</p>
        <button
          onClick={() => setShowWarning(false)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default ChannelWarning;
