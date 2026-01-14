import { useEffect, useRef } from "react";

interface TravelpayoutsWidgetProps {
  className?: string;
}

const TravelpayoutsWidget = ({ className = "" }: TravelpayoutsWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current || !containerRef.current) return;

    // Create the widget script
    const script = document.createElement("script");
    script.src = "https://tpwgts.com/content?currency=usd&trs=488332&shmarker=694224&show_hotels=true&powered_by=false&locale=en&searchUrl=www.aviasales.com%2Fsearch&primary_override=%23369BDEff&color_button=%2332a8dd&color_icons=%2332a8dd&dark=%23121212ff&light=%23FFFFFF&secondary=%23FFFFFF&special=%23C4C4C4&color_focused=%232485E6ff&border_radius=0&no_labels=true&plain=true&promo_id=7879&campaign_id=100";
    script.async = true;
    script.charset = "utf-8";

    containerRef.current.appendChild(script);
    scriptLoaded.current = true;

    return () => {
      // Cleanup on unmount
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
    <div className={`travelpayouts-widget-container ${className}`}>
      <div 
        ref={containerRef} 
        className="w-full max-w-4xl mx-auto"
        id="tp-widget-container"
      />
      
      {/* Informational text */}
      <p className="text-center text-sm text-muted-foreground mt-4 px-4">
        Powered by Aviasales • Prices shown are live from airlines and booking sites
      </p>
    </div>
  );
};

export default TravelpayoutsWidget;
