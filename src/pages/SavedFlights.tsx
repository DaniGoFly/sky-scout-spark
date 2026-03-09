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
    const extractDate = (dt?: string | null) => {
      if (!dt) return "";
      const match = dt.match(/\d{4}-\d{2}-\d{2}/);
      return match?.[0] || "";
    };

    const params = new URLSearchParams(flight.searchParams ? Object.entries(flight.searchParams) : []);

    const departDate =
      flight.departDate ||
      params.get("depart") ||
      extractDate(flight.departureTime);

    const rawReturnDate =
      flight.returnDate ||
      params.get("return") ||
      extractDate(flight.return?.departureTime) ||
      "";

    const isRoundtrip =
      flight.tripType === "roundtrip" ||
      Boolean(flight.return) ||
      Boolean(rawReturnDate);

    const fallbackReturnDate = (() => {
      if (!isRoundtrip || rawReturnDate || !departDate) return rawReturnDate;
      const d = new Date(`${departDate}T12:00:00`);
      if (Number.isNaN(d.getTime())) return rawReturnDate;
      d.setDate(d.getDate() + 7);
      return d.toISOString().slice(0, 10);
    })();

    const restoredTripType = isRoundtrip ? "roundtrip" : "oneway";

    params.set("from", flight.origin);
    params.set("to", flight.destination);
    if (departDate) params.set("depart", departDate);
    if (isRoundtrip && fallbackReturnDate) params.set("return", fallbackReturnDate);
    else params.delete("return");

    params.set("trip", restoredTripType);
    params.set("adults", String(flight.adults ?? (Number(params.get("adults")) || 1)));
    params.set("children", String(flight.children ?? (Number(params.get("children")) || 0)));
    params.set("infants", String(flight.infants ?? (Number(params.get("infants")) || 0)));
    params.set("class", flight.travelClass || params.get("class") || "economy");

    if (flight.currency) params.set("currency", flight.currency);
    if (flight.market) params.set("market", flight.market);

    // Restore saved filters/sort/selection hints
    if (flight.sortBy) params.set("saved_sort", flight.sortBy);
    if (flight.filters?.stopsMode) params.set("saved_stops", flight.filters.stopsMode);
    if (flight.filters?.airlines?.length) params.set("saved_airlines", flight.filters.airlines.join(","));
    if (flight.filters?.departureTime?.length) params.set("saved_departure", flight.filters.departureTime.join(","));
    if (flight.filters?.priceRange) {
      params.set("saved_price_min", String(flight.filters.priceRange[0]));
      params.set("saved_price_max", String(flight.filters.priceRange[1]));
    }
    if (flight.filters?.selectedOrigin) params.set("saved_origin", flight.filters.selectedOrigin);
    if (typeof flight.filters?.hideLongLayovers === "boolean") {
      params.set("saved_hide_long_layovers", String(flight.filters.hideLongLayovers));
    }

    params.set("saved_trip", restoredTripType);
    params.set("saved_flight_id", flight.selection?.itineraryId || flight.id);
    if (flight.selection?.outboundFingerprint) params.set("saved_outbound_sig", flight.selection.outboundFingerprint);
    if (flight.selection?.inboundFingerprint) params.set("saved_inbound_sig", flight.selection.inboundFingerprint);

    const inboundRestoreSucceeded = isRoundtrip ? Boolean(params.get("return")) : true;

    if (isRoundtrip) {
      console.debug("[saved-flights][restore-roundtrip]", {
        savedTripType: flight.tripType,
        savedDepartureDate: flight.departDate || flight.searchParams?.depart,
        savedReturnDate: flight.returnDate || flight.searchParams?.return,
        savedOutboundItineraryId: flight.selection?.outboundItineraryId || flight.selection?.itineraryId || flight.id,
        savedInboundItineraryId: flight.selection?.inboundItineraryId,
        restoredTripType,
        restoredDepartureDate: params.get("depart"),
        restoredReturnDate: params.get("return"),
        inboundRestoreSucceeded,
      });
    }

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
                {t("saved.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {flights.length === 1 ? t("saved.flights_count", { count: flights.length }) : t("saved.flights_count_plural", { count: flights.length })}
              </p>
            </div>
            {flights.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-muted-foreground hover:text-destructive text-xs gap-1">
                <Trash2 className="w-3.5 h-3.5" />
                {t("saved.clear_all")}
              </Button>
            )}
          </div>

          {flights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
                <Heart className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">{t("saved.no_saved")}</p>
              <p className="text-sm text-muted-foreground max-w-sm">{t("saved.no_saved_sub")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flights.map((flight) => {
                const airlineName = getAirlineName(flight.airlines?.[0] || "");
                const airlineLogo = getAirlineLogo(flight.airlines?.[0] || "");
                const savedDate = new Date(flight.savedAt);
                const daysAgo = Math.floor((Date.now() - savedDate.getTime()) / 86400000);
                const savedLabel = daysAgo === 0 ? t("saved.today") : daysAgo === 1 ? t("saved.yesterday") : t("saved.days_ago", { count: daysAgo });

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
                          {flight.departureTime?.split(" ")[0] || "—"} · {formatDuration(flight.durationMinutes)} · {flight.stopsCount === 0 ? t("card.direct") : flight.stopsCount === 1 ? t("card.stop_1") : t("card.stops_n", { count: flight.stopsCount })}
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
