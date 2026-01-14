import { useSearchParams, Link } from "react-router-dom";
import { ArrowRight, Calendar, Users, ArrowLeft } from "lucide-react";
import { format, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import AviasalesEmbed from "./AviasalesEmbed";

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
      return format(date, "EEE, MMM d");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Back button and search summary */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to="/" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            New Search
          </Link>
        </Button>
        
        <div className="p-4 bg-card/60 backdrop-blur-sm rounded-xl border border-border/40">
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
      </div>

      {/* Flight search CTA */}
      <div className="bg-card rounded-2xl border border-border/40 overflow-hidden shadow-card">
        <AviasalesEmbed />
      </div>
    </div>
  );
};

export default FlightResultsEmbed;
