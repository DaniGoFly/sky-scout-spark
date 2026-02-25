import { memo, useState, useEffect } from "react";
import { Shield, Banknote, Clock, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

const TrustSignals = memo(() => {
  const { t } = useTranslation();
  const [secondsAgo, setSecondsAgo] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo((prev) => (prev >= 30 ? 3 : prev + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const signals = [
    { icon: Banknote, text: t("trust.airlines") },
    { icon: Shield, text: t("trust.no_fees") },
    { icon: Lock, text: t("trust.secure") },
    { icon: Clock, text: t("trust.updated", { seconds: secondsAgo }) },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-6 px-4 sm:px-6 text-xs sm:text-sm text-muted-foreground/70 bg-background border-t border-b border-border/20">
      {signals.map(({ icon: Icon, text }, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-primary/40" />
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
});
TrustSignals.displayName = "TrustSignals";

export default TrustSignals;
