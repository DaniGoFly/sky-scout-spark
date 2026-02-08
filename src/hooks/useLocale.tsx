import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { detectDefaultCurrency, isRtlLanguage } from "@/i18n/config";

interface LocaleContextValue {
  currency: string;
  setCurrency: (currency: string) => void;
  formatPrice: (amount: number, originalCurrency?: string) => string;
  formatDate: (dateStr: string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number) => string;
  isRtl: boolean;
  locale: string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const CURRENCY_KEY = "gff_currency";

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

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [currency, setCurrencyState] = useState(getInitialCurrency);

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

  const setCurrency = useCallback((newCurrency: string) => {
    const upper = newCurrency.toUpperCase();
    setCurrencyState(upper);
    localStorage.setItem(CURRENCY_KEY, upper);
  }, []);

  // Build full locale string for Intl (e.g., "de-DE", "en-US")
  const fullLocale = useMemo(() => {
    // If browser has a full locale like "de-DE", use that when base matches
    const browserLocale = navigator.language || "en";
    const browserBase = browserLocale.split("-")[0];
    if (browserBase === locale.split("-")[0] && browserLocale.includes("-")) {
      return browserLocale;
    }
    // Fallback locale mapping
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

  const formatPrice = useCallback(
    (amount: number, _originalCurrency?: string) => {
      try {
        return new Intl.NumberFormat(fullLocale, {
          style: "currency",
          currency: currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Math.round(amount));
      } catch {
        return `${currency} ${Math.round(amount)}`;
      }
    },
    [fullLocale, currency]
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
      formatPrice,
      formatDate,
      formatNumber,
      isRtl,
      locale: fullLocale,
    }),
    [currency, setCurrency, formatPrice, formatDate, formatNumber, isRtl, fullLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
