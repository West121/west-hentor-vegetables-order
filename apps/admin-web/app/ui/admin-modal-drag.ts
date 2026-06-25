import type { PointerEvent } from "react";

export type AdminModalOffset = {
  x: number;
  y: number;
};

export type AdminModalDragState = AdminModalOffset & {
  bottom: number;
  left: number;
  pointerId: number;
  right: number;
  startX: number;
  startY: number;
  top: number;
};

const SCREEN_PADDING = 12;

function clamp(value: number, min: number, max: number) {
  if (min > max) {
    return value;
  }

  return Math.min(Math.max(value, min), max);
}

export function createAdminModalDragState(
  event: PointerEvent<HTMLElement>,
  offset: AdminModalOffset,
): AdminModalDragState | null {
  const shell = event.currentTarget.closest<HTMLElement>(
    "[data-admin-modal-shell]",
  );
  if (!shell) {
    return null;
  }

  const rect = shell.getBoundingClientRect();
  return {
    bottom: rect.bottom,
    left: rect.left,
    pointerId: event.pointerId,
    right: rect.right,
    startX: event.clientX,
    startY: event.clientY,
    top: rect.top,
    x: offset.x,
    y: offset.y,
  };
}

export function getBoundedAdminModalOffset(
  drag: AdminModalDragState,
  clientX: number,
  clientY: number,
): AdminModalOffset {
  const nextX = drag.x + clientX - drag.startX;
  const nextY = drag.y + clientY - drag.startY;
  const minX = drag.x + SCREEN_PADDING - drag.left;
  const maxX = drag.x + window.innerWidth - SCREEN_PADDING - drag.right;
  const minY = drag.y + SCREEN_PADDING - drag.top;
  const maxY = drag.y + window.innerHeight - SCREEN_PADDING - drag.bottom;

  return {
    x: clamp(nextX, minX, maxX),
    y: clamp(nextY, minY, maxY),
  };
}
