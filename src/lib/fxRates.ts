/**
 * Minimal FX conversion.
 *
 * Provider (Aviasales) usually honors `currency_code`, but occasionally
 * returns a different currency, and cached results may have been fetched
 * in a different currency than the user's current selection. To keep the
 * displayed number consistent with the displayed symbol, we convert on
 * the client using freely-available ECB rates via frankfurter.dev.
 *
 * Rates are cached in sessionStorage for 6h. All rates are stored relative
 * to EUR (the frankfurter default base).
 */

const KEY = "gofly.fxRates.eur";
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const ENDPOINT =
  "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP,CHF,TRY,PLN,SEK,NOK,DKK,CZK,HUF,RON,BGN,ISK,JPY,CNY,CAD,AUD,NZD,MXN,BRL,ZAR,SGD,HKD,KRW,INR,ILS,AED,SAR,THB";

type EurRates = Record<string, number>;
let inflight: Promise<EurRates | null> | null = null;

interface CacheShape { at: number; rates: EurRates }

function readCache(): EurRates | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: CacheShape = JSON.parse(raw);
    if (!parsed?.rates || Date.now() - parsed.at > MAX_AGE_MS) return null;
    return parsed.rates;
  } catch { return null; }
}

function writeCache(rates: EurRates) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), rates } satisfies CacheShape));
  } catch { /* quota */ }
}

/** Returns rates map with EUR as base (EUR = 1). Refetches when stale. */
export async function ensureFxRates(): Promise<EurRates | null> {
  const cached = readCache();
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const r = await fetch(ENDPOINT);
      if (!r.ok) return null;
      const data = await r.json();
      const rates: EurRates = { EUR: 1, ...(data?.rates || {}) };
      writeCache(rates);
      return rates;
    } catch { return null; }
    finally { inflight = null; }
  })();
  return inflight;
}

/** Sync accessor — returns cached rates if fresh, else null. */
export function getCachedFxRates(): EurRates | null {
  return readCache();
}

/**
 * Convert an amount from `from` currency into `to`, using EUR-base rates.
 * Returns null when either currency is unknown to the rate table.
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: EurRates | null,
): number | null {
  if (!rates) return null;
  const src = from.toUpperCase();
  const dst = to.toUpperCase();
  if (src === dst) return amount;
  const rSrc = src === "EUR" ? 1 : rates[src];
  const rDst = dst === "EUR" ? 1 : rates[dst];
  if (!rSrc || !rDst) return null;
  // amount(src) → EUR: amount / rSrc ; EUR → dst: * rDst
  return (amount / rSrc) * rDst;
}