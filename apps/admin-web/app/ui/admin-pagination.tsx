"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { AdminSelect } from "./admin-select";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100].map((value) => ({
  label: `${value} 条/页`,
  value: String(value),
}));

export type AdminPaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminListPayload<TItem, TSummary extends Record<string, number>> = {
  items?: TItem[];
  page?: number;
  pageSize?: number;
  pagination?: AdminPaginationMeta;
  summary?: TSummary;
  take?: number;
  total?: number;
  totalPages?: number;
};

export function normalizeAdminPagination(
  payload: {
    page?: number;
    pageSize?: number;
    pagination?: AdminPaginationMeta;
    take?: number;
    total?: number;
    totalPages?: number;
  },
  fallbackPageSize: number,
): AdminPaginationMeta {
  if (payload.pagination) {
    return payload.pagination;
  }

  const pageSize = Number(payload.pageSize ?? payload.take ?? fallbackPageSize);
  const total = Number(payload.total ?? 0);

  return {
    page: Number(payload.page ?? 1),
    pageSize,
    total,
    totalPages: Number(payload.totalPages ?? Math.max(Math.ceil(total / pageSize), 1)),
  };
}

function statusOf(item: unknown) {
  return String((item as { status?: unknown })?.status ?? "").toUpperCase();
}

function buildSummary<TItem, TSummary extends Record<string, number>>(
  items: TItem[],
  fallbackSummary: TSummary,
  total: number,
) {
  const summary: Record<string, number> = {
    ...fallbackSummary,
    total,
  };
  const countStatus = (...statuses: string[]) =>
    items.filter((item) => statuses.includes(statusOf(item))).length;

  if ("active" in summary) summary.active = countStatus("ACTIVE");
  if ("disabled" in summary) summary.disabled = countStatus("DISABLED");
  if ("draft" in summary) summary.draft = countStatus("DRAFT");
  if ("frozen" in summary) summary.frozen = countStatus("FROZEN");
  if ("expired" in summary) summary.expired = countStatus("EXPIRED");
  if ("onSale" in summary) summary.onSale = countStatus("ON_SALE");
  if ("offSale" in summary) summary.offSale = countStatus("OFF_SALE");
  if ("pendingShipment" in summary) {
    summary.pendingShipment = countStatus("PENDING_SHIPMENT");
  }
  if ("shipped" in summary) summary.shipped = countStatus("SHIPPED");
  if ("signed" in summary) summary.signed = countStatus("SIGNED");
  if ("canceled" in summary) summary.canceled = countStatus("CANCELED", "CANCELLED");
  if ("stock" in summary) {
    summary.stock = items.reduce(
      (sum, item) => sum + Number((item as { stockJin?: unknown }).stockJin ?? 0),
      0,
    );
  }
  if ("lowStock" in summary) {
    summary.lowStock = items.filter(
      (item) => Number((item as { stockJin?: unknown }).stockJin ?? 0) <= 10,
    ).length;
  }

  return summary as TSummary;
}

export function normalizeAdminListPayload<
  TItem,
  TSummary extends Record<string, number>,
>(
  payload: AdminListPayload<TItem, TSummary>,
  fallbackSummary: TSummary,
  fallbackPageSize: number,
) {
  const items = payload.items ?? [];
  const pagination = normalizeAdminPagination(payload, fallbackPageSize);

  return {
    items,
    pagination,
    summary:
      payload.summary ??
      buildSummary(items, fallbackSummary, pagination.total),
  };
}

type AdminPaginationProps = {
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pagination: AdminPaginationMeta;
};

export function AdminPagination({
  disabled = false,
  onPageChange,
  onPageSizeChange,
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
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#7a8a81]">每页</span>
            <AdminSelect
              contentLabel="每页数量"
              disabled={disabled}
              onChange={(value) => onPageSizeChange(Number(value))}
              options={PAGE_SIZE_OPTIONS}
              triggerClassName="h-9 w-[116px] border-[#dbe6dc] bg-white text-sm font-semibold"
              value={String(pagination.pageSize)}
            />
          </div>
        ) : null}
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
