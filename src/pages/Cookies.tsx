import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Cookies = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground mb-8">{t("legal.cookies_title")}</h1>
          <p className="text-muted-foreground mb-6">{t("legal.last_updated")}</p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">{t("legal.cookies_what_title")}</h2>
              <p className="text-muted-foreground leading-relaxed">{t("legal.cookies_what_text")}</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">{t("cookie.necessary")}</h2>
              <p className="text-muted-foreground leading-relaxed">{t("legal.cookies_necessary_text")}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
                <li>{t("legal.cookies_necessary_1")}</li>
                <li>{t("legal.cookies_necessary_2")}</li>
                <li>{t("legal.cookies_necessary_3")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">{t("cookie.analytics")}</h2>
              <p className="text-muted-foreground leading-relaxed">{t("legal.cookies_analytics_text")}</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">{t("cookie.marketing")}</h2>
              <p className="text-muted-foreground leading-relaxed">{t("legal.cookies_marketing_text")}</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">{t("legal.cookies_manage_title")}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">{t("legal.cookies_manage_text")}</p>
              <Button
                variant="outline"
                onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))}
              >
                {t("cookie.manage")}
              </Button>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cookies;
