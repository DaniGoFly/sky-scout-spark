import { useEffect, useRef } from "react";
import { buildCalendarWidgetUrl } from "@/lib/aviasalesConfig";

const AviasalesCalendar = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing content
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = buildCalendarWidgetUrl();
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
        <h2 className="text-2xl font-bold text-center mb-6">Find the Best Travel Dates</h2>
        <div ref={containerRef} className="aviasales-calendar-container" />
      </div>
    </section>
  );
};

export default AviasalesCalendar;
