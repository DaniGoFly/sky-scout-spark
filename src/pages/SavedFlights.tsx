import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Plane, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getSavedFlights, unsaveFlight, type SavedFlight } from "@/lib/savedFlights";
import { getAirlineName, getAirlineLogo, formatDuration } from "@/lib/flightNormalizer";
import { useLocale } from "@/hooks/useLocale";

const SavedFlights = () => {
  const { t } = useTranslation();
  const { formatPrice } = useLocale();
  const navigate = useNavigate();
  const [flights, setFlights] = useState<SavedFlight[]>(() => getSavedFlights());

  const handleRemove = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    unsaveFlight(id);
    setFlights(getSavedFlights());
  }, []);

  const handleClearAll = useCallback(() => {
    localStorage.removeItem("gofly_saved_flights");
    setFlights([]);
  }, []);

  const handleOpenFlight = useCallback((flight: SavedFlight) => {
    const departDate = flight.departureTime?.split(" ")[0] || flight.departureTime?.split("T")[0] || "";
    const returnDate = flight.return?.departureTime?.split(" ")[0] || flight.return?.departureTime?.split("T")[0] || "";
    const hasReturn = !!returnDate;

    const params = new URLSearchParams({
      from: flight.origin,
      to: flight.destination,
      ...(departDate && { depart: departDate }),
      ...(hasReturn && { return: returnDate }),
      adults: "1",
      trip: hasReturn ? "roundtrip" : "oneway",
      class: "economy",
    });

    navigate(`/search?${params.toString()}`);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-current" />
                Saved Flights
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {flights.length} {flights.length === 1 ? "flight" : "flights"} saved
              </p>
            </div>
            {flights.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-muted-foreground hover:text-destructive text-xs gap-1">
                <Trash2 className="w-3.5 h-3.5" />
                Clear all
              </Button>
            )}
          </div>

          {flights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
                <Heart className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">No saved flights yet</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Tap the heart icon on any flight card to save it here for later.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {flights.map((flight) => {
                const airlineName = getAirlineName(flight.airlines?.[0] || "");
                const airlineLogo = getAirlineLogo(flight.airlines?.[0] || "");
                const savedDate = new Date(flight.savedAt);
                const daysAgo = Math.floor((Date.now() - savedDate.getTime()) / 86400000);
                const savedLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;

                return (
                  <div
                    key={flight.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenFlight(flight)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleOpenFlight(flight); }}
                    className="rounded-xl border border-border/60 bg-card p-4 transition-all cursor-pointer hover:border-primary/40 hover:shadow-md active:scale-[0.995]"
                  >
                    <div className="flex items-start gap-3">
                      {/* Airline logo */}
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {airlineLogo ? (
                          <img src={airlineLogo} alt={airlineName} className="w-7 h-7 object-contain" loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <Plane className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>

                      {/* Flight info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {flight.origin} → {flight.destination}
                          </span>
                          <span className="text-xs text-muted-foreground">{airlineName}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {flight.departureTime?.split(" ")[0] || "—"} · {formatDuration(flight.durationMinutes)} · {flight.stopsCount === 0 ? "Direct" : `${flight.stopsCount} stop${flight.stopsCount > 1 ? "s" : ""}`}
                        </p>
                        {flight.return && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Return: {flight.return.origin} → {flight.return.destination} · {formatDuration(flight.return.durationMinutes)}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Saved {savedLabel}</p>
                      </div>

                      {/* Price + actions */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <p className="text-lg font-bold text-foreground">
                          {formatPrice(flight.price.amount, flight.price.currency)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleRemove(e, flight.id)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SavedFlights;
