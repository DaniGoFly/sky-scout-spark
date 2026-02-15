import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Impressum = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground mb-8">{t("legal.impressum_title")}</h1>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">{t("legal.impressum_operator")}</h2>
              <div className="text-muted-foreground leading-relaxed space-y-1">
                <p className="font-medium text-foreground">GoFlyFinder</p>
                <p>[Company Address]</p>
                <p>[City, Postal Code]</p>
                <p>[Country]</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">{t("legal.impressum_contact")}</h2>
              <div className="text-muted-foreground leading-relaxed space-y-1">
                <p>Email: contact@goflyfinder.com</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">{t("legal.impressum_responsible")}</h2>
              <p className="text-muted-foreground leading-relaxed">[Responsible Person Name]</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">{t("legal.impressum_vat")}</h2>
              <p className="text-muted-foreground leading-relaxed">[VAT ID if applicable]</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">{t("legal.impressum_disclaimer")}</h2>
              <p className="text-muted-foreground leading-relaxed">{t("legal.impressum_disclaimer_text")}</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Impressum;
