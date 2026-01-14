import { useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { format, parse } from "date-fns";
import { ExternalLink, Plane, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const AFFILIATE_MARKER = "694224";

const AviasalesEmbed = () => {
  const [searchParams] = useSearchParams();
  const [iframeError, setIframeError] = useState(false);

  const { aviasalesUrl, from, to, depart, returnDate, trip } = useMemo(() => {
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const depart = searchParams.get("depart") || "";
    const returnDate = searchParams.get("return");
    const adults = searchParams.get("adults") || "1";
    const trip = searchParams.get("trip") || "roundtrip";

    if (!from || !to || !depart) {
      return { aviasalesUrl: null, from, to, depart, returnDate, trip };
    }

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

    // Add passengers
    urlPath += adults;

    const aviasalesUrl = `https://www.aviasales.com/search/${urlPath}?marker=${AFFILIATE_MARKER}`;
    
    return { aviasalesUrl, from, to, depart, returnDate, trip };
  }, [searchParams]);

  // Format date for display
  const formatDisplayDate = (dateStr: string) => {
    try {
      const date = parse(dateStr, "yyyy-MM-dd", new Date());
      return format(date, "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  if (!aviasalesUrl) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-card rounded-xl border border-border">
        <div className="text-center text-muted-foreground">
          <p>Invalid search parameters</p>
        </div>
      </div>
    );
  }

  // Always show the call-to-action card (iframe embedding is blocked by Aviasales)
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {/* Flight route visualization */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Plane className="w-8 h-8 text-primary" />
          </div>
          <span className="text-2xl font-bold text-foreground">{from}</span>
          <span className="text-sm text-muted-foreground">{formatDisplayDate(depart)}</span>
        </div>
        
        <div className="flex flex-col items-center px-6">
          <ArrowRight className="w-8 h-8 text-primary mb-2" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {trip === "roundtrip" ? "Round Trip" : "One Way"}
          </span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-2">
            <Plane className="w-8 h-8 text-accent rotate-90" />
          </div>
          <span className="text-2xl font-bold text-foreground">{to}</span>
          {trip === "roundtrip" && returnDate && (
            <span className="text-sm text-muted-foreground">{formatDisplayDate(returnDate)}</span>
          )}
        </div>
      </div>

      {/* Main CTA */}
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-foreground mb-3">
          View Live Flight Prices
        </h2>
        <p className="text-muted-foreground mb-6">
          Click below to see all available flights, compare prices from multiple airlines, and book your tickets.
        </p>
        
        <Button
          size="lg"
          className="gap-2 px-8 py-6 text-lg rounded-xl shadow-button"
          onClick={() => window.open(aviasalesUrl, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="w-5 h-5" />
          Search Flights on Aviasales
        </Button>
        
        <p className="text-xs text-muted-foreground mt-4">
          Opens in a new tab • Powered by Aviasales
        </p>
      </div>

      {/* Features */}
      <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Compare 500+ airlines</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>Best price guarantee</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span>No booking fees</span>
        </div>
      </div>
    </div>
  );
};

export default AviasalesEmbed;
