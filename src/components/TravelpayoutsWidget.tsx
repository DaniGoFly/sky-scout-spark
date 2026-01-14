import { useEffect, useRef } from "react";

interface TravelpayoutsWidgetProps {
  className?: string;
}

const TravelpayoutsWidget = ({ className = "" }: TravelpayoutsWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current || !containerRef.current) return;

    const widgetParams = new URLSearchParams({
      currency: "usd",
      trs: "488332",
      shmarker: "694224",
      show_hotels: "true",
      powered_by: "false",
      locale: "en",
      searchUrl: "www.aviasales.com/search",
      primary_override: "#05B0D5",
      color_button: "#05B0D5",
      color_icons: "#05B0D5",
      dark: "#1a1a1a",
      light: "transparent",
      secondary: "rgba(255,255,255,0.1)",
      special: "#999999",
      color_focused: "#05B0D5",
      border_radius: "12",
      no_labels: "false",
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
