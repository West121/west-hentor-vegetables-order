"use client";

import { Copy, Download, RefreshCw, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

import { AdminDatePicker } from "./admin-date-time-picker";
import { AdminSelect } from "./admin-select";

type StoreOption = {
  id: string;
  name: string;
};

type OrderStatus =
  | "CANCELED"
  | "PENDING_SHIPMENT"
  | "SHIPPED"
  | "SIGNED"
  | "VOIDED";

type DishCategory = string;

type DishCategoryOption = {
  code: string;
  enabled: boolean;
  name: string;
  sortOrder: number;
};

type ShipmentStats = {
  addresses: Array<{
    address: string;
    orderCount: number;
    totalWeightJin: number;
  }>;
  copyText: string;
  csvText: string;
  dishes: Array<{
    category: DishCategory;
    dishId: string;
    dishName: string;
    orderCount: number;
    totalWeightJin: number;
  }>;
  summary: {
    orderCount: number;
    totalWeightJin: number;
  };
};

type ShipmentStatsPanelProps = {
  categoryOptions?: DishCategoryOption[];
  store: StoreOption | null;
};

type ShipmentStatsFilters = {
  dateFrom: string;
  dateTo: string;
  dishCategory: "" | DishCategory;
  status: "" | OrderStatus;
};

const STATUS_OPTIONS: Array<{ label: string; value: "" | OrderStatus }> = [
  { label: "全部状态", value: "" },
  { label: "待配送", value: "PENDING_SHIPMENT" },
  { label: "已发货", value: "SHIPPED" },
  { label: "已签收", value: "SIGNED" },
  { label: "已取消", value: "CANCELED" },
  { label: "已作废", value: "VOIDED" },
];

const DEFAULT_SHIPMENT_STATUS: OrderStatus = "PENDING_SHIPMENT";

const DEFAULT_CATEGORY_OPTIONS: DishCategoryOption[] = [
  { code: "LEAFY", enabled: true, name: "叶菜", sortOrder: 1 },
  { code: "FRUIT", enabled: true, name: "茄果", sortOrder: 2 },
  { code: "ROOT", enabled: true, name: "根茎", sortOrder: 3 },
  { code: "MUSHROOM", enabled: true, name: "菌菇", sortOrder: 4 },
  { code: "ACTIVITY", enabled: true, name: "活动", sortOrder: 5 },
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function buildDateStart(value: string) {
  return value ? `${value}T00:00:00.000+08:00` : "";
}

function buildDateEnd(value: string) {
  return value ? `${value}T23:59:59.999+08:00` : "";
}

function downloadCsv(filename: string, csvText: string) {
  const blob = new Blob([`\uFEFF${csvText}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ShipmentStatsPanel({
  categoryOptions,
  store,
}: ShipmentStatsPanelProps) {
  const [stats, setStats] = useState<ShipmentStats | null>(null);
  const [status, setStatus] = useState<"" | OrderStatus>(DEFAULT_SHIPMENT_STATUS);
  const [dishCategory, setDishCategory] = useState<"" | DishCategory>("");
  const [dateFrom, setDateFrom] = useState(todayInputValue());
  const [dateTo, setDateTo] = useState(todayInputValue());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const resolvedCategoryOptions = (
    categoryOptions?.length ? categoryOptions : DEFAULT_CATEGORY_OPTIONS
  )
    .filter((option) => option.enabled)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  async function loadStats(nextFilters?: Partial<ShipmentStatsFilters>) {
    if (!store) {
      return;
    }

    const effectiveStatus = nextFilters?.status ?? status;
    const effectiveDishCategory = nextFilters?.dishCategory ?? dishCategory;
    const effectiveDateFrom = nextFilters?.dateFrom ?? dateFrom;
    const effectiveDateTo = nextFilters?.dateTo ?? dateTo;
    const params = new URLSearchParams({ storeId: store.id });
    if (effectiveStatus) {
      params.set("status", effectiveStatus);
    }
    if (effectiveDishCategory) {
      params.set("dishCategory", effectiveDishCategory);
    }
    if (effectiveDateFrom) {
      params.set("dateFrom", buildDateStart(effectiveDateFrom));
    }
    if (effectiveDateTo) {
      params.set("dateTo", buildDateEnd(effectiveDateTo));
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/stats/shipment?${params.toString()}`);
      const result = (await response.json()) as {
        data?: ShipmentStats;
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error?.message ?? "发货统计加载失败");
      }

      setStats(result.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发货统计加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function copyStats() {
    if (!stats) {
      return;
    }

    await navigator.clipboard.writeText(stats.copyText);
    setMessage("发货统计已复制");
  }

  function resetFilters() {
    const today = todayInputValue();
    setStatus(DEFAULT_SHIPMENT_STATUS);
    setDishCategory("");
    setDateFrom(today);
    setDateTo(today);
    void loadStats({
      dateFrom: today,
      dateTo: today,
      dishCategory: "",
      status: DEFAULT_SHIPMENT_STATUS,
    });
  }

  useEffect(() => {
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id]);

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <Truck size={18} />
            发货统计
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">
            按菜品汇总
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            支持日期、状态和菜品分类筛选，可复制或导出 CSV。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="border-[#cfe3d3] text-[#1f8f4f] disabled:opacity-50"
            disabled={!stats}
            onClick={copyStats}
            size="lg"
            type="button"
            variant="outline"
          >
            <Copy data-icon="inline-start" />
            复制
          </Button>
          <Button
            className="disabled:opacity-50"
            disabled={!stats}
            onClick={() =>
              stats ? downloadCsv(`shipment-stats-${dateFrom || "all"}.csv`, stats.csvText) : null
            }
            size="lg"
            type="button"
          >
            <Download data-icon="inline-start" />
            导出
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-3 md:grid-cols-2 xl:grid-cols-6">
        <AdminDatePicker
          buttonClassName="h-11 w-full bg-white"
          onChange={setDateFrom}
          placeholder="开始日期"
          value={dateFrom}
        />
        <AdminDatePicker
          buttonClassName="h-11 w-full bg-white"
          onChange={setDateTo}
          placeholder="结束日期"
          value={dateTo}
        />
        <AdminSelect
          contentLabel="订单状态"
          onChange={(value) => setStatus(value as "" | OrderStatus)}
          options={STATUS_OPTIONS.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
          triggerClassName="h-11 w-full border-[#dbe6dc] bg-white"
          value={status}
        />
        <AdminSelect
          contentLabel="菜品分类"
          onChange={(value) => setDishCategory(value as "" | DishCategory)}
          options={[
            { label: "全部菜品", value: "" },
            ...resolvedCategoryOptions.map((option) => ({
              label: option.name,
              value: option.code,
            })),
          ]}
          triggerClassName="h-11 w-full border-[#dbe6dc] bg-white"
          value={dishCategory}
        />
        <button
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#12351f] px-4 text-sm font-semibold text-white disabled:opacity-60"
          disabled={loading}
          onClick={() => void loadStats()}
          type="button"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          查询
        </button>
        <button
          className="flex h-11 items-center justify-center rounded-xl border border-[#cfe3d3] bg-white px-4 text-sm font-semibold text-[#1f8f4f] disabled:opacity-60"
          disabled={loading}
          onClick={resetFilters}
          type="button"
        >
          重置
        </button>
      </div>

      {message ? (
        <div className="mb-4 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-3 text-sm text-[#405248]">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="rounded-xl border border-[#dbe6dc] bg-[#f8fff8] p-4">
          <div className="text-sm text-[#66756d]">汇总</div>
          <div className="mt-3 text-3xl font-semibold">
            {stats?.summary.orderCount ?? 0}
          </div>
          <div className="mt-2 text-sm text-[#66756d]">
            总重量 {stats?.summary.totalWeightJin ?? 0} 斤
          </div>
        </div>

        <div className="rounded-xl border border-[#dbe6dc]">
          <div className="border-b border-[#edf2ed] px-4 py-3 font-semibold">
            菜品明细
          </div>
          <div className="divide-y divide-[#edf2ed]">
            {stats?.dishes.length ? (
              stats.dishes.map((dish) => (
                <div
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  key={dish.dishId}
                >
                  <span className="font-medium">{dish.dishName}</span>
                  <span className="text-[#66756d]">
                    {dish.totalWeightJin}斤 · {dish.orderCount}单
                  </span>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-[#66756d]">
                暂无菜品统计
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
