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

import { create } from "zustand";
import { persist } from "zustand/middleware";

import enTranslations from "./translations/en.json";
import esTranslations from "./translations/es.json";
import frTranslations from "./translations/fr.json";
import deTranslations from "./translations/de.json";
import ptTranslations from "./translations/pt.json";
import arTranslations from "./translations/ar.json";
import hiTranslations from "./translations/hi.json";
import zhTranslations from "./translations/zh.json";

export interface LanguageConfig {
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  flag: string;
}

const staticLanguages: Record<string, LanguageConfig> = {
  en: { name: "English", nativeName: "En", direction: "ltr", flag: "🇬🇧" },
  es: { name: "Spanish", nativeName: "Es", direction: "ltr", flag: "🇪🇸" },
  fr: { name: "French", nativeName: "Fr", direction: "ltr", flag: "🇫🇷" },
  de: { name: "German", nativeName: "De", direction: "ltr", flag: "🇩🇪" },
  pt: { name: "Portuguese", nativeName: "Pt", direction: "ltr", flag: "🇧🇷" },
  ar: { name: "Arabic", nativeName: "Ar", direction: "rtl", flag: "🇸🇦" },
  hi: { name: "Hindi", nativeName: "Hi", direction: "ltr", flag: "🇮🇳" },
  zh: { name: "Chinese", nativeName: "Zh", direction: "ltr", flag: "🇨🇳" },
};

const staticTranslations: Record<string, any> = {
  en: enTranslations,
  es: esTranslations,
  fr: frTranslations,
  de: deTranslations,
  pt: ptTranslations,
  ar: arTranslations,
  hi: hiTranslations,
  zh: zhTranslations,
};

interface I18nState {
  language: string;
  userSelectedLanguage: boolean;
  languages: Record<string, LanguageConfig>;
  translationsCache: Record<string, any>;
  isLoadingLanguages: boolean;
  setLanguage: (language: string, userSelected?: boolean) => void;
  t: (path: string, variables?: Record<string, string | number>) => string;
  fetchEnabledLanguages: () => Promise<void>;
  loadTranslations: (code: string) => Promise<any>;
}


// Add this new function alongside normalizeArrays
function deepParseStrings(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepParseStrings);
  if (typeof obj === "string") {
    const trimmed = obj.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return deepParseStrings(JSON.parse(trimmed)); // parse and recurse
      } catch {
        return obj; // not valid JSON, keep as string
      }
    }
    return obj;
  }
  if (typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = deepParseStrings(obj[key]);
    }
    return result;
  }
  return obj;
}

function normalizeArrays(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(normalizeArrays);
  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    const isNumericKeys = keys.length > 0 && keys.every((k) => !isNaN(Number(k)));
    if (isNumericKeys) {
      return keys.sort((a, b) => Number(a) - Number(b)).map((k) => normalizeArrays(obj[k]));
    }
    const result: any = {};
    for (const key of keys) result[key] = normalizeArrays(obj[key]);
    return result;
  }
  return obj;
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      language: "en",
      userSelectedLanguage: false,
      languages: {  },
      translationsCache: {
  // en: enTranslations,
},
      isLoadingLanguages: false,

      fetchEnabledLanguages: async () => {
  // Sirf agar cache bilkul empty ho tab clear karo
  // set({ translationsCache: {} });  // ← YE LINE HATAO

  try {
    set({ isLoadingLanguages: true });
    const response = await fetch("/api/languages/enabled");
    if (!response.ok) throw new Error("Failed to fetch languages");
    const data = await response.json();

    const dynamicLanguages: Record<string, LanguageConfig> = {};
    for (const lang of data) {
      dynamicLanguages[lang.code] = {
        name: lang.name,
        nativeName: lang.nativeName || lang.name.substring(0, 2),
        direction: lang.direction || "ltr",
        flag: lang.icon || "",
      };
    }

    set({ languages: dynamicLanguages, isLoadingLanguages: false });

    const userSelected = get().userSelectedLanguage;
    const currentLang = get().language;
    const defaultLang = data.find((l: any) => l.isDefault);
    const defaultLangCode = defaultLang?.code || "en";

    let langToUse = currentLang;

    if (!userSelected && defaultLangCode) {
      langToUse = defaultLangCode;
    } else if (!dynamicLanguages[currentLang]) {
      langToUse = defaultLangCode;
    }

    if (langToUse !== currentLang) {
      const newUserSelectedState = !dynamicLanguages[currentLang] ? false : userSelected;
      get().setLanguage(langToUse, newUserSelectedState);
    } else {
      await get().loadTranslations(currentLang);
    }
  } catch (error) {
    console.error("Failed to fetch languages, using static fallback:", error);
    set({ languages: { ...staticLanguages }, isLoadingLanguages: false });
    // Static fallback mein current language load karo
    const currentLang = get().language;
    const fallback = staticTranslations[currentLang] || staticTranslations.en;
    set((state) => ({
      translationsCache: { ...state.translationsCache, [currentLang]: fallback },
    }));
  }
},

     loadTranslations: async (code: string, forceRefresh = false) => {
  const cache = get().translationsCache;

  // Skip cache only if NOT forcing refresh
  if (cache[code] && !forceRefresh) return cache[code];

  try {
    const response = await fetch(`/api/languages/translations/${code}`);
    if (!response.ok) throw new Error("Failed to fetch translations");
    const raw = await response.json();
    const translations = deepParseStrings(normalizeArrays(raw));

    set((state) => ({
      translationsCache: { ...state.translationsCache, [code]: translations },
    }));
    return translations;
  } catch (error) {
    console.error(`Failed to load translations for ${code}:`, error);
    const fallback = staticTranslations[code] || staticTranslations.en;
    set((state) => ({
      translationsCache: { ...state.translationsCache, [code]: fallback },
    }));
    return fallback;
  }
},

setLanguage: async (language: string, userSelected?: boolean) => {
  const state = get();

  // Always force-fetch fresh translations on language change
  const translations = await state.loadTranslations(language, true); // ← forceRefresh: true

  if (userSelected !== undefined) {
    set({ language, userSelectedLanguage: userSelected });
  } else {
    set({ language });
  }

  const langConfig = state.languages[language];
  if (langConfig) {
    document.documentElement.dir = langConfig.direction;
    document.documentElement.lang = language;
  }
},

      // t: (path: string, variables?: Record<string, string | number>) => {
      //   const state = get();
      //   const currentTranslations =
      //     state.translationsCache[state.language] ||
      //     staticTranslations[state.language] ||
      //     staticTranslations.en;

      //   const keys = path.split(".");
      //   let value: any = currentTranslations;

      //   for (const key of keys) {
      //     value = value?.[key];
      //     if (!value) break;
      //   }

      //   let result = value || path;

      //   if (variables && typeof result === "string") {
      //     Object.keys(variables).forEach((key) => {
      //       const regex = new RegExp(`{{${key}}}`, "g");
      //       result = result.replace(regex, String(variables[key]));
      //     });
      //   }

      //   return result;
      // },


  t: (path: string, variables?: Record<string, string | number>) => {
  const state = get();

  // backend translations
  const backendTranslations =
    state.translationsCache[state.language] || {};

  // static fallback translations
  const fallbackTranslations =
    staticTranslations[state.language] ||
    staticTranslations.en ||
    {};

  const keys = path.split(".");

  const getNestedValue = (obj: any, keys: string[]) => {
    let value = obj;

    for (const key of keys) {
      value = value?.[key];

      if (value === undefined || value === null) {
        return undefined;
      }
    }

    return value;
  };

  // first try backend
  let value = getNestedValue(backendTranslations, keys);

  // fallback to static json
  if (value === undefined || value === null) {
    value = getNestedValue(fallbackTranslations, keys);
  }

  // still missing
  if (value === undefined || value === null) {
    return path;
  }

  // auto-parse JSON strings that are stringified arrays or objects
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        // not valid JSON, keep as string
      }
    }
  }

  // convert numeric-keyed objects back to arrays (DB deserialization safety)
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.keys(value).every((k) => !isNaN(Number(k)))
  ) {
    value = Object.values(value);
  }

  // variable replacement (only for strings)
  if (typeof value === "string" && variables) {
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      value = value.replace(regex, String(variables[key]));
    });
  }

  return value;
},
    }),
    {
  name: "i18n-storage",
  version: 2,
  partialize: (state) => ({ 
    language: state.language,
    userSelectedLanguage: state.userSelectedLanguage,
    translationsCache: state.translationsCache
  }),
}
  )
);

export function useTranslation() {
  const { t, language, setLanguage, languages, fetchEnabledLanguages, isLoadingLanguages } = useI18n();
  return { t, language, setLanguage, languages, fetchEnabledLanguages, isLoadingLanguages };
}

export type Language = string;
