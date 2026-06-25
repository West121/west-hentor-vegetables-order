import type { ReactNode } from "react";

type AdminConfirmDialogProps = {
  busy?: boolean;
  cancelLabel?: string;
  confirmLabel?: string;
  message: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  variant?: "danger" | "primary";
};

type AdminAlertDialogProps = {
  confirmLabel?: string;
  message: ReactNode;
  onClose: () => void;
  title?: string;
  variant?: "danger" | "primary";
};

export function AdminConfirmDialog({
  busy,
  cancelLabel = "取消",
  confirmLabel = "确认",
  message,
  onCancel,
  onConfirm,
  title,
  variant = "primary",
}: AdminConfirmDialogProps) {
  const confirmClass =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-[#1f8f4f] text-white hover:bg-[#197a42]";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#07140c]/45 p-5">
      <div
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl shadow-[#0f2418]/20"
        role="dialog"
      >
        <div className="border-b border-[#edf2ed] px-6 py-5">
          <h3 className="text-lg font-semibold text-[#102017]">{title}</h3>
          <div className="mt-2 text-sm leading-6 text-[#66756d]">{message}</div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4">
          <button
            className="h-10 rounded-xl border border-[#dbe6dc] px-5 text-sm font-semibold text-[#405248] hover:bg-[#f3f7f1] disabled:opacity-60"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={[
              "h-10 rounded-xl px-5 text-sm font-semibold transition disabled:opacity-60",
              confirmClass,
            ].join(" ")}
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? "处理中" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminAlertDialog({
  confirmLabel = "我知道了",
  message,
  onClose,
  title = "操作失败",
  variant = "danger",
}: AdminAlertDialogProps) {
  const confirmClass =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-[#1f8f4f] text-white hover:bg-[#197a42]";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#07140c]/45 p-5">
      <div
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl shadow-[#0f2418]/20"
        role="alertdialog"
      >
        <div className="border-b border-[#edf2ed] px-6 py-5">
          <h3 className="text-lg font-semibold text-[#102017]">{title}</h3>
          <div className="mt-2 text-sm leading-6 text-[#66756d]">{message}</div>
        </div>
        <div className="flex justify-end px-6 py-4">
          <button
            className={[
              "h-10 rounded-xl px-5 text-sm font-semibold transition",
              confirmClass,
            ].join(" ")}
            onClick={onClose}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
