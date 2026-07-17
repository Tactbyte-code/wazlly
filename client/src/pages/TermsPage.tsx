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
import { useTranslation } from "@/lib/i18n";

export const TermsPage = () => {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const productItems = t("terms.sections.productsServices.items", {
    returnObjects: true,
  }) as string[];

  const prohibitedItems = t("terms.sections.prohibitedUses.items", {
    returnObjects: true,
  }) as string[];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-40 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-600 via-green-500 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-6xl font-bold mb-6">{t("terms.hero.title")}</h1>
          {/* <p className="text-xl text-white/90 max-w-3xl mx-auto">
            {t("terms.hero.lastUpdated")}
          </p> */}
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto prose prose-lg">
            {/* Intro Section */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-2xl mb-12">
              <p className="text-lg text-gray-700 leading-relaxed m-0">
                {t("terms.intro.text")}
              </p>
            </div>

            <div className="space-y-12">
              {/* 1. General Conditions */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("terms.sections.generalConditions.title")}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {t("terms.sections.generalConditions.text")}
                </p>
              </div>

              {/* 2. Account Creation */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("terms.sections.accountCreation.title")}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {t("terms.sections.accountCreation.text")}
                </p>
              </div>

              {/* 3. Products & Services */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("terms.sections.productsServices.title")}
                </h2>
                <ul className="space-y-2 text-gray-700">
                  {productItems.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* 4. Billing & Orders */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("terms.sections.billingOrders.title")}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {t("terms.sections.billingOrders.text")}
                </p>
              </div>

              {/* 5. Third-Party Links */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("terms.sections.thirdPartyLinks.title")}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {t("terms.sections.thirdPartyLinks.text")}
                </p>
              </div>

              {/* 6. User Comments */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("terms.sections.userComments.title")}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {t("terms.sections.userComments.text")}
                </p>
              </div>

              {/* 7. Prohibited Uses */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("terms.sections.prohibitedUses.title")}
                </h2>
                <ul className="space-y-2 text-gray-700">
                  {prohibitedItems.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* 8. Disclaimer */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("terms.sections.disclaimer.title")}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {t("terms.sections.disclaimer.text")}
                </p>
              </div>

              {/* 9. Indemnification */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("terms.sections.indemnification.title")}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {t("terms.sections.indemnification.text")}
                </p>
              </div>

              {/* 10. Severability */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("terms.sections.severability.title")}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {t("terms.sections.severability.text")}
                </p>
              </div>

              {/* 11. Termination */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("terms.sections.termination.title")}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {t("terms.sections.termination.text")}
                </p>
              </div>

              {/* 12. Governing Law */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("terms.sections.governingLaw.title")}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {t("terms.sections.governingLaw.text")}
                </p>
              </div>

              {/* 13. Changes */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("terms.sections.changes.title")}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {t("terms.sections.changes.text")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
