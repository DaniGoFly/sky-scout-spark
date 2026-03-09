// Shared overlay root mounted under document.body
// Used to ensure all dropdowns/calendars render above the entire app regardless of local stacking contexts.

let cachedRoot: HTMLElement | null = null;

export function ensureOverlayRoot(): HTMLElement {
  if (cachedRoot && document.body.contains(cachedRoot)) return cachedRoot;

  const existing = document.getElementById("app-overlay-root");
  if (existing) {
    cachedRoot = existing as HTMLElement;
    return cachedRoot;
  }

  const el = document.createElement("div");
  el.id = "app-overlay-root";
  document.body.appendChild(el);
  cachedRoot = el;
  return el;
}
