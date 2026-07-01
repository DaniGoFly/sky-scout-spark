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
  return f.segments
    .map((s) =>
      [
        s.airlineCode,
        s.flightNumber,
        s.departureAirport,
        s.arrivalAirport,
        s.departureTime,
        s.arrivalTime,
      ].join(":"),
    )
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