"use client";

import { Maximize2, Minimize2, X } from "lucide-react";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";

import {
  createAdminModalDragState,
  getBoundedAdminModalOffset,
  type AdminModalDragState,
} from "./admin-modal-drag";

type AdminDraggableModalProps = {
  bodyClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
  heightClassName?: string;
  onClose: () => void;
  subtitle?: ReactNode;
  title: ReactNode;
  widthClassName?: string;
};

export function AdminDraggableModal({
  bodyClassName = "p-6",
  children,
  footer,
  heightClassName = "h-[70vh]",
  onClose,
  subtitle,
  title,
  widthClassName = "w-[900px]",
}: AdminDraggableModalProps) {
  const [fullscreen, setFullscreen] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<AdminModalDragState | null>(null);

  function handleHeaderPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (fullscreen) {
      return;
    }

    const nextDrag = createAdminModalDragState(event, offset);
    if (!nextDrag) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = nextDrag;
  }

  function handleHeaderPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    setOffset(getBoundedAdminModalOffset(drag, event.clientX, event.clientY));
  }

  function handleHeaderPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
      <div
        aria-modal="true"
        data-admin-modal-shell
        data-fullscreen={fullscreen ? "true" : "false"}
        className={[
          "mx-auto flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl",
          fullscreen
            ? "h-full w-full"
            : `${heightClassName} ${widthClassName} max-w-full resize`,
        ].join(" ")}
        role="dialog"
        style={
          fullscreen
            ? undefined
            : { transform: `translate(${offset.x}px, ${offset.y}px)` }
        }
      >
        <div
          data-admin-modal-drag-handle
          className="flex cursor-move items-center justify-between border-b border-[#dbe6dc] px-6 py-4"
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onPointerCancel={handleHeaderPointerUp}
          onPointerUp={handleHeaderPointerUp}
        >
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold">{title}</div>
            {subtitle ? (
              <div className="mt-1 truncate text-sm text-[#66756d]">
                {subtitle}
              </div>
            ) : null}
          </div>
          <div
            className="flex items-center gap-2"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              className="grid h-9 w-9 place-items-center rounded-xl border border-[#cfe3d3] bg-[#eff8f1] text-[#1f8f4f]"
              onClick={() => setFullscreen((value) => !value)}
              title={fullscreen ? "退出全屏" : "全屏"}
              type="button"
            >
              {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
            <button
              className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600"
              onClick={onClose}
              title="关闭"
              type="button"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className={["flex-1 overflow-auto", bodyClassName].join(" ")}>
          {children}
        </div>

        {footer ? (
          <div className="flex justify-end gap-3 border-t border-[#dbe6dc] px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
