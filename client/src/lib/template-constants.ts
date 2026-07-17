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

export const WHATSAPP_LANGUAGES = [
  { code: "af", label: "Afrikaans" },
  { code: "sq", label: "Albanian" },
  { code: "ar", label: "Arabic" },
  { code: "az", label: "Azerbaijani" },
  { code: "bn", label: "Bengali" },
  { code: "bg", label: "Bulgarian" },
  { code: "ca", label: "Catalan" },
  { code: "zh_CN", label: "Chinese (Simplified)" },
  { code: "zh_HK", label: "Chinese (Hong Kong)" },
  { code: "zh_TW", label: "Chinese (Traditional)" },
  { code: "hr", label: "Croatian" },
  { code: "cs", label: "Czech" },
  { code: "da", label: "Danish" },
  { code: "nl", label: "Dutch" },
  { code: "en", label: "English" },
  { code: "en_GB", label: "English (UK)" },
  { code: "en_US", label: "English (US)" },
  { code: "et", label: "Estonian" },
  { code: "fil", label: "Filipino" },
  { code: "fi", label: "Finnish" },
  { code: "fr", label: "French" },
  { code: "ka", label: "Georgian" },
  { code: "de", label: "German" },
  { code: "el", label: "Greek" },
  { code: "gu", label: "Gujarati" },
  { code: "ha", label: "Hausa" },
  { code: "he", label: "Hebrew" },
  { code: "hi", label: "Hindi" },
  { code: "hu", label: "Hungarian" },
  { code: "id", label: "Indonesian" },
  { code: "ga", label: "Irish" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "kn", label: "Kannada" },
  { code: "kk", label: "Kazakh" },
  { code: "rw_RW", label: "Kinyarwanda" },
  { code: "ko", label: "Korean" },
  { code: "ky_KG", label: "Kyrgyz" },
  { code: "lo", label: "Lao" },
  { code: "lv", label: "Latvian" },
  { code: "lt", label: "Lithuanian" },
  { code: "mk", label: "Macedonian" },
  { code: "ms", label: "Malay" },
  { code: "ml", label: "Malayalam" },
  { code: "mr", label: "Marathi" },
  { code: "nb", label: "Norwegian" },
  { code: "fa", label: "Persian" },
  { code: "pl", label: "Polish" },
  { code: "pt_BR", label: "Portuguese (Brazil)" },
  { code: "pt_PT", label: "Portuguese (Portugal)" },
  { code: "pa", label: "Punjabi" },
  { code: "ro", label: "Romanian" },
  { code: "ru", label: "Russian" },
  { code: "sr", label: "Serbian" },
  { code: "sk", label: "Slovak" },
  { code: "sl", label: "Slovenian" },
  { code: "es", label: "Spanish" },
  { code: "es_AR", label: "Spanish (Argentina)" },
  { code: "es_ES", label: "Spanish (Spain)" },
  { code: "es_MX", label: "Spanish (Mexico)" },
  { code: "sw", label: "Swahili" },
  { code: "sv", label: "Swedish" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "th", label: "Thai" },
  { code: "tr", label: "Turkish" },
  { code: "uk", label: "Ukrainian" },
  { code: "ur", label: "Urdu" },
  { code: "uz", label: "Uzbek" },
  { code: "vi", label: "Vietnamese" },
  { code: "zu", label: "Zulu" },
] as const;

export const MARKETING_SUBTYPES = [
  { value: "CUSTOM", label: "Custom", description: "Standard marketing template with text, media, and buttons" },
  { value: "COUPON_CODE", label: "Coupon Code", description: "Template with a copy-code button for promotional codes" },
  { value: "LIMITED_TIME_OFFER", label: "Limited-Time Offer", description: "Template with countdown timer and expiration" },
  { value: "CAROUSEL", label: "Media Card Carousel", description: "Scrollable cards with images/videos and buttons (2-10 cards)" },
  { value: "CATALOG", label: "Catalog", description: "Links to your product catalog" },
  { value: "MPM", label: "Multi-Product Message", description: "Showcase multiple products from your catalog" },
  { value: "SPM", label: "Single-Product Message", description: "Feature a single product from your catalog" },
  { value: "CALL_PERMISSION", label: "Call Permission Request", description: "Request permission to call the customer" },
  { value: "PRODUCT_CAROUSEL", label: "Product Card Carousel", description: "Scrollable product cards from your catalog" },
] as const;

export const AUTH_TYPES = [
  { value: "COPY_CODE", label: "Copy Code", description: "User copies the OTP code manually" },
  { value: "ONE_TAP", label: "One-Tap Autofill", description: "One-tap button auto-fills the OTP in your app" },
  { value: "ZERO_TAP", label: "Zero-Tap", description: "OTP is delivered silently to your app (no user action needed)" },
] as const;

export type MarketingSubType = typeof MARKETING_SUBTYPES[number]["value"];
export type AuthType = typeof AUTH_TYPES[number]["value"];
