import { useSearchParams } from "react-router-dom";
import { ArrowRight, Calendar, Users, ExternalLink } from "lucide-react";
import { format, parse } from "date-fns";
import AviasalesEmbed from "./AviasalesEmbed";
import CompactSearchBar from "./CompactSearchBar";

const FlightResultsEmbed = () => {
  const [searchParams] = useSearchParams();

  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const depart = searchParams.get("depart") || "";
  const returnDate = searchParams.get("return");
  const adults = searchParams.get("adults") || "1";
  const trip = searchParams.get("trip") || "roundtrip";

  // Format dates for display
  const formatDisplayDate = (dateStr: string) => {
    try {
      const date = parse(dateStr, "yyyy-MM-dd", new Date());
      return format(date, "EEE, MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Compact search bar for new searches */}
      <div className="mb-6">
        <CompactSearchBar />
      </div>

      {/* Search summary */}
      <div className="mb-6 p-4 bg-card/60 backdrop-blur-sm rounded-xl border border-border/40">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span className="text-lg">{from}</span>
            <ArrowRight className="w-4 h-4 text-primary" />
            <span className="text-lg">{to}</span>
          </div>
          
          <div className="h-6 w-px bg-border hidden sm:block" />
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{formatDisplayDate(depart)}</span>
            {trip === "roundtrip" && returnDate && (
              <>
                <span className="text-muted-foreground/50">→</span>
                <span>{formatDisplayDate(returnDate)}</span>
              </>
            )}
          </div>
          
          <div className="h-6 w-px bg-border hidden sm:block" />
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{adults} {parseInt(adults) === 1 ? "Traveler" : "Travelers"}</span>
          </div>
          
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
            {trip === "roundtrip" ? "Round Trip" : "One Way"}
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ExternalLink className="w-3.5 h-3.5" />
        <span>Click on any flight to view details and book on Aviasales</span>
      </div>

      {/* Embedded Aviasales results */}
      <div className="bg-card rounded-2xl border border-border/40 overflow-hidden shadow-card">
        <AviasalesEmbed />
      </div>
    </div>
  );
};

export default FlightResultsEmbed;
