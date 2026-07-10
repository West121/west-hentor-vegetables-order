import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const ADMIN_MODAL_PANEL_FILES = [
  "delivery-range-panel.tsx",
  "dish-management-panel.tsx",
  "member-management-panel.tsx",
  "order-management-panel.tsx",
  "package-management-panel.tsx",
  "package-template-management-panel.tsx",
  "store-management-panel.tsx",
  "system-management-panel.tsx",
  "system-settings-panel.tsx",
  "task-management-panel.tsx",
];

const ADMIN_DRAGGABLE_MODAL_FILE = "admin-draggable-modal.tsx";

const EXPECTED_NAV_GROUPS = [
  "工作台",
  "订单管理",
  "会员管理",
  "套餐管理",
  "任务管理",
  "系统管理",
];

const EXPECTED_NAV_ITEMS = [
  "运营总览",
  "订单列表",
  "发货统计",
  "会员用户",
  "会员套餐",
  "套餐模板",
  "菜品管理",
  "任务配置",
  "后台用户",
  "角色管理",
  "菜单管理",
  "系统字典",
  "面单打印",
  "配送范围",
  "在线用户",
  "操作日志",
  "系统设置",
];

const EXPECTED_MODAL_SNIPPETS = [
  "const [fullscreen, setFullscreen]",
  "Maximize2",
  "Minimize2",
  'aria-modal="true"',
  'role="dialog"',
  "translate(",
  "setPointerCapture(event.pointerId)",
  "releasePointerCapture(event.pointerId)",
  "onPointerDown={handleHeaderPointerDown}",
  "onPointerCancel={handleHeaderPointerUp}",
  'title={fullscreen ? "退出全屏" : "全屏"}',
  "resize",
];

const MIN_ADMIN_FIGMA_SCREENSHOT_BYTES = 1024;

const EXPECTED_ADMIN_LINKED_FIGMA_NODES = [
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
];

const EXPECTED_ADMIN_FIGMA_SCREENSHOTS = [
  {
    height: 1024,
    path: "docs/prototypes/figma-screenshots/01-admin-order-operations.png",
    width: 1440,
  },
  {
    height: 1024,
    path: "docs/prototypes/figma-screenshots/02-admin-user-management.png",
    width: 1440,
  },
  {
    height: 1024,
    path: "docs/prototypes/figma-screenshots/07-admin-login.png",
    width: 1440,
  },
  {
    height: 1024,
    path: "docs/prototypes/figma-screenshots/09-admin-modal-spec.png",
    width: 1440,
  },
  {
    height: 1024,
    path: "docs/prototypes/figma-screenshots/10-admin-collapsed-menu.png",
    width: 1440,
  },
  {
    height: 860,
    path: "docs/prototypes/figma-screenshots/14-admin-nested-menu-collapse.png",
    width: 1440,
  },
];

function assertIncludes(source, snippet, prefix) {
  if (!source.includes(snippet)) {
    throw new Error(`${prefix}: missing ${snippet}`);
  }
}

function assertNotIncludes(source, snippet, prefix) {
  if (source.includes(snippet)) {
    throw new Error(`${prefix}: remove ${snippet}`);
  }
}

function readPngDimensions(buffer) {
  if (
    buffer.length < 24 ||
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47
  ) {
    throw new Error("ADMIN_FIGMA_SCREENSHOT_INVALID: not a PNG");
  }

  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

async function collectKnownFileSizes(rootDir, paths) {
  const files = new Map();
  for (const filePath of paths) {
    const fileStat = await stat(join(rootDir, filePath));
    files.set(filePath, fileStat.size);
  }

  return files;
}

async function collectPngDimensions(rootDir, paths) {
  const dimensions = new Map();
  for (const filePath of paths) {
    dimensions.set(
      filePath,
      readPngDimensions(await readFile(join(rootDir, filePath))),
    );
  }

  return dimensions;
}

export function assertAdminFigmaPrototypeRecord(markdown) {
  const missingLinkedNodes = EXPECTED_ADMIN_LINKED_FIGMA_NODES.filter(
    ({ frameName, nodeId }) =>
      !markdown.includes(frameName) || !markdown.includes(nodeId),
  );
  if (missingLinkedNodes.length > 0) {
    throw new Error(
      `ADMIN_FIGMA_LINKED_NODE_MISSING: ${missingLinkedNodes
        .map(({ frameName, nodeId }) => `${frameName} ${nodeId}`)
        .join(", ")}`,
    );
  }

  for (const screenshot of EXPECTED_ADMIN_FIGMA_SCREENSHOTS) {
    const fileName = screenshot.path.split("/").at(-1);
    if (!markdown.includes(fileName)) {
      throw new Error(`ADMIN_FIGMA_SCREENSHOT_RECORD_MISSING: ${fileName}`);
    }
  }

  return {
    hasFullAdminNodeTraceability: true,
    linkedNodes: EXPECTED_ADMIN_LINKED_FIGMA_NODES,
  };
}

export function assertAdminFigmaScreenshotArtifacts(files, dimensions) {
  for (const screenshot of EXPECTED_ADMIN_FIGMA_SCREENSHOTS) {
    const fileSize = files.get(screenshot.path) ?? 0;
    if (fileSize < MIN_ADMIN_FIGMA_SCREENSHOT_BYTES) {
      throw new Error(`ADMIN_FIGMA_SCREENSHOT_MISSING: ${screenshot.path}`);
    }

    const actualDimensions = dimensions.get(screenshot.path);
    if (!actualDimensions) {
      throw new Error(
        `ADMIN_FIGMA_SCREENSHOT_DIMENSIONS_MISSING: ${screenshot.path}`,
      );
    }
    if (
      actualDimensions.width !== screenshot.width ||
      actualDimensions.height !== screenshot.height
    ) {
      throw new Error(
        `ADMIN_FIGMA_SCREENSHOT_DIMENSION_MISMATCH: ${screenshot.path} ${actualDimensions.width}x${actualDimensions.height}`,
      );
    }
  }

  return {
    screenshots: EXPECTED_ADMIN_FIGMA_SCREENSHOTS.map((screenshot) => ({
      height: screenshot.height,
      path: screenshot.path,
      width: screenshot.width,
    })),
  };
}

export function assertAdminNavigationPrototypeSource({
  navigationSource,
  shellSource,
}) {
  for (const group of EXPECTED_NAV_GROUPS) {
    assertIncludes(navigationSource, `label: "${group}"`, "ADMIN_NAV_MISMATCH");
  }
  for (const item of EXPECTED_NAV_ITEMS) {
    assertIncludes(navigationSource, `label: "${item}"`, "ADMIN_NAV_MISMATCH");
  }

  const expectedNavigationSnippets = [
    "ADMIN_NAV_GROUPS",
    "collapsible: true",
    "stores.manage",
    "system.manage",
    "getCollapsedAdminNavGroupTarget(group)",
    "getDefaultOpenAdminNavGroups(groups)",
    "shouldRenderAdminNavItems",
    'collapsed ? "w-[72px]" : "w-[220px]"',
    "const contentPaddingClass",
    '"pl-[72px]"',
    '"pl-[220px]"',
    '"pl-[236px]"',
    "absolute right-0 top-6",
    "translate-x-1/2",
    "PanelLeftOpen",
    "PanelLeftClose",
    "<ChevronDown",
    "text-[15px]",
    "text-[16px]",
  ];
  const joined = `${navigationSource}\n${shellSource}`;
  for (const snippet of expectedNavigationSnippets) {
    assertIncludes(joined, snippet, "ADMIN_NAV_MISMATCH");
  }

  const forbiddenShellSnippets = [
    ">展开<",
    ">收起<",
    "w-[84px]",
    "w-[260px]",
    "pl-[84px]",
    "pl-[260px]",
    "collapsed && \"justify-center px-0\"",
  ];
  for (const snippet of forbiddenShellSnippets) {
    assertNotIncludes(shellSource, snippet, "ADMIN_NAV_MISMATCH");
  }

  return {
    collapsedWidthPx: 72,
    expandedWidthPx: 220,
    groups: EXPECTED_NAV_GROUPS.length,
    items: EXPECTED_NAV_ITEMS.length,
  };
}

export function assertAdminHeaderUserMenuPrototypeSource({
  menuModelSource = "",
  menuSource,
  pageSource,
}) {
  const combinedSource = `${menuModelSource}\n${menuSource}\n${pageSource}`;
  const requiredSnippets = [
    "AdminUserMenu",
    "buildAdminUserMenuItems",
    "canOpenOperationLogs",
    "roles",
    "scopeLabel",
    "账号资料",
    "角色范围",
    "操作日志",
    "退出登录",
    "来自当前真实登录会话",
    "sectionHref(\"operation-logs\")",
  ];
  for (const snippet of requiredSnippets) {
    assertIncludes(combinedSource, snippet, "ADMIN_USER_MENU_MISMATCH");
  }

  assertNotIncludes(pageSource, "<LogoutButton />", "ADMIN_USER_MENU_MISMATCH");

  return {
    hasOperationLogsEntry: true,
    hasProfilePanel: true,
    hasRolePanel: true,
  };
}

export function assertAdminLoginPrototypeSource(loginSource) {
  const imgCount = (loginSource.match(/<img/g) ?? []).length;
  if (imgCount < 4) {
    throw new Error(`ADMIN_LOGIN_MISMATCH: expected >=4 vegetable images, got ${imgCount}`);
  }

  const requiredSnippets = [
    'aria-label="蔬菜图片墙"',
    "市场里的新鲜蔬菜",
    "菠菜",
    "番茄",
    "黄瓜",
    "管理系统登录",
    "使用后台账号登录",
    "LoginForm",
  ];
  for (const snippet of requiredSnippets) {
    assertIncludes(loginSource, snippet, "ADMIN_LOGIN_MISMATCH");
  }

  const forbiddenSnippets = [
    "从套餐、预订到配送任务",
    "总部 + 加盟门店统一运营",
    "text-5xl",
  ];
  for (const snippet of forbiddenSnippets) {
    assertNotIncludes(loginSource, snippet, "ADMIN_LOGIN_MISMATCH");
  }

  return {
    vegetableImages: imgCount,
  };
}

export function assertAdminModalPrototypeSource(panelSources) {
  const missingPanels = ADMIN_MODAL_PANEL_FILES.filter(
    (fileName) => !panelSources[fileName],
  );
  if (missingPanels.length) {
    throw new Error(`ADMIN_MODAL_MISMATCH: missing panels ${missingPanels.join(", ")}`);
  }

  const sharedModalSource = panelSources[ADMIN_DRAGGABLE_MODAL_FILE] ?? "";
  for (const snippet of EXPECTED_MODAL_SNIPPETS) {
    assertIncludes(sharedModalSource, snippet, "ADMIN_MODAL_MISMATCH shared-modal");
  }
  assertIncludes(
    sharedModalSource,
    "const [fullscreen, setFullscreen] = useState(true)",
    "ADMIN_MODAL_MISMATCH shared-modal",
  );
  if (
    !/overflow-hidden[^\n"]*rounded-2xl[^\n"]*bg-white[^\n"]*shadow-2xl/.test(
      sharedModalSource,
    )
  ) {
    throw new Error("ADMIN_MODAL_MISMATCH shared-modal: missing modal shell surface");
  }

  for (const fileName of ADMIN_MODAL_PANEL_FILES) {
    const source = panelSources[fileName];
    const usesSharedModal = source.includes("AdminDraggableModal");

    if (!usesSharedModal) {
      for (const snippet of EXPECTED_MODAL_SNIPPETS) {
        assertIncludes(source, snippet, `ADMIN_MODAL_MISMATCH ${fileName}`);
      }
      assertIncludes(
        source,
        "const [fullscreen, setFullscreen] = useState(true)",
        `ADMIN_MODAL_MISMATCH ${fileName}`,
      );
      if (
        !/overflow-hidden[^\n"]*rounded-2xl[^\n"]*bg-white[^\n"]*shadow-2xl/.test(
          source,
        )
      ) {
        throw new Error(`ADMIN_MODAL_MISMATCH ${fileName}: missing modal shell surface`);
      }
    }

    assertNotIncludes(source, ">全屏<", `ADMIN_MODAL_MISMATCH ${fileName}`);
    assertNotIncludes(source, ">全<", `ADMIN_MODAL_MISMATCH ${fileName}`);
  }

  return {
    draggableResizablePanels: ADMIN_MODAL_PANEL_FILES.length,
  };
}

export function assertAdminStoreConceptSource({
  dashboardSource,
  navigationSource,
  pageSource,
}) {
  const requiredSnippets = [
    "storeAccessScope",
    "stores: session.stores",
    "storeId",
    "activeStore",
    "stores.manage",
  ];
  for (const snippet of requiredSnippets) {
    assertIncludes(
      `${dashboardSource}\n${navigationSource}\n${pageSource}`,
      snippet,
      "ADMIN_STORE_MISMATCH",
    );
  }

  return {
    hasStoreScopedManagement: true,
  };
}

async function readAdminSources(rootDir) {
  const adminRoot = join(rootDir, "apps/admin-web/app");
  const panelEntries = await Promise.all(
    [ADMIN_DRAGGABLE_MODAL_FILE, ...ADMIN_MODAL_PANEL_FILES].map(async (fileName) => [
      fileName,
      await readFile(join(adminRoot, "ui", fileName), "utf8"),
    ]),
  );

  return {
    dashboardSource: await readFile(join(adminRoot, "dashboard-client.tsx"), "utf8"),
    loginSource: await readFile(join(adminRoot, "login/page.tsx"), "utf8"),
    menuModelSource: await readFile(
      join(adminRoot, "ui/admin-user-menu-model.ts"),
      "utf8",
    ),
    menuSource: await readFile(join(adminRoot, "ui/admin-user-menu.tsx"), "utf8"),
    navigationSource: await readFile(join(adminRoot, "lib/admin-navigation.ts"), "utf8"),
    pageSource: await readFile(join(adminRoot, "page.tsx"), "utf8"),
    panelSources: Object.fromEntries(panelEntries),
    shellSource: await readFile(join(adminRoot, "ui/admin-shell.tsx"), "utf8"),
  };
}

export async function runAdminArtifactSmoke({ rootDir = process.cwd() } = {}) {
  const sources = await readAdminSources(rootDir);
  const figmaMarkdown = await readFile(
    join(rootDir, "docs/prototypes/figma-prototype.md"),
    "utf8",
  );
  const screenshotPaths = EXPECTED_ADMIN_FIGMA_SCREENSHOTS.map(
    (screenshot) => screenshot.path,
  );
  const [screenshotFiles, screenshotDimensions] = await Promise.all([
    collectKnownFileSizes(rootDir, screenshotPaths),
    collectPngDimensions(rootDir, screenshotPaths),
  ]);

  return {
    figmaPrototypeRecord: assertAdminFigmaPrototypeRecord(figmaMarkdown),
    figmaScreenshots: assertAdminFigmaScreenshotArtifacts(
      screenshotFiles,
      screenshotDimensions,
    ),
    headerUserMenu: assertAdminHeaderUserMenuPrototypeSource(sources),
    loginPrototype: assertAdminLoginPrototypeSource(sources.loginSource),
    modalPrototype: assertAdminModalPrototypeSource(sources.panelSources),
    navigationPrototype: assertAdminNavigationPrototypeSource(sources),
    storeConcept: assertAdminStoreConceptSource(sources),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runAdminArtifactSmoke();
  console.log(JSON.stringify(result, null, 2));
}
