import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("member management modal usage", () => {
  it("separates read-only member detail from member editing", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("Eye");
    expect(source).toContain('type MemberModalMode = "detail" | "edit"');
    expect(source).toContain("openDetailModal");
    expect(source).toContain('variant="outline"');
    expect(source).toContain("<Eye data-icon=\"inline-start\" />");
    expect(source).toContain("查看");
    expect(source).toContain("编辑会员");
    expect(source).toContain('modalMode === "detail"');
    expect(source).toContain('readOnly={modalMode === "detail"}');
    expect(source).toContain('{modalMode === "detail" ? "关闭" : "取消"}');
    expect(source).toContain('modalMode !== "detail"');
  });

  it("edits member default address with region fields and readable order summaries", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("defaultAddress");
    expect(source).toContain("province");
    expect(source).toContain("city");
    expect(source).toContain("district");
    expect(source).toContain("详细地址");
    expect(source).toContain("receiverName");
    expect(source).toContain("receiverPhone");
    expect(source).toContain("formatRecentOrder");
    expect(source).toContain("dishNameSnapshot");
    expect(source).not.toContain("弹窗工作模式");
    expect(source).not.toContain("标题栏可拖拽");
  });

  it("uses shared China region data with searchable and clearable address cascading", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("AddressRegionCascader");
    expect(source).toContain("SearchableRegionSelect");
    expect(source).toContain("CHINA_PROVINCE_REGIONS");
    expect(source).toContain("getChinaCityRegion");
    expect(source).toContain("appendCurrentOption");
    expect(source).toContain("filteredOptions");
    expect(source).toContain("placeholder={`搜索${label}`}");
    expect(source).toContain("aria-label={`清除${label}`}");
    expect(source).toContain("请选择省");
    expect(source).toContain("请选择市");
    expect(source).toContain("请选择区");
    expect(source).not.toContain('from "@/components/ui/select"');
    expect(source).not.toContain("<SelectTrigger");
    expect(source).not.toContain("<SelectContent");
    expect(source).not.toContain("例如 江苏省");
    expect(source).not.toContain("例如 南京市");
    expect(source).not.toContain("例如 六合区");
  });

  it("opens manual member creation in the draggable admin modal shell", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );
    const createBlock = source.slice(
      source.indexOf("{createOpen ? ("),
      source.indexOf("{importOpen ? ("),
    );

    expect(createBlock).toContain('aria-modal="true"');
    expect(createBlock).toContain('role="dialog"');
    expect(createBlock).toContain("resize");
    expect(createBlock).toContain("translate(");
    expect(createBlock).toContain("onPointerDown={handleHeaderPointerDown}");
    expect(createBlock).toContain("onPointerCancel={handleHeaderPointerUp}");
    expect(createBlock).toContain('title={fullscreen ? "退出全屏" : "全屏"}');
    expect(createBlock).toContain("Maximize2");
    expect(createBlock).toContain("Minimize2");
  });

  it("keeps only member-package import visible in the member list actions", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );
    const headerActions = source.slice(
      source.indexOf("openCreateModal"),
      source.indexOf('["全部", summary.total]'),
    );

    expect(headerActions).not.toContain('openImportModal("members")');
    expect(headerActions).not.toContain(">导入会员<");
    expect(headerActions).toContain('openImportModal("packages")');
    expect(headerActions).toContain("导入会员套餐");
    expect(source).toContain("会员不存在时会自动创建");
    expect(source).toContain("新建绑定");
    expect(source).toContain("FormData");
    expect(source).toContain("/api/admin/members/import");
    expect(source).toContain("/api/admin/user-packages/import");
    expect(source).toContain("IMPORT_FILE_ACCEPT");
    expect(source).toContain("支持 .xlsx、.xls、.csv");
    expect(source).toContain("下载模板");
    expect(source).toContain("会员导入模板.xlsx");
    expect(source).toContain("会员套餐导入模板.xlsx");
    expect(source).toContain("utils.aoa_to_sheet");
    expect(source).not.toContain("parseMemberImportText");
    expect(source).not.toContain("选择 CSV/TXT");
  });

  it("exposes manual member creation from the member list panel", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("新增会员");
    expect(source).toContain("openCreateModal");
    expect(source).toContain('fetch("/api/admin/members"');
    expect(source).toContain("手动创建会员或将已有手机号绑定到当前数据范围");
    expect(source).toContain("请输入会员手机号");
    expect(source).toContain("validateCreateMemberForm");
    expect(source).toContain('errors.disabledReason = "请输入停用原因"');
  });

  it("defaults the member list to active members and supports logical deletion", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );
    const dashboard = readFileSync(
      join(process.cwd(), "app/dashboard-client.tsx"),
      "utf8",
    );

    expect(source).toContain('useState<BindingStatus | "ALL">("ACTIVE")');
    expect(source).toContain('setStatusFilter("ACTIVE")');
    expect(source).toContain('statusFilter: "ACTIVE"');
    expect(source).toContain('DELETED: "已删除"');
    expect(source).toContain('["已删除", summary.deleted]');
    expect(source).toContain('params.set("status", filters.statusFilter)');
    expect(source).toContain("已删除记录");
    expect(dashboard).toContain('`${withStore("/api/admin/members")}&status=ACTIVE`');
    expect(source).toContain("Trash2");
    expect(source).toContain("setDeleteCandidate(member)");
    expect(source).toContain("删除会员");
    expect(source).toContain('method: "DELETE"');
    expect(source).toContain("历史订单、套餐和操作日志仍会保留");
  });

  it("renders member avatars when available", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("AdminMemberAvatar");
    expect(source).toContain("avatarUrl={member.avatarUrl}");
    expect(source).toContain("avatarUrl={modalMember.avatarUrl}");
  });

  it("supports editing member nickname in the admin member modal", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );
    const stateSource = readFileSync(
      join(process.cwd(), "app/ui/member-modal-state.ts"),
      "utf8",
    );

    expect(stateSource).toContain("nickname: string");
    expect(stateSource).toContain("nickname: member.nickname ?? \"\"");
    expect(stateSource).toContain("current.nickname !== initial.nickname");
    expect(source).toContain('label="会员昵称"');
    expect(source).toContain("nickname: form.nickname");
    expect(source).toContain("nickname: updatedMember.nickname");
    expect(source).toContain("placeholder=\"未填写时显示微信用户\"");
  });

  it("requires a disabled reason before stopping member service", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain(
      'form.status === "DISABLED" && !form.disabledReason.trim()',
    );
    expect(source).toContain('errors.disabledReason = "请输入停用原因"');
    expect(source).toMatch(
      /placeholder=\{\s*form\.status === "DISABLED" \? "请输入停用原因" : ""\s*\}/,
    );
    expect(source).toContain('required={form.status === "DISABLED"}');
  });

  it("keeps member modal forms in one compact flow", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );

    expect(source).not.toContain("md:grid-cols-[1fr_280px]");
    expect(source).not.toContain("<aside className=\"flex flex-col gap-4\">");
    expect(source).toContain("sm:grid-cols-2 lg:grid-cols-4");
  });

  it("uses shadcn tooltip for overflowing member table text and text action buttons", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );
    const helperSource = readFileSync(
      join(process.cwd(), "app/ui/admin-table-tooltip.tsx"),
      "utf8",
    );

    expect(source).toContain("AdminOverflowText");
    expect(source).toContain('from "@/components/ui/button"');
    expect(source).toContain('from "./admin-table-tooltip"');
    expect(source).toContain("<Pencil data-icon=\"inline-start\" />");
    expect(source).toContain("<Trash2 data-icon=\"inline-start\" />");
    expect(source).toContain("编辑");
    expect(source).toContain("删除");
    expect(helperSource).toContain('from "@/components/ui/tooltip"');
    expect(helperSource).toContain("TooltipProvider");
    expect(helperSource).toContain("TooltipTrigger asChild");
    expect(helperSource).toContain("truncate");
  });
});
