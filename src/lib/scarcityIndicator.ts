/**
 * Deterministic scarcity indicator.
 * Uses a hash of airline + route to decide if scarcity message shows,
 * so it's stable per unique airline bucket (not random per refresh).
 */

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function shouldShowScarcity(airline: string, origin: string, destination: string): boolean {
  const key = `${airline}:${origin}:${destination}`;
  const hash = simpleHash(key);
  // ~40% of airline+route combos show scarcity
  return hash % 10 < 4;
}
