import { existsSync } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import net from "node:net";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright-core";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, "..");
const DEFAULT_OUTPUT_DIR = join(ROOT_DIR, "tmp/admin-runtime-visual");
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "Admin123456";
const ADMIN_VIEWPORT = { height: 1000, width: 1440 };
const MIN_SCREENSHOT_BYTES = 16 * 1024;

export const ADMIN_RUNTIME_BASE_TARGETS = [
  {
    fileName: "admin-login.png",
    name: "login",
    type: "base",
    requiredTexts: ["管理系统登录", "欢迎回来", "使用后台账号登录"],
  },
  {
    fileName: "admin-shell.png",
    name: "shell",
    type: "base",
    requiredTexts: ["工作台", "订单管理", "会员管理", "套餐管理", "系统管理"],
  },
  {
    fileName: "admin-user-menu.png",
    name: "user-menu",
    type: "base",
    requiredTexts: ["账号资料", "角色范围", "操作日志", "退出登录"],
  },
];

export const ADMIN_RUNTIME_NAVIGATION_TARGETS = [
  {
    fileName: "admin-sidebar-collapsed.png",
    name: "sidebar-collapsed",
    type: "navigation",
    requiredTexts: ["运营总览", "加盟门店", "支付预留"],
  },
  {
    fileName: "admin-system-menu-collapsed.png",
    name: "system-menu-collapsed",
    section: "admin-users",
    type: "navigation",
    requiredTexts: ["后台用户", "新建用户", "授权门店"],
  },
];

export const ADMIN_RUNTIME_SECTION_TARGETS = [
  {
    fileName: "admin-section-overview.png",
    name: "section-overview",
    section: "overview",
    type: "section",
    requiredTexts: ["运营总览", "加盟门店", "支付预留"],
  },
  {
    fileName: "admin-section-orders.png",
    name: "section-orders",
    section: "orders",
    type: "section",
    requiredTexts: ["订单列表", "新建订单", "批量发货", "导出"],
  },
  {
    fileName: "admin-section-shipment-stats.png",
    name: "section-shipment-stats",
    section: "shipment-stats",
    type: "section",
    requiredTexts: ["发货统计", "复制", "导出", "支持日期"],
  },
  {
    fileName: "admin-section-members.png",
    name: "section-members",
    section: "members",
    type: "section",
    requiredTexts: ["会员用户", "会员用户管理", "小程序登录"],
  },
  {
    fileName: "admin-section-user-packages.png",
    name: "section-user-packages",
    section: "user-packages",
    type: "section",
    requiredTexts: ["用户套餐", "用户套餐管理", "购买套餐预留"],
  },
  {
    fileName: "admin-section-package-templates.png",
    name: "section-package-templates",
    section: "package-templates",
    type: "section",
    requiredTexts: ["套餐模板", "套餐模板管理", "新建套餐"],
  },
  {
    fileName: "admin-section-dishes.png",
    name: "section-dishes",
    section: "dishes",
    type: "section",
    requiredTexts: ["菜品管理", "新建菜品", "库存"],
  },
  {
    fileName: "admin-section-stores.png",
    name: "section-stores",
    section: "stores",
    type: "section",
    requiredTexts: ["加盟门店", "新建门店", "业务数据"],
  },
  {
    fileName: "admin-section-franchisees.png",
    name: "section-franchisees",
    section: "franchisees",
    type: "section",
    requiredTexts: ["合作主体", "新建加盟商", "合同到期"],
  },
  {
    fileName: "admin-section-tasks.png",
    name: "section-tasks",
    section: "tasks",
    type: "section",
    requiredTexts: ["任务配置", "新建任务", "截单"],
  },
  {
    fileName: "admin-section-admin-users.png",
    name: "section-admin-users",
    section: "admin-users",
    type: "section",
    requiredTexts: ["后台用户", "新建用户", "授权门店"],
  },
  {
    fileName: "admin-section-operation-logs.png",
    name: "section-operation-logs",
    section: "operation-logs",
    type: "section",
    requiredTexts: ["操作日志", "独立展示关键操作记录", "刷新日志"],
  },
  {
    fileName: "admin-section-system-settings.png",
    name: "section-system-settings",
    section: "system-settings",
    type: "section",
    requiredTexts: ["系统设置", "编辑设置", "每日截单", "客服电话"],
  },
];

export const ADMIN_RUNTIME_MODAL_TARGETS = [
  {
    fileName: "admin-order-modal.png",
    name: "order-modal",
    section: "orders",
    triggerTitle: "查看详情",
    type: "modal",
    requiredTexts: ["订单详情", "基础信息", "配送地址", "菜品明细"],
  },
  {
    fileName: "admin-member-modal.png",
    name: "member-modal",
    section: "members",
    triggerTitle: "查看详情",
    type: "modal",
    requiredTexts: ["会员详情", "基础信息", "默认地址", "套餐与订单"],
  },
  {
    fileName: "admin-user-package-modal.png",
    name: "user-package-modal",
    section: "user-packages",
    triggerTitle: "查看详情",
    type: "modal",
    requiredTexts: ["用户套餐详情", "套餐", "操作日志"],
  },
  {
    fileName: "admin-template-modal.png",
    name: "template-modal",
    section: "package-templates",
    triggerTitle: "查看详情",
    type: "modal",
    requiredTexts: ["套餐模板详情", "已开通用户套餐", "购买单预留"],
  },
  {
    fileName: "admin-dish-modal.png",
    name: "dish-modal",
    section: "dishes",
    triggerTitle: "查看详情",
    type: "modal",
    requiredTexts: ["菜品详情", "菜品名称", "库存"],
  },
  {
    fileName: "admin-task-modal.png",
    name: "task-modal",
    section: "tasks",
    triggerTitle: "查看详情",
    type: "modal",
    requiredTexts: ["任务详情", "任务名称", "截单时间"],
  },
  {
    fileName: "admin-system-settings-modal.png",
    name: "system-settings-modal",
    section: "system-settings",
    triggerText: "编辑设置",
    type: "modal",
    requiredTexts: ["编辑系统设置", "截单时间", "用户协议链接"],
  },
];

export const ADMIN_RUNTIME_VISUAL_TARGETS = [
  ...ADMIN_RUNTIME_BASE_TARGETS,
  ...ADMIN_RUNTIME_NAVIGATION_TARGETS,
  ...ADMIN_RUNTIME_SECTION_TARGETS,
  ...ADMIN_RUNTIME_MODAL_TARGETS,
];

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

function stripEnvQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export async function loadEnvFile(filePath, env = process.env) {
  if (!existsSync(filePath)) {
    return;
  }

  const text = await readFile(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (env[key] === undefined) {
      env[key] = stripEnvQuotes(rawValue);
    }
  }
}

export function detectChromeExecutable({
  candidates = CHROME_CANDIDATES,
  env = process.env,
} = {}) {
  if (env.ADMIN_RUNTIME_CHROME_PATH) {
    return env.ADMIN_RUNTIME_CHROME_PATH;
  }

  const executable = candidates.find((candidate) => existsSync(candidate));
  if (!executable) {
    throw new Error(
      `ADMIN_RUNTIME_VISUAL_BROWSER_REQUIRED: set ADMIN_RUNTIME_CHROME_PATH or install Chrome; checked ${candidates.join(", ")}`,
    );
  }

  return executable;
}

function readPngDimensionsFromBuffer(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error("ADMIN_RUNTIME_VISUAL_SCREENSHOT_INVALID: not a PNG");
  }

  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

export async function assertRuntimeScreenshot({
  expectedHeight = ADMIN_VIEWPORT.height,
  expectedWidth = ADMIN_VIEWPORT.width,
  filePath,
  name,
}) {
  const fileStat = await stat(filePath);
  if (fileStat.size < MIN_SCREENSHOT_BYTES) {
    throw new Error(
      `ADMIN_RUNTIME_VISUAL_SCREENSHOT_EMPTY: ${name} screenshot is too small (${fileStat.size} bytes)`,
    );
  }

  const dimensions = readPngDimensionsFromBuffer(await readFile(filePath));
  if (
    dimensions.width !== expectedWidth ||
    dimensions.height !== expectedHeight
  ) {
    throw new Error(
      `ADMIN_RUNTIME_VISUAL_SCREENSHOT_SIZE: ${name} expected ${expectedWidth}x${expectedHeight}, got ${dimensions.width}x${dimensions.height}`,
    );
  }

  return {
    bytes: fileStat.size,
    dimensions,
  };
}

export function assertAdminFullscreenBox({ box, viewport = ADMIN_VIEWPORT }) {
  if (
    !box ||
    box.x > 32 ||
    box.y > 32 ||
    box.width < viewport.width - 80 ||
    box.height < viewport.height - 80
  ) {
    throw new Error(
      `ADMIN_RUNTIME_MODAL_FULLSCREEN_MISMATCH: ${JSON.stringify(box)}`,
    );
  }

  return { fullscreen: true };
}

export function assertAdminDraggedBox({ after, before }) {
  if (
    !before ||
    !after ||
    Math.abs(after.x - before.x) < 24 ||
    Math.abs(after.y - before.y) < 16
  ) {
    throw new Error(
      `ADMIN_RUNTIME_MODAL_DRAG_MISMATCH: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
    );
  }

  return {
    deltaX: Math.round(after.x - before.x),
    deltaY: Math.round(after.y - before.y),
  };
}

export function assertAdminResizableStyle(resize) {
  if (!["both", "horizontal", "vertical"].includes(resize)) {
    throw new Error(`ADMIN_RUNTIME_MODAL_RESIZE_MISMATCH: ${resize}`);
  }

  return { resize };
}

export function assertAdminCollapsedSidebarLayout({
  contentPaddingLeft,
  hiddenLabelCount,
  sidebarBox,
}) {
  if (
    !sidebarBox ||
    Math.abs(sidebarBox.width - 72) > 2 ||
    Math.abs(contentPaddingLeft - 72) > 2 ||
    hiddenLabelCount !== 0
  ) {
    throw new Error(
      `ADMIN_RUNTIME_SIDEBAR_COLLAPSE_MISMATCH: ${JSON.stringify({
        contentPaddingLeft,
        hiddenLabelCount,
        sidebarBox,
      })}`,
    );
  }

  return {
    collapsed: true,
    contentPaddingLeft,
    sidebarWidth: Math.round(sidebarBox.width),
  };
}

export function assertAdminGroupCollapsedLayout({
  hiddenChildCount,
  visibleGroupCount,
}) {
  if (visibleGroupCount < 1 || hiddenChildCount !== 0) {
    throw new Error(
      `ADMIN_RUNTIME_NAV_GROUP_COLLAPSE_MISMATCH: ${JSON.stringify({
        hiddenChildCount,
        visibleGroupCount,
      })}`,
    );
  }

  return {
    groupCollapsed: true,
    hiddenChildCount,
    visibleGroupCount,
  };
}

async function findFreePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  if (!address || typeof address === "string") {
    throw new Error("ADMIN_RUNTIME_VISUAL_PORT_UNAVAILABLE");
  }

  return address.port;
}

async function waitForServer({ baseUrl, child, output }) {
  const deadline = Date.now() + 30_000;
  let lastError = "";
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `ADMIN_RUNTIME_VISUAL_SERVER_EXITED: ${child.exitCode}\n${output.join("")}`,
      );
    }

    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `ADMIN_RUNTIME_VISUAL_SERVER_TIMEOUT: ${lastError}\n${output.join("")}`,
  );
}

export async function startManagedAdminServer({
  rootDir = ROOT_DIR,
  port,
} = {}) {
  const serverPort = port ?? (await findFreePort());
  const output = [];
  const child = spawn(
    "pnpm",
    [
      "--filter",
      "@hentor/admin-web",
      "exec",
      "next",
      "start",
      "--port",
      String(serverPort),
      "--hostname",
      "127.0.0.1",
    ],
    {
      cwd: rootDir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => output.push(String(chunk)));
  child.stderr.on("data", (chunk) => output.push(String(chunk)));

  const baseUrl = `http://127.0.0.1:${serverPort}`;
  await waitForServer({ baseUrl, child, output });

  return {
    baseUrl,
    close: async () => {
      if (child.exitCode !== null) {
        return;
      }

      child.kill("SIGTERM");
      const exited = await Promise.race([
        new Promise((resolve) => child.once("exit", resolve)),
        new Promise((resolve) => setTimeout(() => resolve("timeout"), 3000)),
      ]);
      if (exited === "timeout" && child.exitCode === null) {
        child.kill("SIGKILL");
        await new Promise((resolve) => child.once("exit", resolve));
      }
    },
    output,
    port: serverPort,
  };
}

async function assertVisibleTexts(page, target) {
  for (const text of target.requiredTexts) {
    await page.getByText(text, { exact: false }).first().waitFor({
      state: "visible",
      timeout: 10_000,
    });
  }
}

async function capture(page, outputDir, target) {
  await assertVisibleTexts(page, target);
  const outputPath = join(outputDir, target.fileName);
  await page.screenshot({ fullPage: false, path: outputPath });
  return {
    outputPath,
    ...(await assertRuntimeScreenshot({
      filePath: outputPath,
      name: target.name,
    })),
  };
}

async function loginAdmin(page, baseUrl) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("蔬菜图片墙").waitFor({ state: "visible" });
  await page.getByPlaceholder("请输入后台账号").fill(DEFAULT_ADMIN_USERNAME);
  await page.getByPlaceholder("请输入密码").fill(DEFAULT_ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 }),
    page.getByRole("button", { name: "登录" }).click(),
  ]);
  await page.waitForLoadState("networkidle");
}

async function openOrderModal(page, baseUrl) {
  await page.goto(`${baseUrl}/?section=orders`, { waitUntil: "networkidle" });
  const detailButtons = page.locator('button[title="查看详情"]');
  if ((await detailButtons.count()) > 0) {
    await detailButtons.first().click();
  } else {
    await page.getByRole("button", { name: "新建订单" }).click();
  }

  await page.locator('[role="dialog"]').waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.locator('button[title="全屏"]').first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.locator('button[title="关闭"]').first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.getByText("基础信息", { exact: false }).first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
}

async function openSection(page, baseUrl, target) {
  await page.goto(`${baseUrl}/?section=${target.section}`, {
    waitUntil: "networkidle",
  });
  await assertVisibleTexts(page, target);
}

function sectionTargetBySection(section) {
  return ADMIN_RUNTIME_SECTION_TARGETS.find((target) => target.section === section);
}

async function openModalTarget(page, baseUrl, target) {
  const sectionTarget = sectionTargetBySection(target.section);
  if (sectionTarget) {
    await openSection(page, baseUrl, sectionTarget);
  } else {
    await page.goto(`${baseUrl}/?section=${target.section}`, {
      waitUntil: "networkidle",
    });
  }

  if (target.triggerTitle) {
    const trigger = page.locator(`button[title="${target.triggerTitle}"]`);
    if ((await trigger.count()) === 0) {
      throw new Error(
        `ADMIN_RUNTIME_VISUAL_TRIGGER_MISSING: ${target.name} ${target.triggerTitle}`,
      );
    }
    await trigger.first().click();
  } else if (target.triggerText) {
    await page.getByRole("button", { name: target.triggerText }).click();
  } else {
    throw new Error(`ADMIN_RUNTIME_VISUAL_TRIGGER_UNCONFIGURED: ${target.name}`);
  }

  await page.locator('[role="dialog"]').waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.locator('button[title="全屏"]').first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.locator('button[title="关闭"]').first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await assertVisibleTexts(page, target);
}

async function captureCollapsedSidebar(page, baseUrl, outputDir) {
  const target = targetByName("sidebar-collapsed");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await assertVisibleTexts(page, target);

  await page.getByRole("button", { name: "折叠侧边栏" }).click();
  const aside = page.locator("aside").first();
  await page.waitForFunction(() => {
    const element = document.querySelector("aside");
    return element ? Math.abs(element.getBoundingClientRect().width - 72) <= 2 : false;
  });

  const sidebarBox = await aside.boundingBox();
  const contentPaddingLeft = await page
    .locator("aside + div")
    .first()
    .evaluate((element) => Number.parseFloat(window.getComputedStyle(element).paddingLeft));
  const hiddenLabelCount = await page
    .locator("aside")
    .getByText("订单管理", { exact: true })
    .count();
  const layout = assertAdminCollapsedSidebarLayout({
    contentPaddingLeft,
    hiddenLabelCount,
    sidebarBox,
  });

  const screenshot = await capture(page, outputDir, target);

  await page.getByRole("button", { name: "展开侧边栏" }).click();
  await page.waitForFunction(() => {
    const element = document.querySelector("aside");
    return element ? Math.abs(element.getBoundingClientRect().width - 220) <= 2 : false;
  });

  return { layout, screenshot };
}

async function captureCollapsedSystemMenu(page, baseUrl, outputDir) {
  const target = targetByName("system-menu-collapsed");
  await page.goto(`${baseUrl}/?section=${target.section}`, {
    waitUntil: "networkidle",
  });
  await assertVisibleTexts(page, target);

  if (
    (await page
      .getByRole("button", { name: "收起系统管理菜单" })
      .count()) === 0
  ) {
    await page.getByRole("button", { name: "展开系统管理菜单" }).click();
    await page.locator('aside a[title="后台用户"]').waitFor({
      state: "visible",
      timeout: 10_000,
    });
  }

  await page.getByRole("button", { name: "收起系统管理菜单" }).click();
  await page.locator('aside a[title="后台用户"]').waitFor({
    state: "hidden",
    timeout: 10_000,
  });

  const visibleGroupCount = await page
    .locator("aside")
    .getByRole("button", { name: "展开系统管理菜单" })
    .count();
  const hiddenChildCount = await page.locator('aside a[title="后台用户"]').count();
  const layout = assertAdminGroupCollapsedLayout({
    hiddenChildCount,
    visibleGroupCount,
  });
  const screenshot = await capture(page, outputDir, target);

  await page.getByRole("button", { name: "展开系统管理菜单" }).click();
  await page.locator('aside a[title="后台用户"]').waitFor({
    state: "visible",
    timeout: 10_000,
  });

  return { layout, screenshot };
}

async function exerciseModalControls(page) {
  const dialog = page.locator('[role="dialog"]').first();
  const defaultBox = await dialog.boundingBox();
  if (!defaultBox) {
    throw new Error("ADMIN_RUNTIME_MODAL_BOX_MISSING");
  }

  const resize = await dialog.evaluate((element) =>
    window.getComputedStyle(element).resize,
  );
  const resizeCheck = assertAdminResizableStyle(resize);

  await page.locator('button[title="全屏"]').first().click();
  await page.locator('button[title="退出全屏"]').first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
  const fullscreenBox = await dialog.boundingBox();
  assertAdminFullscreenBox({ box: fullscreenBox });

  await page.locator('button[title="退出全屏"]').first().click();
  await page.locator('button[title="全屏"]').first().waitFor({
    state: "visible",
    timeout: 10_000,
  });

  const restoredBox = await dialog.boundingBox();
  if (!restoredBox) {
    throw new Error("ADMIN_RUNTIME_MODAL_RESTORED_BOX_MISSING");
  }
  const header = page.locator('[role="dialog"] .cursor-move').first();
  const headerBox = await header.boundingBox();
  if (!headerBox) {
    throw new Error("ADMIN_RUNTIME_MODAL_DRAG_HEADER_MISSING");
  }

  await page.mouse.move(headerBox.x + 80, headerBox.y + headerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    headerBox.x + 160,
    headerBox.y + headerBox.height / 2 + 48,
    { steps: 8 },
  );
  await page.mouse.up();

  const draggedBox = await dialog.boundingBox();
  const dragCheck = assertAdminDraggedBox({
    after: draggedBox,
    before: restoredBox,
  });

  return {
    defaultBox,
    drag: dragCheck,
    draggedBox,
    fullscreenBox,
    resize: resizeCheck.resize,
  };
}

async function closeModalTarget(page) {
  const dialog = page.locator('[role="dialog"]').first();
  if ((await dialog.count()) === 0) {
    return;
  }

  await page.locator('button[title="关闭"]').first().click();
  await dialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
}

function targetByName(name) {
  const target = ADMIN_RUNTIME_VISUAL_TARGETS.find((item) => item.name === name);
  if (!target) {
    throw new Error(`ADMIN_RUNTIME_VISUAL_TARGET_MISSING: ${name}`);
  }

  return target;
}

export async function runAdminRuntimeVisualSmoke({
  outputDir = process.env.ADMIN_RUNTIME_SCREENSHOT_DIR ?? DEFAULT_OUTPUT_DIR,
  rootDir = ROOT_DIR,
} = {}) {
  await loadEnvFile(join(rootDir, ".env"));
  await mkdir(outputDir, { recursive: true });

  const server = await startManagedAdminServer({ rootDir });
  const browser = await chromium.launch({
    executablePath: detectChromeExecutable(),
    headless: true,
  });
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: ADMIN_VIEWPORT,
  });

  const result = {
    baseUrl: server.baseUrl,
    interactions: {},
    outputDir,
    screenshots: {},
  };

  try {
    await page.goto(`${server.baseUrl}/login`, { waitUntil: "networkidle" });
    result.screenshots.login = await capture(page, outputDir, targetByName("login"));

    await loginAdmin(page, server.baseUrl);
    result.screenshots.shell = await capture(page, outputDir, targetByName("shell"));

    const collapsedSidebar = await captureCollapsedSidebar(
      page,
      server.baseUrl,
      outputDir,
    );
    result.screenshots.sidebarCollapsed = collapsedSidebar.screenshot;
    result.interactions.sidebarCollapse = collapsedSidebar.layout;

    const collapsedSystemMenu = await captureCollapsedSystemMenu(
      page,
      server.baseUrl,
      outputDir,
    );
    result.screenshots.systemMenuCollapsed = collapsedSystemMenu.screenshot;
    result.interactions.systemMenuCollapse = collapsedSystemMenu.layout;

    await page.getByRole("button", { name: /管理员|Admin/i }).click();
    result.screenshots.userMenu = await capture(
      page,
      outputDir,
      targetByName("user-menu"),
    );

    for (const target of ADMIN_RUNTIME_SECTION_TARGETS) {
      await openSection(page, server.baseUrl, target);
      result.screenshots[target.name] = await capture(page, outputDir, target);
    }

    for (const target of ADMIN_RUNTIME_MODAL_TARGETS) {
      if (target.name === "order-modal") {
        await openOrderModal(page, server.baseUrl);
      } else {
        await openModalTarget(page, server.baseUrl, target);
      }
      result.screenshots[target.name] = await capture(page, outputDir, target);
      if (target.name === "order-modal") {
        result.interactions.orderModalControls = await exerciseModalControls(page);
      }
      await closeModalTarget(page);
    }
  } finally {
    await browser.close().catch(() => undefined);
    await server.close();
  }

  return result;
}

function printResult(result) {
  console.log(
    JSON.stringify(
      {
        baseUrl: result.baseUrl,
        outputDir: result.outputDir,
        interactions: result.interactions,
        screenshots: Object.fromEntries(
          Object.entries(result.screenshots).map(([name, screenshot]) => [
            name,
            {
              bytes: screenshot.bytes,
              dimensions: screenshot.dimensions,
              outputPath: screenshot.outputPath,
            },
          ]),
        ),
      },
      null,
      2,
    ),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAdminRuntimeVisualSmoke()
    .then(printResult)
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
