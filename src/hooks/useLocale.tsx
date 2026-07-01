import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  detectDefaultCurrency,
  isRtlLanguage,
  detectMarketCode,
  LANGUAGE_TO_CURRENCY,
  COUNTRY_TO_CURRENCY,
} from "@/i18n/config";
import { ensureFxRates, getCachedFxRates, convertAmount } from "@/lib/fxRates";

interface LocaleContextValue {
  currency: string;
  setCurrency: (currency: string) => void;
  currencyLocked: boolean;
  setCurrencyAuto: () => void;
  formatPrice: (amount: number, originalCurrency?: string) => string;
  formatDate: (dateStr: string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number) => string;
  isRtl: boolean;
  locale: string;
  marketCode: string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const CURRENCY_KEY = "gofly.currency";
const CURRENCY_LOCKED_KEY = "gofly.currency_locked";

function getInitialCurrency(): string {
  // 1. Check URL param
  const urlParams = new URLSearchParams(window.location.search);
  const urlCurrency = urlParams.get("cur");
  if (urlCurrency) return urlCurrency.toUpperCase();

  // 2. Check localStorage
  const stored = localStorage.getItem(CURRENCY_KEY);
  if (stored) return stored;

  // 3. Auto-detect
  return detectDefaultCurrency();
}

function getInitialLocked(): boolean {
  return localStorage.getItem(CURRENCY_LOCKED_KEY) === "true";
}

/** Derive best-fit currency from a language code */
function currencyFromLanguage(lang: string): string {
  const base = lang.split("-")[0].toLowerCase();
  // Check full code first (e.g. "en-GB")
  if (LANGUAGE_TO_CURRENCY[lang]) return LANGUAGE_TO_CURRENCY[lang];
  if (LANGUAGE_TO_CURRENCY[base]) return LANGUAGE_TO_CURRENCY[base];
  // Try to infer from country part
  const parts = lang.split("-");
  if (parts.length >= 2) {
    const country = parts[1].toUpperCase();
    if (COUNTRY_TO_CURRENCY[country]) return COUNTRY_TO_CURRENCY[country];
  }
  return detectDefaultCurrency();
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [currency, setCurrencyState] = useState(getInitialCurrency);
  const [currencyLocked, setCurrencyLocked] = useState(getInitialLocked);
  // Bumped every time FX rates load, so formatPrice re-runs and cards refresh.
  const [fxTick, setFxTick] = useState(0);

  const locale = i18n.language || "en";
  const isRtl = isRtlLanguage(locale);

  // Apply RTL direction and lang attribute to html element
  useEffect(() => {
    const htmlEl = document.documentElement;
    htmlEl.setAttribute("lang", locale);
    htmlEl.setAttribute("dir", isRtl ? "rtl" : "ltr");
    return () => {
      htmlEl.setAttribute("dir", "ltr");
    };
  }, [locale, isRtl]);

  /**
   * When language changes, auto-update currency ONLY if user hasn't locked it.
   * This gives instant feedback: switching to German → EUR, Turkish → TRY, etc.
   */
  useEffect(() => {
    if (currencyLocked) return;
    const suggested = currencyFromLanguage(locale);
    setCurrencyState(suggested);
    localStorage.setItem(CURRENCY_KEY, suggested);
  }, [locale, currencyLocked]);

  /** Manual currency selection — sets lock */
  const setCurrency = useCallback((newCurrency: string) => {
    const upper = newCurrency.toUpperCase();
    setCurrencyState(upper);
    setCurrencyLocked(true);
    localStorage.setItem(CURRENCY_KEY, upper);
    localStorage.setItem(CURRENCY_LOCKED_KEY, "true");
    console.log("[locale] currency changed →", upper);
  }, []);

  /** Reset to auto mode — re-derive from current language */
  const setCurrencyAuto = useCallback(() => {
    setCurrencyLocked(false);
    localStorage.removeItem(CURRENCY_LOCKED_KEY);
    const suggested = currencyFromLanguage(i18n.language || "en");
    setCurrencyState(suggested);
    localStorage.setItem(CURRENCY_KEY, suggested);
  }, [i18n.language]);

  /** Market code for API requests (country code like "DE", "US", "GB") */
  const marketCode = useMemo(() => {
    return detectMarketCode();
  }, []);

  // Fetch FX rates on mount and whenever currency changes, so we can
  // convert prices returned by the provider into the user's currency.
  useEffect(() => {
    let cancelled = false;
    ensureFxRates().then((r) => {
      if (cancelled) return;
      if (r) setFxTick((n) => n + 1);
    });
    return () => { cancelled = true; };
  }, [currency]);

  // Build full locale string for Intl (e.g., "de-DE", "en-US")
  const fullLocale = useMemo(() => {
    const browserLocale = navigator.language || "en";
    const browserBase = browserLocale.split("-")[0];
    if (browserBase === locale.split("-")[0] && browserLocale.includes("-")) {
      return browserLocale;
    }
    const localeMap: Record<string, string> = {
      en: "en-US",
      de: "de-DE",
      fr: "fr-FR",
      es: "es-ES",
      it: "it-IT",
      pt: "pt-PT",
      tr: "tr-TR",
      ar: "ar-SA",
    };
    return localeMap[locale] || locale;
  }, [locale]);

  /**
   * Format a price for display.
   * If `apiCurrency` is provided and differs from the user-selected currency,
   * the price is formatted using the API's original currency to prevent
   * displaying a number with a mismatched currency symbol.
   */
  /**
   * Format a price for display.
   * Always renders in the user-selected `currency`. When `apiCurrency`
   * differs, we convert using cached FX rates (frankfurter.dev, ECB).
   * If rates are unavailable, we fall back to the API currency so the
   * displayed number matches the displayed symbol.
   */
  const formatPrice = useCallback(
    (amount: number, apiCurrency?: string) => {
      const src = (apiCurrency || currency).toUpperCase();
      const dst = currency.toUpperCase();
      let value = amount;
      let renderCurrency = dst;

      if (src !== dst) {
        const rates = getCachedFxRates();
        const converted = convertAmount(amount, src, dst, rates);
        if (converted != null && Number.isFinite(converted)) {
          value = converted;
        } else {
          // No rate → render in the API currency to avoid symbol/value mismatch.
          renderCurrency = src;
        }
      }

      try {
        return new Intl.NumberFormat(fullLocale, {
          style: "currency",
          currency: renderCurrency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Math.round(value));
      } catch {
        return `${renderCurrency} ${Math.round(value)}`;
      }
    },
    // fxTick forces re-render when rates load after first paint.
    [fullLocale, currency, fxTick],
  );

  const formatDate = useCallback(
    (dateStr: string, options?: Intl.DateTimeFormatOptions) => {
      try {
        const date = new Date(dateStr);
        const defaultOpts: Intl.DateTimeFormatOptions = options || {
          weekday: "short",
          month: "short",
          day: "numeric",
        };
        return new Intl.DateTimeFormat(fullLocale, defaultOpts).format(date);
      } catch {
        return dateStr;
      }
    },
    [fullLocale]
  );

  const formatNumber = useCallback(
    (num: number) => {
      try {
        return new Intl.NumberFormat(fullLocale).format(num);
      } catch {
        return String(num);
      }
    },
    [fullLocale]
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      currencyLocked,
      setCurrencyAuto,
      formatPrice,
      formatDate,
      formatNumber,
      isRtl,
      locale: fullLocale,
      marketCode,
    }),
    [currency, setCurrency, currencyLocked, setCurrencyAuto, formatPrice, formatDate, formatNumber, isRtl, fullLocale, marketCode]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
