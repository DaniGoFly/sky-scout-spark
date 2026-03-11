import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  resolvePageId,
  getLegalContent,
  legalSlugs,
  supportedLegalLocales,
  type LegalPageId,
} from "@/lib/legalContent";

const LegalPage = () => {
  const { locale, slug } = useParams<{ locale: string; slug: string }>();
  const { i18n } = useTranslation();

  // If no locale/slug, redirect based on current language
  if (!locale || !slug) {
    return <Navigate to="/" replace />;
  }

  // Resolve page ID from locale + slug
  let pageId = resolvePageId(locale, slug);

  // If locale unsupported or slug not found, try English fallback
  if (!pageId) {
    // Maybe the slug matches English
    pageId = resolvePageId("en", slug);
    if (pageId) {
      // Redirect to the correct locale version
      const currentLang = i18n.language?.substring(0, 2) || "en";
      const targetLocale = supportedLegalLocales.includes(currentLang)
        ? currentLang
        : "en";
      const targetSlug = legalSlugs[targetLocale]?.[pageId] || slug;
      return <Navigate to={`/${targetLocale}/${targetSlug}`} replace />;
    }
    return <Navigate to="/404" replace />;
  }

  const content = getLegalContent(locale, pageId);
  const isCookiePage = pageId === "cookies";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground mb-8">
            {content.title}
          </h1>
          <p className="text-muted-foreground mb-6">
            {content.lastUpdated}
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            {content.sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  {section.title}
                </h2>
                {section.content && (
                  <p className="text-muted-foreground leading-relaxed">
                    {section.content}
                  </p>
                )}
                {section.items && (
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
                    {section.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {isCookiePage && (
              <section>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.dispatchEvent(new Event("open-cookie-settings"))
                  }
                >
                  {locale === "de"
                    ? "Cookie-Einstellungen verwalten"
                    : locale === "fr"
                      ? "Gérer les cookies"
                      : locale === "es"
                        ? "Gestionar cookies"
                        : "Manage Cookie Settings"}
                </Button>
              </section>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;
