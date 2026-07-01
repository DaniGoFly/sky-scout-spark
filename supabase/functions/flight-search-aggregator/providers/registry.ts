import type { FlightProvider } from "../types.ts";
import { aviasalesProvider } from "./aviasales.ts";
import { kiwiProvider } from "./kiwi.ts";

interface RegistryEntry {
  provider: FlightProvider;
  enabled: boolean;
}

/**
 * Provider registry. Toggle `enabled` to activate a provider.
 * Can be overridden at runtime via env: PROVIDERS_ENABLED="aviasales,kiwi".
 */
const REGISTRY: Record<string, RegistryEntry> = {
  aviasales: { provider: aviasalesProvider, enabled: true },
  kiwi: { provider: kiwiProvider, enabled: false },
};

function envOverride(): Set<string> | null {
  const raw = Deno.env.get("PROVIDERS_ENABLED");
  if (!raw) return null;
  return new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
}

export function getEnabledProviders(): FlightProvider[] {
  const override = envOverride();
  return Object.entries(REGISTRY)
    .filter(([name, entry]) => (override ? override.has(name) : entry.enabled))
    .map(([, entry]) => entry.provider);
}

export function getProviderByName(name: string): FlightProvider | undefined {
  return REGISTRY[name.toLowerCase()]?.provider;
}