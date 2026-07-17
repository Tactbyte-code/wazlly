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

import DemoPreviewModal from "@/components/modals/DemoPreviewModal";
import React from "react";

const DemoPage = () => {
  return (
    <DemoPreviewModal
      screenshot="/images/EsimDemoHero.png"
      blurIntensity="sm"
      overlayOpacity={90}
      logo="/images/darklogo-1759833955.webp"
      title="WhatsWay – Smart Communication & Messaging Platform"
      tagline="Experience seamless communication with next-gen automation and multi-channel messaging"
      themeColor="#16A34A"
      infoNote={
        <>
          <strong>
            Access the WhatsWay demo using the login details below
          </strong>
          <br />
          Explore our powerful messaging tools, automation flows, and channel
          management features. Certain actions may be limited for demo safety.
          <br />
          <span className="font-semibold">
            For full access to real-time messaging, campaigns, billing tools,
            and integrations, please register as a new user. Enjoy the complete
            WhatsWay experience with no restrictions.
          </span>
          <br />
          <span className="mt-1 block text-xs text-gray-500">
            Demo data resets daily. No real messages or charges are generated.
          </span>
        </>
      }
      demoUrl="https://whatsway.diploy.in/login"
      superAdmin={{
        username: "demoadmin",
        password: "Admin@123",
      }}
      tenant={{
        username: "raman",
        password: "Raman@123",
      }}
      buttonLabel="🚀 Try WhatsWay Demo"
      buttonLink="https://whatsway.diploy.in/"
      bottomHelp="This is a demo environment. All activities are simulated and do not affect live user data, billing, or messaging."
      supportEmail="nb@diploy.in"
    />
  );
};

export default DemoPage;
