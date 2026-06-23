import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, "..");
const DEFAULT_CLI_PATH =
  "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";
const DEFAULT_PROJECT_PATH = join(ROOT_DIR, "apps/miniapp");
const DEFAULT_OUTPUT_DIR = join(ROOT_DIR, "tmp/miniapp-runtime-visual");
const DEFAULT_API_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_STORE_CODE = "lotus-garden";
const DEFAULT_OPENID = "mock-openid-lotus-001";
const DEFAULT_NO_PACKAGE_OPENID = "mock-openid-lotus-no-package";
const DEFAULT_MINI_SESSION_SECRET =
  "dev-hentor-mini-session-secret-change-before-production";
const ACTIVE_STORE_CODE_KEY = "active_store_code";
const EDITING_ORDER_ID_KEY = "editing_order_id";
const SESSION_TOKEN_KEY = "mini_session_token";
const VIEWPORT_WIDTH = 390;
const VIEWPORT_HEIGHT = 844;
const MIN_RUNTIME_LOGICAL_HEIGHT = 740;

export const RUNTIME_VISUAL_TARGETS = [
  {
    fileName: "login.png",
    figmaPath: "docs/prototypes/figma-screenshots/08-miniapp-login.png",
    name: "login",
    route: "/pages/login/index",
    selectors: [
      ".login__custom-top",
      ".login__mark",
      ".login__mark-image",
      ".login__button",
      ".login__agreement",
    ],
    session: false,
  },
  {
    fileName: "home.png",
    figmaPath:
      "docs/prototypes/figma-screenshots/03-miniapp-home-with-package.png",
    name: "home",
    route: "/pages/home/index",
    selectors: [
      ".home__custom-top",
      ".package-card",
      ".dish-card",
      ".dish-grid",
      ".summary",
    ],
    session: true,
  },
  {
    action: "openSubmitConfirm",
    fileName: "submit-confirm.png",
    figmaPath: "docs/prototypes/figma-screenshots/04-miniapp-submit-confirm.png",
    name: "submitConfirm",
    route: "/pages/home/index",
    selectors: [
      ".reservation-confirm",
      ".reservation-confirm__title",
      ".confirm-summary",
      ".confirm-changes",
      ".confirm-address",
      ".confirm-primary",
      ".confirm-secondary",
    ],
    session: true,
  },
  {
    fileName: "home-no-package.png",
    figmaPath:
      "docs/prototypes/figma-screenshots/13-miniapp-home-no-package.png",
    name: "homeNoPackage",
    route: "/pages/home/index",
    selectors: [
      ".home__custom-top",
      ".package-card",
      ".package-card--empty",
      ".dish-card",
      ".dish-grid",
      ".summary",
    ],
    session: true,
    sessionKind: "noPackage",
  },
  {
    editingOrder: true,
    fileName: "edit-reservation.png",
    figmaPath:
      "docs/prototypes/figma-screenshots/12-miniapp-edit-reservation.png",
    name: "editReservation",
    route: "/pages/home/index",
    selectors: [
      ".home__custom-top",
      ".package-card",
      ".package-card__edit",
      ".dish-card",
      ".dish-grid",
      ".summary",
    ],
    session: true,
  },
  {
    fileName: "orders.png",
    figmaPath: "docs/prototypes/figma-screenshots/05-miniapp-orders.png",
    name: "orders",
    route: "/pages/orders/index",
    selectors: [".orders__custom-top", ".order-tabs", ".order"],
    session: true,
  },
  {
    fileName: "addresses.png",
    figmaPath: "docs/prototypes/figma-screenshots/07-miniapp-addresses.png",
    name: "addresses",
    route: "/pages/addresses/index",
    selectors: [".addresses__custom-top", ".header", ".address-card"],
    session: true,
  },
  {
    fileName: "packages.png",
    figmaPath: "docs/prototypes/figma-screenshots/11-miniapp-packages.png",
    name: "packages",
    route: "/pages/packages/index",
    selectors: [
      ".packages__custom-top",
      ".hero-card",
      ".benefit-grid",
      ".payment-reserve",
    ],
    session: true,
  },
  {
    fileName: "me.png",
    figmaPath: "docs/prototypes/figma-screenshots/06-miniapp-me.png",
    name: "me",
    route: "/pages/me/index",
    selectors: [
      ".profile-hero__top",
      ".profile-hero",
      ".member-card",
      ".today-card",
      ".service-card",
      ".service-grid",
      ".recent-card",
    ],
    session: true,
  },
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

export async function loadRootEnv(rootDir = ROOT_DIR, env = process.env) {
  await loadEnvFile(join(rootDir, ".env"), env);
}

export function getMiniSessionSecret(env = process.env) {
  return (
    env.MINI_SESSION_SECRET ??
    env.ADMIN_SESSION_SECRET ??
    DEFAULT_MINI_SESSION_SECRET
  );
}

export function createMiniSessionToken(session, secret) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function readPngDimensionsFromBuffer(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error("PNG_DIMENSION_ERROR: file is not a PNG");
  }

  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

export async function readPngDimensions(filePath) {
  return readPngDimensionsFromBuffer(await readFile(filePath));
}

export function assertRuntimeScreenshotContract({
  figmaDimensions,
  maxFigmaWidthOverflowPx = 80,
  name,
  runtimeDimensions,
}) {
  const scaleX = runtimeDimensions.width / VIEWPORT_WIDTH;
  const logicalHeight = runtimeDimensions.height / scaleX;

  if (scaleX < 1 || scaleX > 4) {
    throw new Error(
      `MINIAPP_RUNTIME_VISUAL_MISMATCH: ${name} screenshot scale ${scaleX.toFixed(2)} is outside expected simulator range`,
    );
  }

  if (
    logicalHeight < MIN_RUNTIME_LOGICAL_HEIGHT ||
    logicalHeight > VIEWPORT_HEIGHT
  ) {
    throw new Error(
      `MINIAPP_RUNTIME_VISUAL_MISMATCH: ${name} logical height ${logicalHeight.toFixed(1)}px is outside expected simulator range`,
    );
  }

  if (figmaDimensions.height !== VIEWPORT_HEIGHT) {
    throw new Error(
      `MINIAPP_RUNTIME_VISUAL_MISMATCH: ${name} figma height ${figmaDimensions.height}px should be ${VIEWPORT_HEIGHT}px`,
    );
  }

  if (
    figmaDimensions.width < VIEWPORT_WIDTH ||
    figmaDimensions.width > VIEWPORT_WIDTH + maxFigmaWidthOverflowPx
  ) {
    throw new Error(
      `MINIAPP_RUNTIME_VISUAL_MISMATCH: ${name} figma width ${figmaDimensions.width}px is outside expected prototype bounds`,
    );
  }

  return {
    logicalHeight,
    logicalWidth: runtimeDimensions.width / scaleX,
    scale: scaleX,
  };
}

async function importPgClient(rootDir) {
  const dbRequire = createRequire(join(rootDir, "packages/db/package.json"));
  return dbRequire("pg").Client;
}

export async function loadSeedMiniSession({
  openid = DEFAULT_OPENID,
  rootDir = ROOT_DIR,
  storeCode = DEFAULT_STORE_CODE,
} = {}) {
  await loadRootEnv(rootDir);

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "MINIAPP_RUNTIME_VISUAL_DB_REQUIRED: DATABASE_URL is missing; run pnpm setup:dev or configure .env",
    );
  }

  const Client = await importPgClient(rootDir);
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    const result = await client.query(
      `
        select
          u.id as "userId",
          u.openid as openid,
          s.id as "storeId",
          s.code as "storeCode"
        from "User" u
        inner join "Store" s on s.code = $2
        where u.openid = $1
        limit 1
      `,
      [openid, storeCode],
    );

    const row = result.rows[0];
    if (!row?.userId || !row?.storeId) {
      throw new Error(
        `MINIAPP_RUNTIME_VISUAL_SEED_REQUIRED: missing seed user ${openid} or store ${storeCode}; run pnpm db:seed`,
      );
    }

    return {
      issuedAt: Date.now(),
      openid: row.openid,
      storeCode: row.storeCode,
      storeId: row.storeId,
      userId: row.userId,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function ensureNoPackageMiniSession({
  openid = DEFAULT_NO_PACKAGE_OPENID,
  rootDir = ROOT_DIR,
  storeCode = DEFAULT_STORE_CODE,
} = {}) {
  await loadRootEnv(rootDir);

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "MINIAPP_RUNTIME_VISUAL_DB_REQUIRED: DATABASE_URL is missing; run pnpm setup:dev or configure .env",
    );
  }

  const Client = await importPgClient(rootDir);
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    await client.query("begin");

    const storeResult = await client.query(
      `select id, code from "Store" where code = $1 and status = 'ACTIVE' limit 1`,
      [storeCode],
    );
    const store = storeResult.rows[0];
    if (!store?.id) {
      throw new Error(
        `MINIAPP_RUNTIME_VISUAL_SEED_REQUIRED: missing store ${storeCode}; run pnpm db:seed`,
      );
    }

    const userResult = await client.query(
      `
        insert into "User" (
          id,
          openid,
          phone,
          nickname,
          status,
          "disabledReason",
          "defaultStoreId",
          "createdAt",
          "updatedAt"
        )
        values (
          'runtime-visual-no-package-user',
          $1,
          '13900009991',
          '无套餐会员',
          'ACTIVE',
          null,
          $2,
          now(),
          now()
        )
        on conflict (openid) do update set
          phone = excluded.phone,
          nickname = excluded.nickname,
          status = 'ACTIVE',
          "disabledReason" = null,
          "defaultStoreId" = excluded."defaultStoreId",
          "updatedAt" = now()
        returning id, openid
      `,
      [openid, store.id],
    );
    const user = userResult.rows[0];
    if (!user?.id) {
      throw new Error("MINIAPP_RUNTIME_VISUAL_NO_PACKAGE_USER_FAILED");
    }

    await client.query(
      `delete from "UserPackage" where "userId" = $1 and "storeId" = $2`,
      [user.id, store.id],
    );

    await client.query(
      `
        insert into "MemberStoreBinding" (
          id,
          "userId",
          "storeId",
          status,
          source,
          "isDefault",
          "createdAt",
          "updatedAt"
        )
        values (
          'runtime-visual-no-package-binding',
          $1,
          $2,
          'ACTIVE',
          'runtime-visual-smoke',
          true,
          now(),
          now()
        )
        on conflict ("userId", "storeId") do update set
          status = 'ACTIVE',
          source = 'runtime-visual-smoke',
          "isDefault" = true,
          "updatedAt" = now()
      `,
      [user.id, store.id],
    );

    await client.query("commit");

    return {
      issuedAt: Date.now(),
      openid: user.openid,
      storeCode: store.code,
      storeId: store.id,
      userId: user.id,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function loadSeedEditableOrder({
  openid = DEFAULT_OPENID,
  rootDir = ROOT_DIR,
  storeCode = DEFAULT_STORE_CODE,
} = {}) {
  await loadRootEnv(rootDir);

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "MINIAPP_RUNTIME_VISUAL_DB_REQUIRED: DATABASE_URL is missing; run pnpm setup:dev or configure .env",
    );
  }

  const Client = await importPgClient(rootDir);
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    const result = await client.query(
      `
        select
          o.id,
          o."orderNo"
        from "Order" o
        inner join "User" u on u.id = o."userId"
        inner join "Store" s on s.id = o."storeId"
        where
          u.openid = $1
          and s.code = $2
          and o.status = 'PENDING_SHIPMENT'
          and o."deletedByUserAt" is null
        order by o."createdAt" desc
        limit 1
      `,
      [openid, storeCode],
    );

    const row = result.rows[0];
    if (!row?.id) {
      throw new Error(
        `MINIAPP_RUNTIME_VISUAL_EDIT_ORDER_REQUIRED: missing editable order for ${openid} in ${storeCode}; run pnpm db:seed`,
      );
    }

    return {
      id: row.id,
      orderNo: row.orderNo,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function assertApiReachable({
  apiBaseUrl = DEFAULT_API_BASE_URL,
  storeCode = DEFAULT_STORE_CODE,
} = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(
      `${apiBaseUrl}/api/v1/stores/settings?storeCode=${encodeURIComponent(storeCode)}`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      throw new Error(
        `local API returned HTTP ${response.status} for store settings`,
      );
    }

    const payload = await response.json();
    if (!payload?.success) {
      throw new Error("local API returned an unsuccessful store settings body");
    }
  } catch (error) {
    throw new Error(
      `MINIAPP_RUNTIME_VISUAL_API_REQUIRED: start the admin API at ${apiBaseUrl} before running this smoke test (${error instanceof Error ? error.message : String(error)})`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function installAutomatorCompatibilityPatch() {
  const miniProgramModule = require("miniprogram-automator/out/MiniProgram");
  const MiniProgram = miniProgramModule.default ?? miniProgramModule;

  if (!MiniProgram?.prototype || MiniProgram.prototype.__hentorCompatPatch) {
    return;
  }

  Object.defineProperty(MiniProgram.prototype, "__hentorCompatPatch", {
    value: true,
  });

  MiniProgram.prototype.checkVersion = async function patchedCheckVersion() {
    try {
      this.__hentorToolInfo = await this.send("Tool.getInfo");
    } catch (error) {
      this.__hentorToolInfo = {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
}

async function waitForSelectors(page, selectors, targetName) {
  for (const selector of selectors) {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(
        `MINIAPP_RUNTIME_VISUAL_SELECTOR_MISSING: ${targetName} is missing ${selector}`,
      );
    }
  }
}

function boxBottom(box) {
  return box.top + box.height;
}

function boxRight(box) {
  return box.left + box.width;
}

function assertWithin(value, { label, max, min }) {
  if (value < min || value > max) {
    throw new Error(
      `MINIAPP_RUNTIME_LAYOUT_MISMATCH: ${label} expected ${min}-${max}, got ${value}`,
    );
  }
}

function assertAbove(upperBox, lowerBox, label) {
  if (upperBox.top >= lowerBox.top) {
    throw new Error(
      `MINIAPP_RUNTIME_LAYOUT_MISMATCH: ${label} expected ${upperBox.selector} above ${lowerBox.selector}`,
    );
  }
}

function assertInside(innerBox, outerBox, label) {
  if (
    innerBox.left < outerBox.left ||
    innerBox.top < outerBox.top ||
    boxRight(innerBox) > boxRight(outerBox) ||
    boxBottom(innerBox) > boxBottom(outerBox)
  ) {
    throw new Error(
      `MINIAPP_RUNTIME_LAYOUT_MISMATCH: ${label} expected ${innerBox.selector} inside ${outerBox.selector}`,
    );
  }
}

function requireBox(boxes, selector, targetName) {
  const box = boxes[selector];
  if (!box) {
    throw new Error(
      `MINIAPP_RUNTIME_LAYOUT_MISSING: ${targetName} missing ${selector}`,
    );
  }
  return box;
}

export function assertRuntimeLayoutContract({ boxes, name }) {
  const customTopSelector = {
    addresses: ".addresses__custom-top",
    home: ".home__custom-top",
    homeNoPackage: ".home__custom-top",
    editReservation: ".home__custom-top",
    login: ".login__custom-top",
    me: ".profile-hero__top",
    orders: ".orders__custom-top",
    packages: ".packages__custom-top",
  }[name];

  if (customTopSelector) {
    const customTop = requireBox(boxes, customTopSelector, name);
    assertWithin(customTop.top, {
      label: `${name} custom top y`,
      max: 2,
      min: 0,
    });
    assertWithin(customTop.width, {
      label: `${name} custom top width`,
      max: 392,
      min: 388,
    });
    assertWithin(customTop.height, {
      label: `${name} custom top height`,
      max: 120,
      min: 72,
    });
  }

  if (["home", "homeNoPackage", "editReservation"].includes(name)) {
    const packageCard = requireBox(boxes, ".package-card", name);
    const dishGrid = requireBox(boxes, ".dish-grid", name);
    const dishCard = requireBox(boxes, ".dish-card", name);
    const summary = requireBox(boxes, ".summary", name);

    assertAbove(packageCard, dishGrid, `${name} page order`);
    assertAbove(packageCard, summary, `${name} package before summary`);
    assertWithin(packageCard.left, {
      label: `${name} package card left`,
      max: 24,
      min: 16,
    });
    assertWithin(packageCard.width, {
      label: `${name} package card width`,
      max: 358,
      min: 342,
    });
    assertWithin(dishCard.width, {
      label: `${name} dish card width`,
      max: 124,
      min: 100,
    });
    assertWithin(dishCard.height, {
      label: `${name} dish card height`,
      max: 150,
      min: 124,
    });
    assertWithin(summary.left, {
      label: `${name} summary left`,
      max: 20,
      min: 12,
    });
    assertWithin(summary.width, {
      label: `${name} summary width`,
      max: 366,
      min: 350,
    });
    assertWithin(summary.top, {
      label: `${name} summary y`,
      max: 704,
      min: 590,
    });

    const summaryAddress = boxes[".summary__address"];
    if (summaryAddress) {
      assertInside(summaryAddress, summary, `${name} summary address`);
    }
  }

  if (name === "login") {
    const mark = requireBox(boxes, ".login__mark", name);
    const button = requireBox(boxes, ".login__button", name);
    const agreement = requireBox(boxes, ".login__agreement", name);

    assertWithin(mark.width, {
      label: "login mark width",
      max: 172,
      min: 128,
    });
    assertWithin(mark.top, {
      label: "login mark y",
      max: 220,
      min: 130,
    });
    assertWithin(button.top, {
      label: "login button y",
      max: 724,
      min: 620,
    });
    assertWithin(button.height, {
      label: "login button height",
      max: 72,
      min: 54,
    });
    assertAbove(button, agreement, "login action before agreement");
  }

  if (name === "me") {
    const hero = requireBox(boxes, ".profile-hero", name);
    const memberCard = requireBox(boxes, ".member-card", name);
    const todayCard = requireBox(boxes, ".today-card", name);
    const serviceCard = requireBox(boxes, ".service-card", name);
    const serviceGrid = requireBox(boxes, ".service-grid", name);
    const recentCard = requireBox(boxes, ".recent-card", name);

    assertWithin(hero.top, {
      label: "me hero y",
      max: 2,
      min: 0,
    });
    assertWithin(hero.height, {
      label: "me hero height",
      max: 320,
      min: 260,
    });
    assertAbove(memberCard, todayCard, "me card order");
    assertAbove(todayCard, serviceCard, "me service order");
    assertAbove(serviceCard, recentCard, "me recent order");
    assertInside(serviceGrid, serviceCard, "me service grid");
  }

  if (name === "orders") {
    const tabs = requireBox(boxes, ".order-tabs", name);
    const order = requireBox(boxes, ".order", name);
    assertAbove(tabs, order, "orders tabs before cards");
  }

  if (name === "submitConfirm") {
    const overlay = requireBox(boxes, ".reservation-confirm", name);
    const title = requireBox(boxes, ".reservation-confirm__title", name);
    const summary = requireBox(boxes, ".confirm-summary", name);
    const changes = requireBox(boxes, ".confirm-changes", name);
    const address = requireBox(boxes, ".confirm-address", name);
    const primary = requireBox(boxes, ".confirm-primary", name);
    const secondary = requireBox(boxes, ".confirm-secondary", name);

    assertWithin(overlay.top, {
      label: "submit confirm overlay y",
      max: 2,
      min: 0,
    });
    assertWithin(overlay.width, {
      label: "submit confirm overlay width",
      max: 392,
      min: 388,
    });
    assertInside(title, overlay, "submit confirm title");
    assertAbove(title, summary, "submit confirm summary order");
    assertAbove(summary, changes, "submit confirm changes order");
    assertAbove(changes, address, "submit confirm address order");
    assertAbove(address, primary, "submit confirm primary order");
    assertAbove(primary, secondary, "submit confirm secondary order");
  }

  if (name === "addresses") {
    const header = requireBox(boxes, ".header", name);
    const card = requireBox(boxes, ".address-card", name);
    assertAbove(header, card, "addresses header before cards");
  }

  if (name === "packages") {
    const hero = requireBox(boxes, ".hero-card", name);
    const benefits = requireBox(boxes, ".benefit-grid", name);
    const reserve = requireBox(boxes, ".payment-reserve", name);
    assertAbove(hero, benefits, "packages hero before benefits");
    assertAbove(benefits, reserve, "packages benefits before payment reserve");
  }

  return { checked: true, name };
}

async function collectLayoutBoxes(page, selectors, targetName) {
  const boxes = {};
  for (const selector of [...new Set(selectors)]) {
    const element = await page.$(selector);
    if (!element) {
      continue;
    }
    const [offset, size] = await Promise.all([element.offset(), element.size()]);
    boxes[selector] = {
      height: Math.round(size.height * 100) / 100,
      left: Math.round(offset.left * 100) / 100,
      selector,
      top: Math.round(offset.top * 100) / 100,
      width: Math.round(size.width * 100) / 100,
    };
  }
  assertRuntimeLayoutContract({ boxes, name: targetName });
  return boxes;
}

async function openSubmitConfirm(currentPage) {
  const stepButtons = await currentPage.$$(".dish-card .step-btn");
  let plusButton = null;
  for (const button of stepButtons) {
    const className = (await button.attribute("class")) ?? "";
    if (
      className.includes("step-btn") &&
      !className.includes("step-btn--minus") &&
      !className.includes("step-btn--disabled")
    ) {
      plusButton = button;
      break;
    }
  }
  if (!plusButton) {
    throw new Error("MINIAPP_RUNTIME_VISUAL_SUBMIT_CONFIRM_PLUS_MISSING");
  }

  await plusButton.tap();
  await currentPage.waitFor(300);

  const submitButton = await currentPage.$(".summary__submit");
  if (!submitButton) {
    throw new Error("MINIAPP_RUNTIME_VISUAL_SUBMIT_CONFIRM_BUTTON_MISSING");
  }
  const submitClassName = (await submitButton.attribute("class")) ?? "";
  if (submitClassName.includes("summary__submit--disabled")) {
    throw new Error("MINIAPP_RUNTIME_VISUAL_SUBMIT_CONFIRM_BUTTON_DISABLED");
  }

  await submitButton.tap();
  await currentPage.waitFor(500);
}

async function performTargetAction(currentPage, target) {
  if (target.action === "openSubmitConfirm") {
    await openSubmitConfirm(currentPage);
  }
}

async function captureTarget({
  editableOrder,
  miniProgram,
  outputDir,
  rootDir,
  target,
  tokens,
}) {
  if (target.session) {
    const token =
      target.sessionKind === "noPackage" ? tokens.noPackage : tokens.default;
    await miniProgram.callWxMethod("setStorageSync", SESSION_TOKEN_KEY, token);
    if (target.editingOrder) {
      await miniProgram.callWxMethod(
        "setStorageSync",
        EDITING_ORDER_ID_KEY,
        editableOrder.id,
      );
    } else {
      await miniProgram.callWxMethod("removeStorageSync", EDITING_ORDER_ID_KEY);
    }
    await miniProgram.callWxMethod(
      "setStorageSync",
      ACTIVE_STORE_CODE_KEY,
      DEFAULT_STORE_CODE,
    );
  } else {
    await miniProgram.callWxMethod("removeStorageSync", SESSION_TOKEN_KEY);
    await miniProgram.callWxMethod("removeStorageSync", EDITING_ORDER_ID_KEY);
  }

  const page = await miniProgram.reLaunch(target.route);
  await page.waitFor(1800);

  const currentPage = await miniProgram.currentPage();
  if (!currentPage?.path || !target.route.endsWith(currentPage.path)) {
    throw new Error(
      `MINIAPP_RUNTIME_VISUAL_ROUTE_MISMATCH: expected ${target.route}, got ${currentPage?.path ?? "unknown"}`,
    );
  }

  await performTargetAction(currentPage, target);
  await waitForSelectors(currentPage, target.selectors, target.name);
  const layout = await collectLayoutBoxes(
    currentPage,
    target.selectors,
    target.name,
  );

  const outputPath = join(outputDir, target.fileName);
  await miniProgram.screenshot({ path: outputPath });

  const fileStat = await stat(outputPath);
  if (fileStat.size < 8 * 1024) {
    throw new Error(
      `MINIAPP_RUNTIME_VISUAL_SCREENSHOT_EMPTY: ${target.name} screenshot is too small (${fileStat.size} bytes)`,
    );
  }

  const runtimeDimensions = await readPngDimensions(outputPath);
  const figmaDimensions = await readPngDimensions(join(rootDir, target.figmaPath));
  const viewport = assertRuntimeScreenshotContract({
    figmaDimensions,
    name: target.name,
    runtimeDimensions,
  });

  return {
    figma: {
      dimensions: figmaDimensions,
      path: target.figmaPath,
    },
    layout,
    outputPath,
    route: currentPage.path,
    runtime: {
      dimensions: runtimeDimensions,
      viewport,
    },
    selectors: target.selectors,
  };
}

export async function runMiniappRuntimeVisualSmoke({
  apiBaseUrl = process.env.MINIAPP_RUNTIME_API_BASE_URL ??
    process.env.TARO_APP_API_BASE_URL ??
    DEFAULT_API_BASE_URL,
  cliPath = process.env.WECHAT_DEVTOOLS_CLI ?? DEFAULT_CLI_PATH,
  outputDir = process.env.MINIAPP_RUNTIME_SCREENSHOT_DIR ??
    DEFAULT_OUTPUT_DIR,
  projectPath = DEFAULT_PROJECT_PATH,
  rootDir = ROOT_DIR,
  targets = RUNTIME_VISUAL_TARGETS,
} = {}) {
  await loadRootEnv(rootDir);
  await assertApiReachable({ apiBaseUrl, storeCode: DEFAULT_STORE_CODE });

  const seedSession = await loadSeedMiniSession({
    rootDir,
    storeCode: DEFAULT_STORE_CODE,
  });
  const noPackageSession = await ensureNoPackageMiniSession({
    rootDir,
    storeCode: DEFAULT_STORE_CODE,
  });
  const editableOrder = await loadSeedEditableOrder({
    rootDir,
    storeCode: DEFAULT_STORE_CODE,
  });
  const secret = getMiniSessionSecret();
  const tokens = {
    default: createMiniSessionToken(seedSession, secret),
    noPackage: createMiniSessionToken(noPackageSession, secret),
  };

  installAutomatorCompatibilityPatch();
  const automator = require("miniprogram-automator");
  await mkdir(outputDir, { recursive: true });

  const miniProgram = await automator.launch({
    cliPath,
    projectPath,
    timeout: 60_000,
    trustProject: true,
  });

  const result = {
    apiBaseUrl,
    outputDir,
    projectPath,
    screenshots: {},
    seedSession: {
      openid: seedSession.openid,
      storeCode: seedSession.storeCode,
      storeId: seedSession.storeId,
      userId: seedSession.userId,
    },
    noPackageSession: {
      openid: noPackageSession.openid,
      storeCode: noPackageSession.storeCode,
      storeId: noPackageSession.storeId,
      userId: noPackageSession.userId,
    },
    editableOrder,
    toolInfo: miniProgram.__hentorToolInfo ?? null,
  };

  try {
    for (const target of targets) {
      result.screenshots[target.name] = await captureTarget({
        editableOrder,
        miniProgram,
        outputDir,
        rootDir,
        target,
        tokens,
      });
    }
  } finally {
    await miniProgram.close().catch(() => miniProgram.disconnect?.());
  }

  return result;
}

function printResult(result) {
  console.log(
    JSON.stringify(
      {
        apiBaseUrl: result.apiBaseUrl,
        outputDir: result.outputDir,
        screenshots: Object.fromEntries(
          Object.entries(result.screenshots).map(([name, screenshot]) => [
            name,
            {
              dimensions: screenshot.runtime.dimensions,
              layout: screenshot.layout,
              outputPath: screenshot.outputPath,
              route: screenshot.route,
              selectors: screenshot.selectors,
            },
          ]),
        ),
        editableOrder: result.editableOrder,
        noPackageSession: result.noPackageSession,
        seedSession: result.seedSession,
        toolInfo: result.toolInfo,
      },
      null,
      2,
    ),
  );
}

if (import.meta.url === pathToFileUrl(process.argv[1])) {
  runMiniappRuntimeVisualSmoke()
    .then(printResult)
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}

function pathToFileUrl(filePath) {
  if (!filePath) {
    return "";
  }

  return new URL(`file://${resolve(filePath)}`).href;
}
