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

// import Footer from "@/components/Footer";
// import Header from "@/components/Header";

// export const PrivacyPage = () => {
//   return (
//     <div className="min-h-screen bg-background">
//       {/* Hero Section */}
//       <section className="py-40 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-600 via-green-500 to-blue-600 t text-white">
//         <div className="container mx-auto px-4 text-center">
//           <h1 className="text-6xl font-bold mb-6">Privacy Policy</h1>
//         </div>
//       </section>

//       {/* Privacy Content */}
//       <section className="py-20 bg-white">
//         <div className="container mx-auto px-4">
//           <div className="max-w-4xl mx-auto prose prose-lg">
//             {/* Intro Section */}
//             <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-2xl mb-12">
//               <p className="text-lg text-gray-700 leading-relaxed m-0">
//                 At StyleHub, we are committed to protecting your privacy. This
//                 policy explains how we collect, use, and safeguard your personal
//                 information when you visit and make purchases from our website
//               </p>
//             </div>

//             <div className="space-y-12">
//               {/* 1. Information We Collect */}
//               <div>
//                 <h2 className="text-3xl font-bold mb-4 text-gray-900">
//                   1. Information We Collect
//                 </h2>

//                 <div className="space-y-4 text-gray-700">
//                   <p className="leading-relaxed">
//                     We collect information you directly provide to us:
//                   </p>

//                   <p className="leading-relaxed">
//                     <strong className="text-gray-900">
//                       Personal Identifiers:
//                     </strong>{" "}
//                     Name, shipping address, email address, and phone number when
//                     you place an order or create an account.
//                   </p>

//                   <p className="leading-relaxed">
//                     <strong className="text-gray-900">
//                       Payment Information:
//                     </strong>{" "}
//                     Credit/debit card details or other payment information.
//                     Payments are processed securely by our payment processors
//                     (e.g., Stripe, PayPal). We do not store full card details on
//                     our servers.
//                   </p>

//                   <p className="leading-relaxed">
//                     <strong className="text-gray-900">Order History:</strong> A
//                     record of the products you purchase.
//                   </p>

//                   <p className="leading-relaxed">
//                     <strong className="text-gray-900">Communication:</strong>{" "}
//                     Any communication you send us, including support requests.
//                   </p>

//                   <p className="leading-relaxed">
//                     We also automatically collect certain information when you
//                     visit our site:
//                   </p>

//                   <p className="leading-relaxed">
//                     <strong className="text-gray-900">Technical Data:</strong>{" "}
//                     IP address, browser type, device info, and your interactions
//                     with our website (e.g., pages viewed), collected via cookies
//                     and similar technologies.
//                   </p>
//                 </div>
//               </div>

//               {/* 2. How We Use Your Information */}
//               <div>
//                 <h2 className="text-3xl font-bold mb-4 text-gray-900">
//                   2. How We Use Your Information
//                 </h2>

//                 <ul className="space-y-2 text-gray-700">
//                   <li className="leading-relaxed">
//                     To process and fulfill your orders
//                   </li>
//                   <li className="leading-relaxed">
//                     To provide invoices, receipts, and order confirmations
//                   </li>
//                   <li className="leading-relaxed">
//                     To respond to inquiries and provide customer support
//                   </li>
//                   <li className="leading-relaxed">
//                     To analyze site usage and improve our store
//                   </li>
//                   <li className="leading-relaxed">
//                     For marketing (only with your consent). You can opt out
//                     anytime.
//                   </li>
//                 </ul>
//               </div>

//               {/* 3. Sharing Information */}
//               <div>
//                 <h2 className="text-3xl font-bold mb-4 text-gray-900">
//                   3. Sharing Your Information
//                 </h2>

//                 <p className="text-gray-700 leading-relaxed mb-4">
//                   We do not sell your personal information. We share it only in
//                   limited circumstances:
//                 </p>

//                 <ul className="space-y-2 text-gray-700">
//                   <li className="leading-relaxed">
//                     <strong className="text-gray-900">
//                       Service Providers:
//                     </strong>{" "}
//                     Shipping carriers, payment processors, email platforms, etc.
//                   </li>
//                   <li className="leading-relaxed">
//                     <strong className="text-gray-900">
//                       Legal Obligations:
//                     </strong>{" "}
//                     When required by law or legal proceedings.
//                   </li>
//                 </ul>
//               </div>

//               {/* 4. Cookies */}
//               <div>
//                 <h2 className="text-3xl font-bold mb-4 text-gray-900">
//                   4. Cookies
//                 </h2>

//                 <p className="text-gray-700 leading-relaxed">
//                   We use cookies to remember preferences, analyze traffic, and
//                   improve your shopping experience. You can disable cookies in
//                   your browser settings, but some site features may not work
//                   properly.
//                 </p>
//               </div>

//               {/* 5. Data Retention */}
//               <div>
//                 <h2 className="text-3xl font-bold mb-4 text-gray-900">
//                   5. Data Retention
//                 </h2>

//                 <p className="text-gray-700 leading-relaxed">
//                   We retain your information only as long as necessary to
//                   fulfill the purposes for which it was collected, including
//                   legal, accounting, or reporting requirements.
//                 </p>
//               </div>

//               {/* 6. Your Rights */}
//               <div>
//                 <h2 className="text-3xl font-bold mb-4 text-gray-900">
//                   6. Your Rights
//                 </h2>

//                 <p className="text-gray-700 leading-relaxed mb-4">
//                   You may have rights depending on your location:
//                 </p>

//                 <ul className="space-y-2 text-gray-700">
//                   <li className="leading-relaxed">
//                     Access and correct personal information
//                   </li>
//                   <li className="leading-relaxed">
//                     Request deletion of your data
//                   </li>
//                   <li className="leading-relaxed">
//                     Opt out of marketing emails anytime
//                   </li>
//                   <li className="leading-relaxed">
//                     Request your information in a portable format
//                   </li>
//                 </ul>

//                 <p className="leading-relaxed text-gray-700">
//                   To exercise these rights, contact us at:{" "}
//                 </p>
//               </div>

//               {/* 7. Data Security */}
//               <div>
//                 <h2 className="text-3xl font-bold mb-4 text-gray-900">
//                   7. Data Security
//                 </h2>

//                 <p className="text-gray-700 leading-relaxed">
//                   We use industry-standard security measures to protect your
//                   data. However, no method of transmission over the internet is
//                   100% secure.
//                 </p>
//               </div>

//               {/* 8. Changes to Policy */}
//               <div>
//                 <h2 className="text-3xl font-bold mb-4 text-gray-900">
//                   8. Changes to This Policy
//                 </h2>

//                 <p className="text-gray-700 leading-relaxed">
//                   We may update this policy from time to time. Updates will be
//                   shown on this page along with a revised "Last Updated" date.
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>
//     </div>
//   );
// };

import { useTranslation } from "@/lib/i18n";

export const PrivacyPage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-40 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-600 via-green-500 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-6xl font-bold mb-6">
            {t("privacy_policy.hero.title")}
          </h1>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto prose prose-lg">
            {/* Intro Section */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-2xl mb-12">
              <p className="text-lg text-gray-700 leading-relaxed m-0">
                {t("privacy_policy.intro.text")}
              </p>
            </div>

            <div className="space-y-12">
              {/* 1. Information We Collect */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("privacy_policy.sections.informationWeCollect.title")}
                </h2>

                <div className="space-y-4 text-gray-700">
                  <p className="leading-relaxed">
                    {t(
                      "privacy_policy.sections.informationWeCollect.paragraphs.intro"
                    )}
                  </p>

                  <p className="leading-relaxed">
                    <strong className="text-gray-900">
                      {t(
                        "privacy_policy.sections.informationWeCollect.paragraphs.personalIdentifiers.label"
                      )}
                    </strong>{" "}
                    {t(
                      "privacy_policy.sections.informationWeCollect.paragraphs.personalIdentifiers.text"
                    )}
                  </p>

                  <p className="leading-relaxed">
                    <strong className="text-gray-900">
                      {t(
                        "privacy_policy.sections.informationWeCollect.paragraphs.paymentInformation.label"
                      )}
                    </strong>{" "}
                    {t(
                      "privacy_policy.sections.informationWeCollect.paragraphs.paymentInformation.text"
                    )}
                  </p>

                  <p className="leading-relaxed">
                    <strong className="text-gray-900">
                      {t(
                        "privacy_policy.sections.informationWeCollect.paragraphs.orderHistory.label"
                      )}
                    </strong>{" "}
                    {t(
                      "privacy_policy.sections.informationWeCollect.paragraphs.orderHistory.text"
                    )}
                  </p>

                  <p className="leading-relaxed">
                    <strong className="text-gray-900">
                      {t(
                        "privacy_policy.sections.informationWeCollect.paragraphs.communication.label"
                      )}
                    </strong>{" "}
                    {t(
                      "privacy_policy.sections.informationWeCollect.paragraphs.communication.text"
                    )}
                  </p>

                  <p className="leading-relaxed">
                    {t(
                      "privacy_policy.sections.informationWeCollect.paragraphs.autoIntro"
                    )}
                  </p>

                  <p className="leading-relaxed">
                    <strong className="text-gray-900">
                      {t(
                        "privacy_policy.sections.informationWeCollect.paragraphs.technicalData.label"
                      )}
                    </strong>{" "}
                    {t(
                      "privacy_policy.sections.informationWeCollect.paragraphs.technicalData.text"
                    )}
                  </p>
                </div>
              </div>

              {/* 2. How We Use Your Information */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("privacy_policy.sections.howWeUseInfo.title")}
                </h2>

                <ul className="space-y-2 text-gray-700">
                  {(
                    t("privacy_policy.sections.howWeUseInfo.list", {
                      returnObjects: true,
                    }) as string[]
                  ).map((item, index) => (
                    <li key={index} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3. Sharing Information */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("privacy_policy.sections.sharingInfo.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed mb-4">
                  {t("privacy_policy.sections.sharingInfo.intro")}
                </p>

                <ul className="space-y-2 text-gray-700">
                  {(
                    t("privacy_policy.sections.sharingInfo.list", {
                      returnObjects: true,
                    }) as Array<{ label: string; text: string }>
                  ).map((item, index) => (
                    <li key={index} className="leading-relaxed">
                      <strong className="text-gray-900">{item.label}</strong>{" "}
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 4. Cookies */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("privacy_policy.sections.cookies.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed">
                  {t("privacy_policy.sections.cookies.text")}
                </p>
              </div>

              {/* 5. Data Retention */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("privacy_policy.sections.dataRetention.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed">
                  {t("privacy_policy.sections.dataRetention.text")}
                </p>
              </div>

              {/* 6. Your Rights */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("privacy_policy.sections.yourRights.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed mb-4">
                  {t("privacy_policy.sections.yourRights.intro")}
                </p>

                <ul className="space-y-2 text-gray-700">
                  {(
                    t("privacy_policy.sections.yourRights.list", {
                      returnObjects: true,
                    }) as string[]
                  ).map((item, index) => (
                    <li key={index} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>

                <p className="leading-relaxed text-gray-700 mt-4">
                  {t("privacy_policy.sections.yourRights.contact")}
                </p>
              </div>

              {/* 7. Data Security */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("privacy_policy.sections.dataSecurity.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed">
                  {t("privacy_policy.sections.dataSecurity.text")}
                </p>
              </div>

              {/* 8. Changes to Policy */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("privacy_policy.sections.changes.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed">
                  {t("privacy_policy.sections.changes.text")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
