import { useEffect, useRef } from "react";

interface TravelpayoutsWidgetProps {
  className?: string;
}

const TravelpayoutsWidget = ({ className = "" }: TravelpayoutsWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current || !containerRef.current) return;

    // Widget colors matched to site design tokens:
    // Primary: hsl(199 89% 48%) = #0BA5E9
    // Accent: hsl(280 65% 60%) = #A855F7
    // Background light: hsl(220 25% 97%) = #F5F7FA
    // Foreground dark: hsl(220 25% 10%) = #171C26
    const widgetParams = new URLSearchParams({
      currency: "usd",
      trs: "488332",
      shmarker: "694224",
      show_hotels: "true",
      powered_by: "false",
      locale: "en",
      searchUrl: "www.aviasales.com/search",
      primary_override: "#369BDEff",
      color_button: "#32a8dd",
      color_icons: "#32a8dd",
      dark: "#121212ff",
      light: "#FFFFFF",
      secondary: "#FFFFFF",
      special: "#C4C4C4",
      color_focused: "#2485E6ff",
      border_radius: "0",
      no_labels: "true",
      plain: "true",
      promo_id: "7879",
      campaign_id: "100",
    });

    const script = document.createElement("script");
    script.src = `https://tpwgts.com/content?${widgetParams.toString()}`;
    script.async = true;
    script.charset = "utf-8";

    containerRef.current.appendChild(script);
    scriptLoaded.current = true;

    return () => {
      if (containerRef.current) {
        const existingScript = containerRef.current.querySelector('script');
        if (existingScript) {
          containerRef.current.removeChild(existingScript);
        }
      }
      scriptLoaded.current = false;
    };
  }, []);

  return (
    <div className={`travelpayouts-widget ${className}`}>
      <div 
        ref={containerRef} 
        className="tp-widget-inner"
        id="tp-widget-container"
      />
    </div>
  );
};

export default TravelpayoutsWidget;
