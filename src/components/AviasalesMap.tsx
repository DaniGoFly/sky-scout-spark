import { useEffect, useRef } from "react";
import { buildMapWidgetUrl } from "@/lib/aviasalesConfig";

const AviasalesMap = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing content
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = buildMapWidgetUrl();
    script.charset = "utf-8";
    script.async = true;

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <section className="py-12 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6">Explore Prices on Map</h2>
        <div ref={containerRef} className="aviasales-map-container flex justify-center" />
      </div>
    </section>
  );
};

export default AviasalesMap;
