import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import de from "./locales/de.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import it from "./locales/it.json";
import pt from "./locales/pt.json";
import tr from "./locales/tr.json";
import ar from "./locales/ar.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
] as const;

export const SUPPORTED_CURRENCIES = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
] as const;

/** Map language codes to default currencies */
const LANGUAGE_TO_CURRENCY: Record<string, string> = {
  de: "EUR",
  fr: "EUR",
  es: "EUR",
  it: "EUR",
  pt: "EUR",
  nl: "EUR",
  tr: "TRY",
  ar: "SAR",
  "en-US": "USD",
  "en-GB": "GBP",
  "en-AU": "AUD",
  "en-CA": "CAD",
  en: "USD",
};

/** Map country codes (ISO 3166-1 alpha-2) to currencies */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD", GB: "GBP", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR",
  PT: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", FI: "EUR",
  GR: "EUR", LU: "EUR", SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR",
  LT: "EUR", MT: "EUR", CY: "EUR", HR: "EUR",
  CH: "CHF", TR: "TRY", PL: "PLN", CZ: "CZK", HU: "HUF",
  SE: "SEK", DK: "DKK", NO: "NOK", RO: "RON", BG: "BGN",
  CA: "CAD", AU: "AUD", NZ: "NZD", JP: "JPY", KR: "KRW",
  CN: "CNY", IN: "INR", BR: "BRL", MX: "MXN", ZA: "ZAR",
  SA: "SAR", AE: "AED", EG: "EGP", IL: "ILS", RU: "RUB",
  UA: "UAH", TH: "THB", SG: "SGD", MY: "MYR", ID: "IDR",
  PH: "PHP", VN: "VND", TW: "TWD", HK: "HKD", AR: "ARS",
  CL: "CLP", CO: "COP", PE: "PEN",
};

/** RTL languages */
export const RTL_LANGUAGES = ["ar", "he", "fa", "ur"];

export function isRtlLanguage(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang.split("-")[0]);
}

/** Try to detect user's country code from browser locale */
function detectCountryCode(): string | null {
  const browserLang = navigator.language || "";
  // Extract region from locale like "de-DE", "en-US"
  const parts = browserLang.split("-");
  if (parts.length >= 2 && parts[1].length === 2) {
    return parts[1].toUpperCase();
  }
  // Try Intl
  try {
    const resolved = new Intl.DateTimeFormat().resolvedOptions();
    const locale = resolved.locale || "";
    const localeParts = locale.split("-");
    if (localeParts.length >= 2 && localeParts[localeParts.length - 1].length === 2) {
      return localeParts[localeParts.length - 1].toUpperCase();
    }
  } catch { /* ignore */ }
  return null;
}

/** Detect default currency: country → language → USD */
export function detectDefaultCurrency(): string {
  // 1. Try country code
  const country = detectCountryCode();
  if (country && COUNTRY_TO_CURRENCY[country]) return COUNTRY_TO_CURRENCY[country];
  // 2. Try language
  const browserLang = navigator.language || "en";
  if (LANGUAGE_TO_CURRENCY[browserLang]) return LANGUAGE_TO_CURRENCY[browserLang];
  const base = browserLang.split("-")[0];
  return LANGUAGE_TO_CURRENCY[base] || "USD";
}

/** Detect market code for API (country or fallback from language) */
export function detectMarketCode(): string {
  const country = detectCountryCode();
  if (country) return country;
  const browserLang = navigator.language || "en";
  const parts = browserLang.split("-");
  if (parts.length >= 2) return parts[1].toUpperCase();
  // Fallback language → country map
  const langToCountry: Record<string, string> = {
    de: "DE", fr: "FR", es: "ES", it: "IT", pt: "PT", tr: "TR", ar: "SA", en: "US",
  };
  return langToCountry[parts[0]] || "US";
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      fr: { translation: fr },
      es: { translation: es },
      it: { translation: it },
      pt: { translation: pt },
      tr: { translation: tr },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lang",
      lookupLocalStorage: "gff_language",
      caches: ["localStorage"],
    },
  });

export default i18n;
