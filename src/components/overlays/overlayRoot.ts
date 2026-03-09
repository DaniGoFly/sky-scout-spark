// Shared overlay root mounted under document.body
// Used to ensure all dropdowns/calendars render above the entire app regardless of local stacking contexts.

let cachedRoot: HTMLElement | null = null;

export function ensureOverlayRoot(): HTMLElement {
  // If we already have it, keep it as the LAST element in <body> so it wins ties
  // against other z-index:9999 layers created earlier.
  if (cachedRoot && document.body.contains(cachedRoot)) {
    document.body.appendChild(cachedRoot);
    return cachedRoot;
  }

  const existing = document.getElementById("app-overlay-root") as HTMLElement | null;
  if (existing) {
    document.body.appendChild(existing);
    cachedRoot = existing;
    return cachedRoot;
  }

  const el = document.createElement("div");
  el.id = "app-overlay-root";
  document.body.appendChild(el);
  cachedRoot = el;
  return el;
}
