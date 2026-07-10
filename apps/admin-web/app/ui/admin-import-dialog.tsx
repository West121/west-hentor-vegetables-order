"use client";

import { Download, Upload } from "lucide-react";

export type AdminImportFailure = {
  phone?: string | null;
  reason?: string | null;
  rowNumber?: number | null;
  templateName?: string | null;
};

export type AdminImportResult = {
  failedRows?: number;
  failures?: AdminImportFailure[];
  importedRows?: number;
  totalRows?: number;
};

type ResultCard = {
  label: string;
  value: number | string;
};

type AdminImportDialogProps = {
  accept?: string;
  description: string;
  error: string | null;
  file: File | null;
  loading: boolean;
  onClose: () => void;
  onDownloadTemplate: () => void;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
  result: AdminImportResult | null;
  resultCards: ResultCard[];
  rules: string[];
  title: string;
};

const IMPORT_ACCEPT =
  ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

export function AdminImportDialog({
  accept = IMPORT_ACCEPT,
  description,
  error,
  file,
  loading,
  onClose,
  onDownloadTemplate,
  onFileChange,
  onSubmit,
  result,
  resultCards,
  rules,
  title,
}: AdminImportDialogProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0f2418]/35 p-5">
      <div
        aria-modal="true"
        data-admin-modal-shell
        className="mx-auto flex max-h-[86vh] w-[760px] max-w-full flex-col overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-[#dbe6dc] px-6 py-4">
          <div>
            <div className="text-lg font-semibold">{title}</div>
            <div className="mt-1 text-sm text-[#66756d]">{description}</div>
          </div>
          <button
            className="h-9 rounded-xl bg-[#eff8f1] px-4 text-sm font-semibold text-[#1f8f4f]"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            关闭
          </button>
        </div>

        <div className="grid flex-1 gap-4 overflow-auto p-6 md:grid-cols-[1fr_240px]">
          <div>
            <div className="rounded-2xl border border-dashed border-[#cfe3d3] bg-[#fbfdf9] p-5">
              <div className="text-sm font-semibold">导入文件</div>
              <div className="mt-2 text-sm leading-6 text-[#66756d]">
                支持 .xlsx、.xls、.csv，单个文件不超过 5MB。
              </div>
              <div className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold">
                {file ? file.name : "未选择文件"}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#dbe6dc] px-4 text-sm font-semibold text-[#1f8f4f] hover:bg-[#f3f7f1]">
                  <Upload size={16} />
                  选择文件
                  <input
                    accept={accept}
                    className="hidden"
                    disabled={loading}
                    onChange={(event) => {
                      onFileChange(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                    type="file"
                  />
                </label>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe6dc] px-4 text-sm font-semibold text-[#1f8f4f] hover:bg-[#f3f7f1]"
                  onClick={onDownloadTemplate}
                  type="button"
                >
                  <Download size={16} />
                  下载模板
                </button>
              </div>
            </div>

            {result ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {resultCards.map((card) => (
                  <div
                    className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-3"
                    key={card.label}
                  >
                    <div className="text-xs text-[#66756d]">{card.label}</div>
                    <div className="mt-1 text-lg font-semibold">{card.value}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {result?.failures?.length ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-[#f5cfcf]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-red-50 text-red-700">
                    <tr>
                      <th className="px-3 py-2 font-medium">行号</th>
                      <th className="px-3 py-2 font-medium">对象</th>
                      <th className="px-3 py-2 font-medium">原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {result.failures.slice(0, 20).map((failure, index) => (
                      <tr key={`${failure.rowNumber ?? index}-${index}`}>
                        <td className="px-3 py-2">{failure.rowNumber ?? "-"}</td>
                        <td className="px-3 py-2">
                          {failure.templateName || failure.phone || "-"}
                        </td>
                        <td className="px-3 py-2 text-red-700">
                          {failure.reason || "导入失败"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7] p-4">
            <div className="text-sm font-semibold">导入规则</div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[#66756d]">
              {rules.map((rule) => (
                <p key={rule}>{rule}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#dbe6dc] px-6 py-4">
          <button
            className="h-10 rounded-xl border border-[#dbe6dc] px-5"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="h-10 rounded-xl bg-[#1f8f4f] px-5 font-semibold text-white disabled:opacity-60"
            disabled={loading || !file}
            onClick={onSubmit}
            type="button"
          >
            {loading ? "导入中" : "开始导入"}
          </button>
        </div>
      </div>
    </div>
  );
}
