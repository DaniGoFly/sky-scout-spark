import { memo, useState, useEffect } from "react";
import { Shield, Banknote, Clock } from "lucide-react";
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
    { icon: Banknote, text: t("trust.airlines", "Prices from 600+ airlines") },
    { icon: Shield, text: t("trust.no_fees", "No hidden fees") },
    { icon: Clock, text: t("trust.updated", "Updated {{seconds}}s ago").replace("{{seconds}}", String(secondsAgo)) },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 py-2 px-4 text-xs md:text-sm text-muted-foreground w-full max-w-full">
      {signals.map(({ icon: Icon, text }, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-primary/70" />
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
});
TrustSignals.displayName = "TrustSignals";

export default TrustSignals;
