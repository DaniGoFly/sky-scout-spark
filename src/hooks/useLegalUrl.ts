import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { legalSlugs, supportedLegalLocales, type LegalPageId } from "@/lib/legalContent";

/**
 * Returns the locale-aware legal page URL.
 */
export function useLegalUrl(pageId: LegalPageId): string {
  const { i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || "en";
  const locale = supportedLegalLocales.includes(lang) ? lang : "en";
  const slug = legalSlugs[locale]?.[pageId] || legalSlugs.en[pageId];
  return `/${locale}/${slug}`;
}
