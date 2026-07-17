/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * ============================================================
 */

import { useTranslation } from "@/lib/i18n";

export const DeleteAccount = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-40 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-600 via-green-500 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-6xl font-bold mb-6">
            {t("account_deletion.hero.title")}
          </h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            {t("account_deletion.hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto prose prose-lg">
            {/* Intro */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-2xl mb-12">
              <p className="text-lg text-gray-700 leading-relaxed m-0">
                {t("account_deletion.intro.text")}
              </p>
            </div>

            <div className="space-y-12">
              {/* 1. How to request deletion */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("account_deletion.sections.howToRequest.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed mb-4">
                  {t("account_deletion.sections.howToRequest.intro")}
                </p>

                <div className="space-y-4 text-gray-700">

                  <div className="leading-relaxed">
                    <strong className="text-gray-900">
                      {t("account_deletion.sections.howToRequest.email.label")}
                    </strong>{" "}
                    {t("account_deletion.sections.howToRequest.email.text")}
                    <ul className="mt-2 space-y-1">
                      {(
                        t("account_deletion.sections.howToRequest.email.fields", {
                          returnObjects: true,
                        }) as string[]
                      ).map((item, index) => (
                        <li key={index} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>


              {/* 2. What information we need */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("account_deletion.sections.infoNeeded.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed mb-4">
                  {t("account_deletion.sections.infoNeeded.intro")}
                </p>

                <ul className="space-y-2 text-gray-700">
                  {(
                    t("account_deletion.sections.infoNeeded.list", {
                      returnObjects: true,
                    }) as string[]
                  ).map((item, index) => (
                    <li key={index} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3. What gets deleted */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("account_deletion.sections.whatGetsDeleted.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed mb-4">
                  {t("account_deletion.sections.whatGetsDeleted.intro")}
                </p>

                <ul className="space-y-2 text-gray-700">
                  {(
                    t("account_deletion.sections.whatGetsDeleted.list", {
                      returnObjects: true,
                    }) as string[]
                  ).map((item, index) => (
                    <li key={index} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 4. Data we retain and why */}
              {/* <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("account_deletion.sections.dataRetained.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed">
                  {t("account_deletion.sections.dataRetained.text")}
                </p>
              </div> */}

              {/* 5. Timeframe */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("account_deletion.sections.timeframe.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed">
                  {t("account_deletion.sections.timeframe.text")}
                </p>
              </div>

              {/* 6. Confirmation */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("account_deletion.sections.confirmation.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed">
                  {t("account_deletion.sections.confirmation.text")}
                </p>
              </div>

              {/* 7. Facebook / third-party login data */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("account_deletion.sections.thirdPartyLogin.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed">
                  {t("account_deletion.sections.thirdPartyLogin.text")}
                </p>
              </div>

              {/* 8. Contact */}
              <div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {t("account_deletion.sections.contact.title")}
                </h2>

                <p className="text-gray-700 leading-relaxed">
                  {t("account_deletion.sections.contact.text")}{" "}
                  <a
                    href={`mailto:${t("account_deletion.sections.contact.email")}`}
                    className="text-blue-600 hover:underline"
                  >
                    {t("account_deletion.sections.contact.email")}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};