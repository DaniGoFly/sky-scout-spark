import { useCallback, useLayoutEffect, useMemo, useState } from "react";

export interface AnchoredOverlayOptions {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  offset?: number;
  matchWidth?: boolean;
}

export function useAnchoredOverlay({ open, anchorRef, offset = 8, matchWidth = true }: AnchoredOverlayOptions) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    setRect(el.getBoundingClientRect());
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    update();

    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    const el = anchorRef.current;
    const ro = el ? new ResizeObserver(() => update()) : null;
    if (el && ro) ro.observe(el);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      ro?.disconnect();
    };
  }, [open, update, anchorRef]);

  const style = useMemo<React.CSSProperties>(() => {
    if (!rect) return { display: "none" };

    return {
      position: "fixed",
      left: rect.left,
      top: rect.bottom + offset,
      width: matchWidth ? rect.width : undefined,
    };
  }, [rect, offset, matchWidth]);

  return { style, rect, update };
}
