import { Search, TrendingDown, Shield, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

const WhyUseSection = () => {
  const { t } = useTranslation();

  const features = [
    { icon: Search, title: t("why_us.feature1_title"), description: t("why_us.feature1_desc") },
    { icon: TrendingDown, title: t("why_us.feature2_title"), description: t("why_us.feature2_desc") },
    { icon: Shield, title: t("why_us.feature3_title"), description: t("why_us.feature3_desc") },
    { icon: Zap, title: t("why_us.feature4_title"), description: t("why_us.feature4_desc") },
  ];

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-card/30">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center mb-14">
          <span className="text-primary text-xs font-semibold uppercase tracking-[0.15em] mb-3 block">{t("why_us.badge")}</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">{t("why_us.title")}</h2>
          <p className="text-muted-foreground text-[15px] max-w-xl mx-auto mt-3 leading-relaxed">{t("why_us.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <div key={index} className="text-center p-7 rounded-2xl bg-card/60 hover:bg-card transition-all duration-300 border border-border/30 hover:border-border/50 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2.5">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUseSection;