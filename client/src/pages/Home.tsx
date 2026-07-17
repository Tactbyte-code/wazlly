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

import React from "react";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import UseCases from "@/components/UseCases";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import CTA from "@/components/CTA";
import { useQuery } from "@tanstack/react-query";
import { PlansDataTypes } from "@/types/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Home = () => {
  const { data: paymentProviders } = useQuery<PlansDataTypes>({
    queryKey: ["/api/admin/plans"],
    queryFn: async () => {
      const res = await fetch("/api/admin/plans");
      return res.json();
    },
  });
  return (
    <>
      {/* <Header /> */}
      <Hero />
      <Features />
      <HowItWorks />
      <UseCases />
      <Testimonials />
      {paymentProviders?.success && paymentProviders?.data?.length > 0 && (
        <Pricing />
      )}
      <CTA />
      {/* <Footer /> */}
    </>
  );
};

export default Home;
