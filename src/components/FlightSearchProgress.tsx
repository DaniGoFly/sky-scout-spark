import { Plane, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

interface FlightSearchProgressProps {
  progress: number;
  status: 'creating' | 'polling' | 'complete' | 'error' | 'idle' | 'no_results';
  flightsFound: number;
}

const FlightSearchProgress = ({ progress, status, flightsFound }: FlightSearchProgressProps) => {
  const { t } = useTranslation();

  const messages = [
    t("progress.searching_airlines"),
    t("progress.checking_availability"),
    t("progress.finding_prices"),
    t("progress.comparing"),
    t("progress.almost"),
  ];
  
  const messageIndex = Math.min(
    Math.floor(progress / 20),
    messages.length - 1
  );

  if (status === 'complete' || status === 'idle') return null;

  return (
    <div className="w-full max-w-2xl mx-auto py-12">
      <div className="flex flex-col items-center gap-6">
        {/* Animated plane */}
        <div className="relative w-full h-16">
          <div 
            className="absolute transition-all duration-500 ease-out"
            style={{ left: `${Math.min(progress, 95)}%`, transform: 'translateX(-50%)' }}
          >
            <div className="flex flex-col items-center">
              <Plane className="w-10 h-10 text-primary animate-bounce" />
              {flightsFound > 0 && (
                <span className="text-xs font-medium text-primary mt-1">
                  {t("progress.found", { count: flightsFound })}
                </span>
              )}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border" />
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {messages[messageIndex]}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>{t("progress.live_prices")}</span>
        </div>
      </div>
    </div>
  );
};

export default FlightSearchProgress;
