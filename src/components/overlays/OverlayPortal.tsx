import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { ensureOverlayRoot } from "./overlayRoot";

interface OverlayPortalProps {
  children: ReactNode;
}

export function OverlayPortal({ children }: OverlayPortalProps) {
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRoot(ensureOverlayRoot());
  }, []);

  if (!root) return null;
  return createPortal(children, root);
}
