"use client";

import { motion } from "motion/react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type FocusEventHandler,
  type MouseEventHandler,
  type ReactNode,
} from "react";

import { getCollapsedFlyoutTop } from "./admin-collapsed-flyout-position";

const VIEWPORT_EDGE_GAP = 12;
const FLYOUT_MOTION_DURATION = 0.12;

type AdminCollapsedFlyoutProps = {
  anchorLeft: number;
  anchorTop: number;
  children: ReactNode;
  label: string;
  onBlur: FocusEventHandler<HTMLDivElement>;
  onFocus: FocusEventHandler<HTMLDivElement>;
  onMouseEnter: MouseEventHandler<HTMLDivElement>;
  onMouseLeave: MouseEventHandler<HTMLDivElement>;
};

export function AdminCollapsedFlyout({
  anchorLeft,
  anchorTop,
  children,
  label,
  onBlur,
  onFocus,
  onMouseEnter,
  onMouseLeave,
}: AdminCollapsedFlyoutProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [top, setTop] = useState(() => Math.max(anchorTop, VIEWPORT_EDGE_GAP));

  useLayoutEffect(() => {
    function updatePosition() {
      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      setTop(
        getCollapsedFlyoutTop(
          anchorTop,
          panel.offsetHeight,
          window.innerHeight,
          VIEWPORT_EDGE_GAP,
        ),
      );
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [anchorTop, children]);

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, x: 0 }}
      aria-label={`${label}二级菜单`}
      className="fixed z-50 min-w-44 overflow-y-auto rounded-2xl border border-[#dbe6dc] bg-white p-2 text-[#14231a] shadow-2xl shadow-[#0f2418]/18"
      exit={{ opacity: 0, scale: 0.98, x: 4 }}
      initial={{ opacity: 0, scale: 0.98, x: 6 }}
      onBlur={onBlur}
      onFocus={onFocus}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={panelRef}
      role="menu"
      style={{
        left: anchorLeft,
        maxHeight: `calc(100vh - ${VIEWPORT_EDGE_GAP * 2}px)`,
        top,
        transformOrigin: "left center",
      }}
      transition={{ duration: FLYOUT_MOTION_DURATION, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="px-3 pb-2 pt-1 text-xs font-semibold text-[#66756d]">
        {label}
      </div>
      <div className="space-y-1">{children}</div>
    </motion.div>
  );
}
