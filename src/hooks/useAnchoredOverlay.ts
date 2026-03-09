import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";

export interface AnchoredOverlayOptions {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  offset?: number;
  matchWidth?: boolean;
  /**
   * CSS selector for a fixed boundary element (e.g. the header) that overlays
   * must never overlap. Defaults to "header".
   */
  boundarySelector?: string;
  /** Minimum gap (px) to keep below the boundary. */
  boundaryGap?: number;
}

/**
 * Calculates a LOCKED position for portaled overlay panels.
 *
 * Design goals
 * ────────────
 * 1. Measure once on open → no scroll-follow → no "swimming"
 * 2. Clamp below the fixed header (boundarySelector) so overlays never
 *    slide into the logo/nav bar
 * 3. Only re-measure on viewport WIDTH changes (≥2 px) so small mobile
 *    height changes (address-bar hide/show) don't cause jitter
 */
export function useAnchoredOverlay({
  open,
  anchorRef,
  offset = 8,
  matchWidth = true,
  boundarySelector = "header",
  boundaryGap = 8,
}: AnchoredOverlayOptions) {
  // Single state: both values captured at the same instant → always in sync
  const [snapshot, setSnapshot] = useState<{
    rect: DOMRect;
    boundaryBottom: number;
  } | null>(null);

  // Track last measured viewport width to ignore tiny height jitter
  const lastWidthRef = useRef(-1);

  const measure = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const bEl = document.querySelector(boundarySelector) as HTMLElement | null;
    const boundaryBottom = bEl ? bEl.getBoundingClientRect().bottom : 0;
    setSnapshot({ rect: el.getBoundingClientRect(), boundaryBottom });
  }, [anchorRef, boundarySelector]);

  useLayoutEffect(() => {
    if (!open) return;

    // Capture placement once when opening
    lastWidthRef.current = window.innerWidth;
    measure();

    // Only update when the viewport WIDTH meaningfully changes
    // (avoids jitter from mobile address-bar resize events)
    const onResize = () => {
      const w = window.innerWidth;
      if (Math.abs(w - lastWidthRef.current) >= 2) {
        lastWidthRef.current = w;
        measure();
      }
    };

    window.addEventListener("resize", onResize);

    // Also update if the anchor element itself resizes (e.g. text reflow)
    const el = anchorRef.current;
    const ro = el ? new ResizeObserver(measure) : null;
    if (el && ro) ro.observe(el);

    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [open, measure, anchorRef]);

  const style = useMemo<CSSProperties>(() => {
    if (!snapshot) return { display: "none" };

    const { rect, boundaryBottom } = snapshot;

    // Clamp: overlay must always sit below the header boundary
    const minTop = boundaryBottom > 0 ? boundaryBottom + boundaryGap : 0;
    const top = Math.round(Math.max(rect.bottom + offset, minTop));

    return {
      position: "fixed",
      left: Math.round(rect.left),
      top,
      ...(matchWidth ? { width: Math.round(rect.width) } : {}),
    };
  }, [snapshot, offset, matchWidth, boundaryGap]);

  return { style, rect: snapshot?.rect ?? null, update: measure };
}
