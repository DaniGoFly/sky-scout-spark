import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { legalSlugs, supportedLegalLocales, type LegalPageId } from "@/lib/legalContent";

/**
 * Redirects old /privacy-policy style URLs to the locale-prefixed version
 * based on the user's current language.
 */
const LegalRedirect = ({ pageId }: { pageId: LegalPageId }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || "en";
  const locale = supportedLegalLocales.includes(lang) ? lang : "en";
  const slug = legalSlugs[locale]?.[pageId] || legalSlugs.en[pageId];
  return <Navigate to={`/${locale}/${slug}`} replace />;
};

export default LegalRedirect;
