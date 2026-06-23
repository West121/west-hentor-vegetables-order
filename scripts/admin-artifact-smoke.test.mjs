import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ADMIN_MODAL_PANEL_FILES,
  assertAdminFigmaPrototypeRecord,
  assertAdminFigmaScreenshotArtifacts,
  assertAdminHeaderUserMenuPrototypeSource,
  assertAdminLoginPrototypeSource,
  assertAdminModalPrototypeSource,
  assertAdminNavigationPrototypeSource,
  assertAdminStoreConceptSource,
} from "./admin-artifact-smoke.mjs";

const navigationSource = `
export const ADMIN_NAV_GROUPS = [
  { label: "工作台", collapsible: true, items: [
    { icon: "dashboard", label: "运营总览", section: "overview" },
  ] },
  { label: "订单管理", collapsible: true, items: [
    { icon: "clipboard", label: "订单列表", section: "orders" },
    { icon: "truck", label: "发货统计", section: "shipment-stats" },
  ] },
  { label: "会员管理", collapsible: true, items: [
    { icon: "users", label: "会员用户", section: "members" },
    { icon: "shield", label: "用户套餐", section: "user-packages" },
  ] },
  { label: "套餐管理", collapsible: true, items: [
    { icon: "package", label: "套餐模板", section: "package-templates" },
    { icon: "boxes", label: "菜品管理", section: "dishes" },
  ] },
  { label: "门店管理", collapsible: true, items: [
    { icon: "store", label: "加盟门店", section: "stores" },
    { icon: "building", label: "加盟商", section: "franchisees" },
  ] },
  { label: "任务管理", collapsible: true, items: [
    { icon: "file-clock", label: "任务配置", section: "tasks" },
  ] },
  { label: "系统管理", collapsible: true, items: [
    { icon: "user", label: "后台用户", section: "admin-users" },
    { icon: "file-clock", label: "操作日志", section: "operation-logs" },
    { icon: "settings", label: "系统设置", section: "system-settings" },
  ] },
];
const sectionPermissionMap = { stores: ["stores.manage"], admin: ["system.manage"] };
`;

const shellSource = `
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
getCollapsedAdminNavGroupTarget(group);
getDefaultOpenAdminNavGroups(groups);
shouldRenderAdminNavItems();
collapsed ? "w-[72px]" : "w-[220px]";
collapsed ? "pl-[72px]" : "pl-[220px]";
<button className="absolute right-0 top-6 translate-x-1/2"><PanelLeftOpen /><PanelLeftClose /></button>
<ChevronDown className="transition" />
<button className="text-[15px]"></button>
<a className="text-[16px]"></a>
`;

const pageSource = `
import { listAccessibleStores, listFranchisees, listStores } from "@hentor/db";
import { AdminUserMenu } from "./ui/admin-user-menu";
import { StoreSwitcher } from "./ui/store-switcher";
const managedStores = listStores();
const franchisees = listFranchisees();
<StoreSwitcher />
<AdminUserMenu canOpenOperationLogs scopeLabel="全部门店" roles="总部管理员" />
`;

const menuSource = `
buildAdminUserMenuItems();
const props = { canOpenOperationLogs: true, roles: "总部管理员", scopeLabel: "全部门店" };
sectionHref("operation-logs");
<div>账号资料</div>
<div>角色范围</div>
<div>操作日志</div>
<button>退出登录</button>
<div>来自当前真实登录会话</div>
`;

const loginSource = `
<section aria-label="蔬菜图片墙">
  <img alt="市场里的新鲜蔬菜" />
  <img alt="菠菜" />
  <img alt="番茄" />
  <img alt="黄瓜" />
</section>
<div>管理系统登录</div>
<p>使用后台账号登录</p>
<LoginForm />
`;

const modalPanelSource = `
const [fullscreen, setFullscreen] = useState(false);
<Maximize2 />
<Minimize2 />
aria-modal="true"
role="dialog"
style={{ transform: "translate(0px, 0px)" }}
setPointerCapture(event.pointerId);
releasePointerCapture(event.pointerId);
onPointerDown={handleHeaderPointerDown}
onPointerCancel={handleHeaderPointerUp}
title={fullscreen ? "退出全屏" : "全屏"}
className="absolute overflow-hidden rounded-2xl bg-white shadow-2xl resize"
`;

const figmaPrototypeMarkdown = `
[01 PC 后台 / 订单运营台](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=3-49)
[02 PC 后台 / 用户管理](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=3-237)
[07 PC 后台 / 登录页](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=15-2)
[09 PC 后台 / 弹窗交互规范](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=26-2)
[10 PC 后台 / 菜单折叠状态](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=33-62)
[14 PC 后台 / 二级菜单收缩展开](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=53-2)
01-admin-order-operations.png
02-admin-user-management.png
07-admin-login.png
09-admin-modal-spec.png
10-admin-collapsed-menu.png
14-admin-nested-menu-collapse.png
`;

const adminScreenshotPaths = [
  "docs/prototypes/figma-screenshots/01-admin-order-operations.png",
  "docs/prototypes/figma-screenshots/02-admin-user-management.png",
  "docs/prototypes/figma-screenshots/07-admin-login.png",
  "docs/prototypes/figma-screenshots/09-admin-modal-spec.png",
  "docs/prototypes/figma-screenshots/10-admin-collapsed-menu.png",
  "docs/prototypes/figma-screenshots/14-admin-nested-menu-collapse.png",
];

function buildPanelSources(source = modalPanelSource) {
  return Object.fromEntries(
    ADMIN_MODAL_PANEL_FILES.map((fileName) => [fileName, source]),
  );
}

test("admin artifact smoke keeps PC Figma node traceability and baselines", () => {
  assert.deepEqual(assertAdminFigmaPrototypeRecord(figmaPrototypeMarkdown), {
    hasFullAdminNodeTraceability: true,
    linkedNodes: [
      {
        frameName: "01 PC 后台 / 订单运营台",
        nodeId: "node-id=3-49",
      },
      {
        frameName: "02 PC 后台 / 用户管理",
        nodeId: "node-id=3-237",
      },
      {
        frameName: "07 PC 后台 / 登录页",
        nodeId: "node-id=15-2",
      },
      {
        frameName: "09 PC 后台 / 弹窗交互规范",
        nodeId: "node-id=26-2",
      },
      {
        frameName: "10 PC 后台 / 菜单折叠状态",
        nodeId: "node-id=33-62",
      },
      {
        frameName: "14 PC 后台 / 二级菜单收缩展开",
        nodeId: "node-id=53-2",
      },
    ],
  });

  assert.throws(
    () =>
      assertAdminFigmaPrototypeRecord(
        figmaPrototypeMarkdown.replace("node-id=53-2", ""),
      ),
    /ADMIN_FIGMA_LINKED_NODE_MISSING/,
  );

  const files = new Map(adminScreenshotPaths.map((path) => [path, 4096]));
  const dimensions = new Map(
    adminScreenshotPaths.map((path) => [
      path,
      {
        height: path.includes("14-admin") ? 860 : 1024,
        width: 1440,
      },
    ]),
  );
  assert.equal(
    assertAdminFigmaScreenshotArtifacts(files, dimensions).screenshots.length,
    6,
  );

  dimensions.set(adminScreenshotPaths[0], { height: 844, width: 390 });
  assert.throws(
    () => assertAdminFigmaScreenshotArtifacts(files, dimensions),
    /ADMIN_FIGMA_SCREENSHOT_DIMENSION_MISMATCH/,
  );
});

test("admin artifact smoke keeps the two-level Figma navigation contract", () => {
  assert.deepEqual(
    assertAdminNavigationPrototypeSource({ navigationSource, shellSource }),
    {
      collapsedWidthPx: 72,
      expandedWidthPx: 220,
      groups: 7,
      items: 13,
    },
  );

  assert.throws(
    () =>
      assertAdminNavigationPrototypeSource({
        navigationSource: navigationSource.replace('label: "系统管理"', ""),
        shellSource,
      }),
    /ADMIN_NAV_MISMATCH/,
  );
});

test("admin artifact smoke keeps the rich top-right user menu", () => {
  assert.deepEqual(
    assertAdminHeaderUserMenuPrototypeSource({ menuSource, pageSource }),
    {
      hasOperationLogsEntry: true,
      hasProfilePanel: true,
      hasRolePanel: true,
    },
  );

  assert.throws(
    () =>
      assertAdminHeaderUserMenuPrototypeSource({
        menuSource,
        pageSource: "<LogoutButton />",
      }),
    /ADMIN_USER_MENU_MISMATCH/,
  );
});

test("admin artifact smoke keeps the login page as a vegetable photo wall", () => {
  assert.deepEqual(assertAdminLoginPrototypeSource(loginSource), {
    vegetableImages: 4,
  });

  assert.throws(
    () => assertAdminLoginPrototypeSource("<img /><div>管理系统登录</div>"),
    /ADMIN_LOGIN_MISMATCH/,
  );
});

test("admin artifact smoke keeps management dialogs draggable and resizable", () => {
  assert.deepEqual(assertAdminModalPrototypeSource(buildPanelSources()), {
    draggableResizablePanels: ADMIN_MODAL_PANEL_FILES.length,
  });

  assert.throws(
    () =>
      assertAdminModalPrototypeSource(
        buildPanelSources(modalPanelSource.replace("Maximize2", "")),
      ),
    /ADMIN_MODAL_MISMATCH/,
  );
});

test("admin artifact smoke keeps the franchise store management concept", () => {
  assert.deepEqual(
    assertAdminStoreConceptSource({ navigationSource, pageSource }),
    {
      hasFranchiseeStoreManagement: true,
    },
  );

  assert.throws(
    () =>
      assertAdminStoreConceptSource({
        navigationSource: navigationSource.replace('label: "加盟商"', ""),
        pageSource,
      }),
    /ADMIN_STORE_MISMATCH/,
  );
});
