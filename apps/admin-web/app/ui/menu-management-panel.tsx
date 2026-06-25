"use client";

import {
  BadgeCheck,
  Boxes,
  Building2,
  ClipboardList,
  FileClock,
  FolderTree,
  LayoutDashboard,
  Package,
  Settings,
  Settings2,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  UsersRound,
  type LucideProps,
} from "lucide-react";
import { useState, type ComponentType } from "react";

import type {
  AdminMenuTreeNode,
  AdminNavIcon,
} from "@/app/lib/admin-navigation";

const iconMap: Record<AdminNavIcon, ComponentType<LucideProps>> = {
  "badge-check": BadgeCheck,
  boxes: Boxes,
  building: Building2,
  clipboard: ClipboardList,
  dashboard: LayoutDashboard,
  "file-clock": FileClock,
  "folder-tree": FolderTree,
  package: Package,
  "settings-2": Settings2,
  settings: Settings,
  shield: ShieldCheck,
  store: Store,
  truck: Truck,
  user: UserRound,
  users: UsersRound,
};

type MenuManagementPanelProps = {
  menuTree: AdminMenuTreeNode[];
};

function flattenMenuTree(nodes: AdminMenuTreeNode[]) {
  return nodes.flatMap((node) => [node, ...node.children]);
}

function PermissionBadges({ codes }: { codes: string[] }) {
  if (codes.length === 0) {
    return <span className="text-[#8a9a90]">无需权限</span>;
  }

  return (
    <div className="flex max-w-xl flex-wrap gap-1.5">
      {codes.map((code) => (
        <span
          className="rounded-full bg-[#eef8f0] px-2 py-1 text-xs font-semibold text-[#1f8f4f]"
          key={code}
        >
          {code}
        </span>
      ))}
    </div>
  );
}

export function MenuManagementPanel({ menuTree }: MenuManagementPanelProps) {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<"ALL" | "1" | "2">("ALL");
  const allRows = flattenMenuTree(menuTree);
  const trimmedQuery = query.trim().toLowerCase();
  const rows = allRows.filter((row) => {
    const matchesLevel =
      levelFilter === "ALL" || String(row.level) === levelFilter;
    const matchesQuery =
      !trimmedQuery ||
      [row.label, row.icon, row.section ?? "", ...row.permissionCodes]
        .join(" ")
        .toLowerCase()
        .includes(trimmedQuery);

    return matchesLevel && matchesQuery;
  });

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <FolderTree size={18} />
            系统管理
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">菜单管理</h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            树形表格展示后台两级菜单。一级菜单有独立图标，收缩侧边栏使用一级图标并悬浮展开二级菜单。
          </p>
        </div>
        <div className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-2">
          <div className="text-xs text-[#66756d]">菜单项</div>
          <div className="mt-1 text-lg font-semibold">{allRows.length}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-3">
        <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-xs font-semibold text-[#66756d]">
          关键字
          <input
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="菜单名称 / 图标 / 权限 / 节点"
            value={query}
          />
        </label>
        <label className="flex w-40 flex-col gap-1 text-xs font-semibold text-[#66756d]">
          层级
          <select
            className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-3 text-sm font-normal text-[#15261d] outline-none focus:border-[#1f8f4f]"
            onChange={(event) =>
              setLevelFilter(event.target.value as "ALL" | "1" | "2")
            }
            value={levelFilter}
          >
            <option value="ALL">全部层级</option>
            <option value="1">一级菜单</option>
            <option value="2">二级菜单</option>
          </select>
        </label>
        <button
          className="h-10 rounded-xl border border-[#dbe6dc] bg-white px-5 text-sm font-semibold text-[#66756d] hover:bg-[#f3f7f1]"
          onClick={() => {
            setQuery("");
            setLevelFilter("ALL");
          }}
          type="button"
        >
          重置
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-[#dbe6dc]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#f5f8f3] text-[#66756d]">
            <tr>
              <th className="px-4 py-3 font-medium">菜单名称</th>
              <th className="px-4 py-3 font-medium">图标</th>
              <th className="px-4 py-3 font-medium">路由/节点</th>
              <th className="px-4 py-3 font-medium">权限</th>
              <th className="px-4 py-3 font-medium">排序</th>
              <th className="px-4 py-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf2ed]">
            {rows.map((row) => {
              const Icon = iconMap[row.icon];

              return (
                <tr key={`${row.level}-${row.id}`}>
                  <td className="px-4 py-4">
                    <div
                      className="flex items-center gap-2 font-semibold"
                      style={{ paddingLeft: row.level === 2 ? 24 : 0 }}
                    >
                      <Icon className="text-[#1f8f4f]" size={17} />
                      {row.level === 2 ? <span className="text-[#8a9a90]">└</span> : null}
                      <span>{row.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <code className="rounded-lg bg-[#f5f8f3] px-2 py-1 text-xs text-[#435247]">
                      {row.icon}
                    </code>
                  </td>
                  <td className="px-4 py-4 text-[#66756d]">
                    {row.section ? `?section=${row.section}` : "一级目录"}
                  </td>
                  <td className="px-4 py-4">
                    <PermissionBadges codes={row.permissionCodes} />
                  </td>
                  <td className="px-4 py-4 text-[#66756d]">{row.sortOrder}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-[#e8f6ed] px-3 py-1 text-xs font-semibold text-[#1f8f4f]">
                      启用
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-[#66756d]" colSpan={6}>
                  没有匹配的菜单
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
