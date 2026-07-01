import type { NormalizedFlight } from "./types.ts";

/**
 * Segment fingerprint dedupe: same physical flight across providers
 * collapses to one entry, keeping the cheapest price.
 */
function fingerprint(f: NormalizedFlight): string {
  if (!f.segments?.length) {
    return [
      f.airline,
      f.departureAirport,
      f.arrivalAirport,
      f.departureTime,
      f.arrivalTime,
      f.stopsCount,
    ].join("|");
  }
  // Segments are passed through in provider-native shape (Aviasales/Kiwi/etc.
  // each use different field names). Read every plausible field so dedupe
  // still works uniformly across providers.
  return f.segments
    .map((s: any) => {
      const carrier = s.airlineCode ?? s.marketing_carrier ?? s.carrier ?? "";
      const fnum = s.flightNumber ?? s.flight_number ?? s.number ?? "";
      const dep = s.departureAirport ?? s.origin ?? s.departure ?? "";
      const arr = s.arrivalAirport ?? s.destination ?? s.arrival ?? "";
      const depAt = s.departureTime ?? s.departure_at ?? s.local_departure ?? "";
      const arrAt = s.arrivalTime ?? s.arrival_at ?? s.local_arrival ?? "";
      return [carrier, fnum, dep, arr, depAt, arrAt].join(":");
    })
    .join("→");
}

export function dedupe(flights: NormalizedFlight[]): NormalizedFlight[] {
  const byFp = new Map<string, NormalizedFlight>();
  for (const f of flights) {
    const fp = fingerprint(f);
    const existing = byFp.get(fp);
    if (!existing || f.price < existing.price) {
      byFp.set(fp, f);
    }
  }
  return [...byFp.values()];
}

export function sortFlights(
  flights: NormalizedFlight[],
  sort: "best" | "cheapest" | "fastest",
): NormalizedFlight[] {
  const arr = [...flights];
  if (sort === "cheapest") {
    arr.sort(
      (a, b) =>
        a.price - b.price ||
        a.durationMinutes - b.durationMinutes ||
        a.departureTime.localeCompare(b.departureTime),
    );
  } else if (sort === "fastest") {
    arr.sort(
      (a, b) =>
        a.durationMinutes - b.durationMinutes ||
        a.price - b.price ||
        a.departureTime.localeCompare(b.departureTime),
    );
  } else {
    arr.sort((a, b) => {
      const sa = a.price * 0.6 + a.durationMinutes * 0.3 + a.stopsCount * 100;
      const sb = b.price * 0.6 + b.durationMinutes * 0.3 + b.stopsCount * 100;
      return (
        sa - sb ||
        a.price - b.price ||
        a.departureTime.localeCompare(b.departureTime)
      );
    });
  }
  return arr;
}