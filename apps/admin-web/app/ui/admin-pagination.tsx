"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export type AdminPaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type AdminPaginationProps = {
  disabled?: boolean;
  onPageChange: (page: number) => void;
  pagination: AdminPaginationMeta;
};

export function AdminPagination({
  disabled = false,
  onPageChange,
  pagination,
}: AdminPaginationProps) {
  const totalPages = Math.max(pagination.totalPages, 1);
  const page = Math.min(Math.max(pagination.page, 1), totalPages);
  const start = pagination.total === 0 ? 0 : (page - 1) * pagination.pageSize + 1;
  const end = Math.min(page * pagination.pageSize, pagination.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2ed] px-4 py-3 text-sm text-[#66756d]">
      <div>
        共 <span className="font-semibold text-[#15261d]">{pagination.total}</span>{" "}
        条，当前 {start}-{end} 条
      </div>
      <div className="flex items-center gap-2">
        <button
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#dbe6dc] bg-white px-3 font-semibold text-[#1f8f4f] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft size={16} />
          上一页
        </button>
        <div className="min-w-20 text-center font-semibold text-[#15261d]">
          {page} / {totalPages}
        </div>
        <button
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#dbe6dc] bg-white px-3 font-semibold text-[#1f8f4f] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          下一页
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
