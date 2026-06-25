"use client";

import { RefreshCcw } from "lucide-react";
import { useState } from "react";

import {
  AdminPagination,
  normalizeAdminListPayload,
  type AdminPaginationMeta,
} from "./admin-pagination";
import { AdminDatePicker } from "./admin-date-time-picker";
import { formatDateTimeSecond } from "./date-format";

export type OperationLogPanelItem = {
  action: string;
  afterValue: unknown | null;
  beforeValue: unknown | null;
  createdAt: string;
  durationMs: number | null;
  id: string;
  ip: string | null;
  operator: {
    id: string;
    name: string;
    username: string;
  } | null;
  requestMethod: string | null;
  requestParams: unknown | null;
  requestPath: string | null;
  resource: string;
  resourceId: string | null;
  responseData: unknown | null;
  statusCode: number | null;
  store: {
    id: string;
    name: string;
  } | null;
  user: {
    id: string;
    nickname: string | null;
    phone: string | null;
  } | null;
  userAgent: string | null;
};

type OperationLogsPanelProps = {
  initialLogs: OperationLogPanelItem[];
  initialPagination: AdminPaginationMeta;
  logStoreId: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  ADMIN_USER_CREATED: "新建后台用户",
  ADMIN_USER_PASSWORD_RESET: "重置密码",
  ADMIN_USER_UPDATED: "编辑后台用户",
  ADMIN_ROLE_CREATED: "新建角色",
  ADMIN_ROLE_UPDATED: "编辑角色权限",
  DISH_CREATED: "新建菜品",
  DISH_DELETED: "删除菜品",
  DISH_INVENTORY_ADJUSTED: "调整库存",
  DISH_UPDATED: "编辑菜品",
  FRANCHISEE_CREATED: "新建合作方",
  FRANCHISEE_UPDATED: "编辑合作方",
  MEMBER_CREATED: "新建会员",
  MEMBER_IMPORT: "导入会员",
  MEMBER_STORE_BINDING_UPDATED: "编辑会员",
  MINIAPP_ADDRESS_CREATED: "新增收货地址",
  MINIAPP_ADDRESS_DEFAULT_SET: "设为默认地址",
  MINIAPP_ADDRESS_DELETED: "删除收货地址",
  MINIAPP_ADDRESS_UPDATED: "编辑收货地址",
  MINIAPP_PHONE_LOGIN: "小程序登录",
  ORDER_CREATED: "新建订单",
  ORDER_INTERNAL_REMARK_UPDATED: "编辑订单备注",
  ORDER_SHIPPED: "订单发货",
  ORDER_SIGNED: "订单签收",
  ORDER_VOIDED: "作废订单",
  PACKAGE_TEMPLATE_CREATED: "新建套餐模板",
  PACKAGE_TEMPLATE_UPDATED: "编辑套餐模板",
  STORE_CREATED: "新建业务配置",
  STORE_UPDATED: "编辑业务配置",
  SYSTEM_SETTINGS_UPDATED: "更新系统设置",
  TASK_COPIED: "复制任务",
  TASK_CREATED: "新建任务",
  TASK_UPDATED: "编辑任务",
  USER_PACKAGE_IMPORT: "导入会员套餐",
};

const RESOURCE_LABELS: Record<string, string> = {
  address: "收货地址",
  admin_role: "后台角色",
  admin_user: "后台用户",
  dish: "菜品",
  franchisee: "合作方",
  member: "会员",
  miniapp_session: "小程序登录",
  order: "订单",
  package_template: "套餐模板",
  store: "业务配置",
  system_config: "系统设置",
  task: "任务",
  user_package: "会员套餐",
};

function displayPhone(phone: string | null) {
  return phone;
}

function actorPrimary(log: OperationLogPanelItem) {
  if (log.operator) {
    return log.operator.name;
  }

  return log.user?.nickname ?? displayPhone(log.user?.phone ?? null) ?? "微信会员";
}

function actorSecondary(log: OperationLogPanelItem) {
  if (log.operator) {
    return log.operator.username;
  }

  return log.user?.phone ? `会员 ${displayPhone(log.user.phone)}` : "小程序用户";
}

function formatDuration(durationMs: number | null) {
  return typeof durationMs === "number" ? `${durationMs} ms` : "未记录";
}

function formatStatus(statusCode: number | null) {
  if (!statusCode) {
    return "未记录";
  }

  return `${statusCode} ${statusCode >= 200 && statusCode < 300 ? "成功" : "异常"}`;
}

function formatJsonPreview(value: unknown | null) {
  if (value === null || value === undefined) {
    return "未记录";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function JsonPreview({
  label,
  value,
}: {
  label: string;
  value: unknown | null;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-[#8a9a90]">{label}</div>
      <pre className="max-h-32 max-w-80 overflow-auto rounded-lg bg-[#f5f8f3] p-2 text-xs leading-5 text-[#15261d]">
        {formatJsonPreview(value)}
      </pre>
    </div>
  );
}

export function OperationLogsPanel({
  initialLogs,
  initialPagination,
  logStoreId,
}: OperationLogsPanelProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [resourceFilter, setResourceFilter] = useState("ALL");
  const [statusCodeFilter, setStatusCodeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function reloadLogs(
    page = pagination.page,
    filters = {
      actionFilter,
      dateFrom,
      dateTo,
      query,
      resourceFilter,
      statusCodeFilter,
    },
  ) {
    const params = new URLSearchParams();
    if (logStoreId) {
      params.set("storeId", logStoreId);
    }
    const nextQuery = filters.query.trim();
    const nextStatusCode = filters.statusCodeFilter.trim();
    if (nextQuery) {
      params.set("query", nextQuery);
    }
    if (filters.actionFilter !== "ALL") {
      params.set("action", filters.actionFilter);
    }
    if (filters.resourceFilter !== "ALL") {
      params.set("resource", filters.resourceFilter);
    }
    if (nextStatusCode) {
      params.set("statusCode", nextStatusCode);
    }
    if (filters.dateFrom) {
      params.set("dateFrom", filters.dateFrom);
    }
    if (filters.dateTo) {
      params.set("dateTo", filters.dateTo);
    }
    params.set("page", String(page));
    params.set("pageSize", String(pagination.pageSize));
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/operation-logs?${params.toString()}`);
      const result = (await response.json()) as {
        data?: {
          items: OperationLogPanelItem[];
          pagination: AdminPaginationMeta;
        };
        success: boolean;
      };

      if (response.ok && result.success && result.data?.items) {
        const nextList = normalizeAdminListPayload(
          result.data,
          { total: 0 },
          pagination.pageSize,
        );
        setLogs(nextList.items);
        setPagination(nextList.pagination);
      }
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setActionFilter("ALL");
    setResourceFilter("ALL");
    setStatusCodeFilter("");
    setDateFrom("");
    setDateTo("");
    void reloadLogs(1, {
      actionFilter: "ALL",
      dateFrom: "",
      dateTo: "",
      query: "",
      resourceFilter: "ALL",
      statusCodeFilter: "",
    });
  }

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[#1f8f4f]">系统管理</div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">操作日志</h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            独立展示关键操作记录，覆盖后台变更、小程序登录、地址和订单等核心动作。
          </p>
        </div>
        <button
          className="flex h-10 items-center gap-2 rounded-xl border border-[#dbe6dc] px-4 text-sm font-semibold text-[#1f8f4f] hover:bg-[#f3f7f1]"
          disabled={loading}
          onClick={() => void reloadLogs()}
          type="button"
        >
          <RefreshCcw size={17} />
          {loading ? "加载中" : "刷新日志"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-3 lg:grid-cols-[minmax(220px,1fr)_190px_160px_120px_160px_160px_auto_auto]">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#66756d]">
          关键字
          <input
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void reloadLogs(1);
              }
            }}
            placeholder="操作人 / 资源 / 路径 / 手机号"
            value={query}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#66756d]">
          操作类型
          <select
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
            onChange={(event) => setActionFilter(event.target.value)}
            value={actionFilter}
          >
            <option value="ALL">全部操作</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#66756d]">
          资源
          <select
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
            onChange={(event) => setResourceFilter(event.target.value)}
            value={resourceFilter}
          >
            <option value="ALL">全部资源</option>
            {Object.entries(RESOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#66756d]">
          状态码
          <input
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
            inputMode="numeric"
            onChange={(event) => setStatusCodeFilter(event.target.value)}
            placeholder="200"
            value={statusCodeFilter}
          />
        </label>
        <AdminDatePicker
          buttonClassName="h-10 w-full bg-white"
          label="开始日期"
          onChange={setDateFrom}
          placeholder="开始日期"
          value={dateFrom}
        />
        <AdminDatePicker
          buttonClassName="h-10 w-full bg-white"
          label="结束日期"
          onChange={setDateTo}
          placeholder="结束日期"
          value={dateTo}
        />
        <button
          className="h-10 self-end rounded-xl bg-[#1f8f4f] px-5 text-sm font-semibold text-white disabled:opacity-60"
          disabled={loading}
          onClick={() => void reloadLogs(1)}
          type="button"
        >
          查询
        </button>
        <button
          className="h-10 self-end rounded-xl border border-[#dbe6dc] bg-white px-5 text-sm font-semibold text-[#66756d] hover:bg-[#f3f7f1]"
          disabled={loading}
          onClick={resetFilters}
          type="button"
        >
          重置
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-[#dbe6dc]">
        <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
          <thead className="bg-[#f5f8f3] text-[#66756d]">
            <tr>
              <th className="px-4 py-3 font-medium">操作</th>
              <th className="px-4 py-3 font-medium">请求参数</th>
              <th className="px-4 py-3 font-medium">返回参数</th>
              <th className="px-4 py-3 font-medium">状态 / 耗时</th>
              <th className="px-4 py-3 font-medium">操作人</th>
              <th className="px-4 py-3 font-medium">时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf2ed]">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-4">
                  <div className="font-semibold">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </div>
                  <div className="mt-1 max-w-72 truncate text-xs text-[#66756d]">
                    {log.action}
                  </div>
                  <div className="mt-2 text-xs leading-5 text-[#66756d]">
                    <div>资源：{log.resource}</div>
                    <div>ID：{log.resourceId ?? "无资源 ID"}</div>
                    <div>数据范围：{log.store ? "当前业务" : "全局"}</div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-[#66756d]">
                  <div className="mb-2 rounded-lg border border-[#dbe6dc] px-2 py-1 text-xs font-semibold text-[#15261d]">
                    {log.requestMethod ?? "METHOD"} {log.requestPath ?? "未记录路径"}
                  </div>
                  <JsonPreview label="请求参数" value={log.requestParams} />
                  <div className="mt-2 text-xs leading-5 text-[#66756d]">
                    <div>IP：{log.ip ?? "未记录"}</div>
                    <div className="max-w-80 truncate">
                      UA：{log.userAgent ?? "未记录"}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <JsonPreview
                    label="返回参数"
                    value={log.responseData ?? log.afterValue}
                  />
                  {log.beforeValue ? (
                    <div className="mt-3">
                      <JsonPreview label="变更前" value={log.beforeValue} />
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-4 align-top text-[#66756d]">
                  <div className="font-semibold text-[#15261d]">
                    {formatStatus(log.statusCode)}
                  </div>
                  <div className="mt-1 text-xs">{formatDuration(log.durationMs)}</div>
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="font-medium">{actorPrimary(log)}</div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    {actorSecondary(log)}
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-[#66756d]">
                  {formatDateTimeSecond(log.createdAt, "未记录")}
                </td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
	                <td className="px-4 py-10 text-center text-[#66756d]" colSpan={6}>
                  暂无操作日志
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <AdminPagination
          disabled={loading}
          onPageChange={(nextPage) => void reloadLogs(nextPage)}
          pagination={pagination}
        />
      </div>
    </section>
  );
}
