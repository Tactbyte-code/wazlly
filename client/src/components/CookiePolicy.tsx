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
import PolicyLayout, { PolicySection } from "./PolicyLayout";
import { useTranslation } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

const CookiePolicy = () => {
  const { t } = useTranslation();

  const whatAreCookiesParagraphs = t(
    "cookiePolicy.sections.whatAreCookies.paragraphs",
    { returnObjects: true }
  ) as string[];

  const howWeUseList = t("cookiePolicy.sections.howWeUseCookies.list", {
    returnObjects: true,
  }) as string[];

  const thirdPartyList = t("cookiePolicy.sections.thirdPartyCookies.list", {
    returnObjects: true,
  }) as string[];

  const cookieDurationList = t("cookiePolicy.sections.cookieDuration.list", {
    returnObjects: true,
  }) as string[];

  const browserSettingsList = t(
    "cookiePolicy.sections.managingCookies.browserSettings.list",
    { returnObjects: true }
  ) as string[];

  const optOutLinks = t(
    "cookiePolicy.sections.managingCookies.optOutLinks.links",
    { returnObjects: true }
  ) as { label: string; text: string; href: string }[];

  const impactList = t("cookiePolicy.sections.impactDisabling.list", {
    returnObjects: true,
  }) as string[];

  const updatesParagraphs = t("cookiePolicy.sections.updates.paragraphs", {
    returnObjects: true,
  }) as string[];

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const suportEmail = brandSettings?.supportEmail ?? "";

  return (
    <PolicyLayout
      title={t("cookiePolicy.hero.title")}
      lastUpdated={t("cookiePolicy.hero.lastUpdated")}
    >
      {/* What Are Cookies */}
      <PolicySection title={t("cookiePolicy.sections.whatAreCookies.title")}>
        {whatAreCookiesParagraphs.map((p, idx) => (
          <p key={idx}>{p}</p>
        ))}
      </PolicySection>

      {/* How We Use Cookies */}
      <PolicySection title={t("cookiePolicy.sections.howWeUseCookies.title")}>
        <p>{t("cookiePolicy.sections.howWeUseCookies.intro")}</p>
        <ul className="list-disc pl-6 space-y-2">
          {howWeUseList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </PolicySection>

      {/* Types of Cookies */}
      <PolicySection title={t("cookiePolicy.sections.typesOfCookies.title")}>
        <div className="space-y-6">
          {/* Essential Cookies */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("cookiePolicy.sections.typesOfCookies.essential.title")}
            </h3>
            <p>{t("cookiePolicy.sections.typesOfCookies.essential.text")}</p>
            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              <p>
                <strong>Examples:</strong>{" "}
                {t("cookiePolicy.sections.typesOfCookies.essential.examples")}
              </p>
            </div>
          </div>

          {/* Performance Cookies */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("cookiePolicy.sections.typesOfCookies.performance.title")}
            </h3>
            <p>{t("cookiePolicy.sections.typesOfCookies.performance.text")}</p>
            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              <p>
                <strong>Examples:</strong>{" "}
                {t("cookiePolicy.sections.typesOfCookies.performance.examples")}
              </p>
            </div>
          </div>

          {/* Functional Cookies */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("cookiePolicy.sections.typesOfCookies.functional.title")}
            </h3>
            <p>{t("cookiePolicy.sections.typesOfCookies.functional.text")}</p>
            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              <p>
                <strong>Examples:</strong>{" "}
                {t("cookiePolicy.sections.typesOfCookies.functional.examples")}
              </p>
            </div>
          </div>

          {/* Marketing Cookies */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("cookiePolicy.sections.typesOfCookies.marketing.title")}
            </h3>
            <p>{t("cookiePolicy.sections.typesOfCookies.marketing.text")}</p>
            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              <p>
                <strong>Examples:</strong>{" "}
                {t("cookiePolicy.sections.typesOfCookies.marketing.examples")}
              </p>
            </div>
          </div>
        </div>
      </PolicySection>

      {/* Third-Party Cookies */}
      <PolicySection title={t("cookiePolicy.sections.thirdPartyCookies.title")}>
        <p>{t("cookiePolicy.sections.thirdPartyCookies.intro")}</p>
        <ul className="list-disc pl-6 space-y-2">
          {thirdPartyList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <p>{t("cookiePolicy.sections.thirdPartyCookies.outro")}</p>
      </PolicySection>

      {/* Cookie Duration */}
      <PolicySection title={t("cookiePolicy.sections.cookieDuration.title")}>
        <p>{t("cookiePolicy.sections.cookieDuration.intro")}</p>
        <ul className="list-disc pl-6 space-y-2">
          {cookieDurationList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <p>{t("cookiePolicy.sections.cookieDuration.extra")}</p>
      </PolicySection>

      {/* Managing Cookie Preferences */}
      <PolicySection title={t("cookiePolicy.sections.managingCookies.title")}>
        <p>{t("cookiePolicy.sections.managingCookies.intro")}</p>

        <div className="space-y-4">
          {/* Browser Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("cookiePolicy.sections.managingCookies.browserSettings.title")}
            </h3>
            <p>
              {t("cookiePolicy.sections.managingCookies.browserSettings.text")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              {browserSettingsList.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Cookie Consent Manager */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("cookiePolicy.sections.managingCookies.consentManager.title")}
            </h3>
            <p>
              {t("cookiePolicy.sections.managingCookies.consentManager.text")}
            </p>
          </div>

          {/* Opt-Out Links */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("cookiePolicy.sections.managingCookies.optOutLinks.title")}
            </h3>
            <p>
              {t("cookiePolicy.sections.managingCookies.optOutLinks.intro")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              {optOutLinks.map((link, idx) => (
                <li key={idx}>
                  <strong>{link.label}</strong>{" "}
                  <a
                    href={link.href}
                    className="text-green-600 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PolicySection>

      {/* Impact of Disabling Cookies */}
      <PolicySection title={t("cookiePolicy.sections.impactDisabling.title")}>
        <p>{t("cookiePolicy.sections.impactDisabling.intro")}</p>
        <ul className="list-disc pl-6 space-y-2">
          {impactList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </PolicySection>

      {/* Updates to This Policy */}
      <PolicySection title={t("cookiePolicy.sections.updates.title")}>
        {updatesParagraphs.map((p, idx) => (
          <p key={idx}>{p}</p>
        ))}
      </PolicySection>

      {/* Contact Us */}
      <PolicySection title={t("cookiePolicy.sections.contact.title")}>
        <p>{t("cookiePolicy.sections.contact.intro")}</p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p>
            <strong>{t("cookiePolicy.sections.contact.emailLabel")}</strong>{" "}
            <a
              href={`mailto:${t("cookiePolicy.sections.contact.email")}`}
              className="text-green-600 hover:underline"
            >
              {t("cookiePolicy.sections.contact.email", {
                suportEmail,
              })}
            </a>
          </p>
          <p>
            <strong>{t("cookiePolicy.sections.contact.addressLabel")}</strong>{" "}
            {t("cookiePolicy.sections.contact.address")}
          </p>
          <p>
            <strong>{t("cookiePolicy.sections.contact.phoneLabel")}</strong>{" "}
            {t("cookiePolicy.sections.contact.phone")}
          </p>
        </div>
      </PolicySection>
    </PolicyLayout>
  );
};

export default CookiePolicy;
