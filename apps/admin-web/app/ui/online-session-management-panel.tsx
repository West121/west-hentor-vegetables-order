"use client";

import { LogOut, Monitor, RefreshCcw, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { AdminSelect } from "./admin-select";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import { AdminPagination, type AdminPaginationMeta } from "./admin-pagination";
import { formatDateTimeSecond } from "./date-format";

type OnlineSessionType = "all" | "admin" | "mini";

type OnlineSessionItem = {
  current: boolean;
  displayName: string | null;
  expiresAt: string | null;
  id: string;
  phone: string | null;
  storeName: string | null;
  type: "admin" | "mini";
  typeLabel: string;
  userId: string;
  username: string | null;
};

type OnlineSessionResponse = {
  items: OnlineSessionItem[];
  summary: {
    admin: number;
    mini: number;
    total: number;
  };
};

type ApiResponse<T> = {
  data?: T;
  error?: {
    message: string;
  };
  success: boolean;
};

const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  { label: "全部会话", value: "all" },
  { label: "后台用户", value: "admin" },
  { label: "小程序用户", value: "mini" },
];

export function OnlineSessionManagementPanel() {
  const [type, setType] = useState<OnlineSessionType>("all");
  const [items, setItems] = useState<OnlineSessionItem[]>([]);
  const [summary, setSummary] = useState({ admin: 0, mini: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<OnlineSessionItem | null>(null);
  const [kicking, setKicking] = useState(false);

  async function reload(nextType = type) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/online-sessions?type=${encodeURIComponent(nextType)}`,
      );
      const payload = (await response.json()) as ApiResponse<OnlineSessionResponse>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "加载在线用户失败");
      }
      setItems(payload.data.items ?? []);
      setSummary(payload.data.summary ?? { admin: 0, mini: 0, total: 0 });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载在线用户失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload(type);
  }, [type]);

  const pagination: AdminPaginationMeta = useMemo(() => {
    const totalPages = Math.max(Math.ceil(items.length / pageSize), 1);
    return {
      page: Math.min(page, totalPages),
      pageSize,
      total: items.length,
      totalPages,
    };
  }, [items.length, page, pageSize]);

  const visibleItems = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return items.slice(start, start + pagination.pageSize);
  }, [items, pagination.page, pagination.pageSize]);

  function handleTypeChange(nextType: string) {
    setType(nextType as OnlineSessionType);
    setPage(1);
  }

  async function kickSession() {
    if (!target) {
      return;
    }
    setKicking(true);
    try {
      const response = await fetch(`/api/admin/online-sessions/${target.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<unknown>;
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error?.message ?? "强制下线失败");
      }
      setTarget(null);
      await reload(type);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "强制下线失败");
    } finally {
      setKicking(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white shadow-sm shadow-[#14351d]/5 dark:border-[#1f3a28] dark:bg-[#0d1d14] dark:shadow-black/25">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#edf2ed] px-4 py-3 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f] dark:text-[#86d79f]">
            <Monitor size={16} />
            系统管理
          </div>
          <h2 className="mt-1 text-xl font-semibold text-[#102017] dark:text-white">在线用户</h2>
          <p className="mt-1 text-sm text-[#66756d] dark:text-white/55">
            查看后台用户和小程序用户当前有效会话，可按需强制下线。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            ["全部", summary.total],
            ["后台", summary.admin],
            ["小程序", summary.mini],
          ].map(([label, value]) => (
            <div
              className="min-w-16 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]"
              key={label}
            >
              <div className="text-xs text-[#66756d] dark:text-white/50">{label}</div>
              <div className="text-lg font-semibold text-[#102017] dark:text-white">{value}</div>
            </div>
          ))}
          <Button
            className="h-10 bg-[#1f8f4f] text-white hover:bg-[#197a42]"
            disabled={loading}
            onClick={() => void reload(type)}
            size="sm"
            type="button"
          >
            <RefreshCcw size={16} />
            刷新
          </Button>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="grid gap-3 rounded-2xl border border-[#dbe6dc] bg-[#fbfdfb] p-3 md:grid-cols-[260px_1fr] dark:border-white/10 dark:bg-white/[0.04]">
          <label className="grid gap-1.5 text-sm font-semibold text-[#405248] dark:text-white/60">
            会话类型
            <AdminSelect
              onChange={handleTypeChange}
              options={TYPE_OPTIONS}
              triggerClassName="h-10 w-full border-[#dbe6dc] bg-white text-sm dark:border-white/10 dark:bg-[#07130c] dark:text-white"
              value={type}
            />
          </label>
        </div>
        {error ? (
          <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto px-4 pb-3">
        <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-sm">
          <thead className="bg-[#f3f8f4] text-[#66756d] dark:bg-white/[0.06] dark:text-white/50">
            <tr>
              <th className="rounded-l-xl px-3 py-2 font-semibold">类型</th>
              <th className="px-3 py-2 font-semibold">用户</th>
              <th className="px-3 py-2 font-semibold">手机号</th>
              <th className="px-3 py-2 font-semibold">门店</th>
              <th className="px-3 py-2 font-semibold">过期时间</th>
              <th className="rounded-r-xl px-3 py-2 text-right font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => {
              const TypeIcon = item.type === "admin" ? Monitor : Smartphone;
              return (
                <tr className="border-b border-[#edf2ed]" key={item.id}>
                  <td className="border-b border-[#edf2ed] px-3 py-2 dark:border-white/10">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf6ef] px-2.5 py-1 text-xs font-semibold text-[#1f8f4f] dark:bg-white/10 dark:text-[#86d79f]">
                      <TypeIcon size={14} />
                      {item.typeLabel}
                    </span>
                  </td>
                  <td className="border-b border-[#edf2ed] px-3 py-2 dark:border-white/10">
                    <div className="font-semibold text-[#102017] dark:text-white">
                      {item.displayName || "未命名用户"}
                      {item.current ? (
                        <span className="ml-2 rounded-full bg-[#fff7df] px-2 py-0.5 text-xs text-[#9b6508] dark:bg-[#2a2111] dark:text-[#f0b84a]">
                          当前会话
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-[#66756d] dark:text-white/45">
                      {item.username || item.userId}
                    </div>
                  </td>
                  <td className="border-b border-[#edf2ed] px-3 py-2 text-[#405248] dark:border-white/10 dark:text-white/75">
                    {item.phone || "未记录"}
                  </td>
                  <td className="border-b border-[#edf2ed] px-3 py-2 text-[#405248] dark:border-white/10 dark:text-white/75">
                    {item.storeName || "-"}
                  </td>
                  <td className="border-b border-[#edf2ed] px-3 py-2 text-[#405248] dark:border-white/10 dark:text-white/75">
                    {formatDateTimeSecond(item.expiresAt, "未设置")}
                  </td>
                  <td className="border-b border-[#edf2ed] px-3 py-2 text-right dark:border-white/10">
                    <Button
                      disabled={item.current}
                      onClick={() => setTarget(item)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <LogOut size={15} />
                      强制下线
                    </Button>
                  </td>
                </tr>
              );
            })}
            {!loading && visibleItems.length === 0 ? (
              <tr>
                <td className="px-3 py-10 text-center text-[#66756d] dark:text-white/50" colSpan={6}>
                  暂无在线会话
                </td>
              </tr>
            ) : null}
            {loading ? (
              <tr>
                <td className="px-3 py-10 text-center text-[#66756d] dark:text-white/50" colSpan={6}>
                  正在加载在线用户
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AdminPagination
        disabled={loading}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        pagination={pagination}
      />

      {target ? (
        <AdminConfirmDialog
          busy={kicking}
          confirmLabel="强制下线"
          message={
            <>
              确认让{" "}
              <span className="font-semibold text-[#102017] dark:text-white">
                {target.displayName || target.username || target.userId}
              </span>{" "}
              的{target.typeLabel}会话立即失效吗？对方下一次操作需要重新登录。
            </>
          }
          onCancel={() => setTarget(null)}
          onConfirm={() => void kickSession()}
          title="强制下线"
          variant="danger"
        />
      ) : null}
    </section>
  );
}
