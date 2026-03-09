import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";

export interface AnchoredOverlayOptions {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  offset?: number;
  matchWidth?: boolean;

  /**
   * CSS selector for the element that overlays must never overlap (e.g. fixed header).
   * Defaults to "header".
   */
  boundarySelector?: string;

  /** Minimum gap (px) to keep below the boundary element. */
  boundaryGap?: number;
}

function getBoundaryBottom(selector: string): number {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return 0;
  return el.getBoundingClientRect().bottom;
}

/**
 * Anchored overlay positioning for portaled panels.
 *
 * Key UX goals:
 * - Calculate position once on open (no scroll-follow "swimming")
 * - Clamp overlay below the fixed header area
 * - Only recompute on meaningful layout changes (width change / big resize)
 */
export function useAnchoredOverlay({
  open,
  anchorRef,
  offset = 8,
  matchWidth = true,
  boundarySelector = "header",
  boundaryGap = 8,
}: AnchoredOverlayOptions) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const boundaryBottomRef = useRef(0);
  const lastViewportRef = useRef<{ w: number; h: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;

    boundaryBottomRef.current = getBoundaryBottom(boundarySelector);
    setRect(el.getBoundingClientRect());
  }, [anchorRef, boundarySelector]);

  const update = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      measure();
    });
  }, [measure]);

  useLayoutEffect(() => {
    if (!open) return;

    // Lock placement at open.
    lastViewportRef.current = { w: window.innerWidth, h: window.innerHeight };
    update();

    const onResize = () => {
      // Avoid "jitter" on mobile where scrolling can trigger small viewport-height resizes
      // (address bar show/hide). Only update on width changes or significant height changes.
      const last = lastViewportRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (!last) {
        lastViewportRef.current = { w, h };
        update();
        return;
      }

      const dw = Math.abs(w - last.w);
      const dh = Math.abs(h - last.h);

      if (dw >= 2 || dh >= 160) {
        lastViewportRef.current = { w, h };
        update();
      }
    };

    window.addEventListener("resize", onResize);

    const anchorEl = anchorRef.current;
    const ro = anchorEl ? new ResizeObserver(() => update()) : null;
    if (anchorEl && ro) ro.observe(anchorEl);

    const boundaryEl = document.querySelector(boundarySelector) as HTMLElement | null;
    const bro = boundaryEl ? new ResizeObserver(() => update()) : null;
    if (boundaryEl && bro) bro.observe(boundaryEl);

    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
      bro?.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [open, update, anchorRef, boundarySelector]);

  const style = useMemo<CSSProperties>(() => {
    if (!rect) return { display: "none" };

    const left = Math.round(rect.left);
    const width = matchWidth ? Math.round(rect.width) : undefined;

    const unclampedTop = rect.bottom + offset;
    const minTop = boundaryBottomRef.current > 0 ? boundaryBottomRef.current + boundaryGap : 0;
    const top = Math.round(Math.max(unclampedTop, minTop));

    return {
      position: "fixed",
      left,
      top,
      width,
    };
  }, [rect, offset, matchWidth, boundaryGap]);

  return { style, rect, update };
}

