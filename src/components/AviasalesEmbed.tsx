import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { format, parse } from "date-fns";
import { Loader2 } from "lucide-react";

const AFFILIATE_MARKER = "694224";

interface AviasalesEmbedProps {
  className?: string;
}

const AviasalesEmbed = ({ className = "" }: AviasalesEmbedProps) => {
  const [searchParams] = useSearchParams();

  const aviasalesUrl = useMemo(() => {
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const depart = searchParams.get("depart") || "";
    const returnDate = searchParams.get("return");
    const adults = searchParams.get("adults") || "1";
    const trip = searchParams.get("trip") || "roundtrip";

    if (!from || !to || !depart) return null;

    // Parse dates and format as DDMM
    const departDateObj = parse(depart, "yyyy-MM-dd", new Date());
    const departFormatted = format(departDateObj, "ddMM");

    let urlPath = `${from}${departFormatted}${to}`;

    // Add return date for roundtrip
    if (trip === "roundtrip" && returnDate) {
      const returnDateObj = parse(returnDate, "yyyy-MM-dd", new Date());
      const returnFormatted = format(returnDateObj, "ddMM");
      urlPath += returnFormatted;
    }

    // Add passengers (format: 1 = 1 adult, 2 = 2 adults, etc.)
    urlPath += adults;

    // Build full URL with marker
    return `https://www.aviasales.com/search/${urlPath}?marker=${AFFILIATE_MARKER}`;
  }, [searchParams]);

  if (!aviasalesUrl) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-card rounded-xl border border-border">
        <div className="text-center text-muted-foreground">
          <p>Invalid search parameters</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`aviasales-embed-container ${className}`}>
      {/* Loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center bg-card rounded-xl z-0">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading flight results...</p>
        </div>
      </div>
      
      {/* Aviasales iframe */}
      <iframe
        src={aviasalesUrl}
        title="Flight Search Results"
        className="aviasales-iframe relative z-10"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
        loading="lazy"
      />
    </div>
  );
};

export default AviasalesEmbed;
