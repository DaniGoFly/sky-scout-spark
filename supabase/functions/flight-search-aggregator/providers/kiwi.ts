import type { FlightProvider } from "../types.ts";

/**
 * Kiwi (Tequila) adapter — stub.
 * Disabled by default in the registry. Implement searchFlights/normalizeResults/
 * getClickUrl and set `enabled: true` in registry.ts to activate.
 */
export const kiwiProvider: FlightProvider = {
  name: "kiwi",
  async searchFlights() {
    return { ok: true, raw: { flights: [] } };
  },
  normalizeResults() {
    return [];
  },
  async getClickUrl() {
    return { ok: false, error: "kiwi provider not implemented" };
  },
};