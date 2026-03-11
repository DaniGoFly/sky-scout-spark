/**
 * MobileCalendarModal — true modal wrapper for mobile calendars.
 * Renders children in a portal, locks body scroll, captures all pointer events,
 * and blocks background interaction.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { OverlayPortal } from "./OverlayPortal";

interface MobileCalendarModalProps {
  children: ReactNode;
  onClose?: () => void;
}

export function MobileCalendarModal({ children, onClose }: MobileCalendarModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Lock body scroll on mount, restore on unmount
  useEffect(() => {
    document.body.classList.add("calendar-modal-open");

    // Move focus into the modal
    const timer = setTimeout(() => {
      containerRef.current?.focus();
    }, 50);

    return () => {
      document.body.classList.remove("calendar-modal-open");
      clearTimeout(timer);
    };
  }, []);

  return (
    <OverlayPortal>
      <div
        ref={containerRef}
        tabIndex={-1}
        className="fixed inset-0 z-[9999] bg-background flex flex-col outline-none"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          pointerEvents: "auto",
          touchAction: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </OverlayPortal>
  );
}
