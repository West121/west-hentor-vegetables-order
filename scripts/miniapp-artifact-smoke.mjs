import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

export const REQUIRED_MINIAPP_PAGES = [
  "pages/home/index",
  "pages/me/index",
  "pages/addresses/index",
  "pages/orders/index",
  "pages/order-edit/index",
  "pages/packages/index",
  "pages/login/index",
  "pages/webview/index",
];

const EXPECTED_APP_ID = "wx165126960d67638f";
const MIN_FIGMA_SCREENSHOT_BYTES = 1024;
const MIN_WXSS_BYTES = 256;
const MIN_HOME_CARD_CONTENT_FREE_SPACE_PX = 8;
const MAX_HOME_SUMMARY_BOTTOM_PX = 12;
const FIGMA_HOME_HORIZONTAL_PADDING_PX = 20;
const FIGMA_HOME_PACKAGE_CARD_MIN_HEIGHT_PX = 126;
const FIGMA_HOME_SUMMARY_SIDE_OFFSET_PX = 16;
const FIGMA_HOME_SUMMARY_SUBMIT_HEIGHT_PX = 42;
const FIGMA_HOME_SUMMARY_SUBMIT_MIN_WIDTH_PX = 118;
const FIGMA_HOME_THREE_COLUMN_CARD_HEIGHT_PX = 132;
const FIGMA_HOME_THREE_COLUMN_IMAGE_HEIGHT_PX = 42;
const FIGMA_HOME_THREE_COLUMN_IMAGE_WIDTH_PX = 60;
const FIGMA_ME_HERO_HEIGHT_PX = 286;
const FIGMA_ME_HERO_IMAGE_HEIGHT_PX = 72;
const FIGMA_ME_HERO_IMAGE_WIDTH_PX = 104;
const FIGMA_ME_HERO_INNER_PADDING_PX = 20;
const FIGMA_ME_HORIZONTAL_PADDING_PX = 16;
const FIGMA_ME_MEMBER_CARD_OVERLAP_PX = -92;
const FIGMA_ME_MEMBER_CARD_PADDING_PX = 18;
const FIGMA_ME_MEMBER_CARD_RADIUS_PX = 18;
const FIGMA_ME_PROGRESS_HEIGHT_PX = 5;
const FIGMA_ME_PROGRESS_WIDTH_PX = 210;
const FIGMA_ME_SERVICE_ITEM_HEIGHT_PX = 82;
const FIGMA_ME_SERVICE_ITEM_WIDTH_PX = 96;
const MAX_TAB_BAR_ICON_PX = 81;
const MIN_TAB_BAR_ICON_PX = 24;
const PAGE_WXSS_MIN_BYTES = new Map([
  ["pages/webview/index", 1],
]);
const OPTIONAL_PAGE_WXSS = new Set([
  "pages/home/index",
  "pages/order-edit/index",
]);

export const EXPECTED_MINIAPP_TAB_BAR_TABS = [
  {
    iconPath: "assets/tabbar/home-default.png",
    pagePath: "pages/home/index",
    selectedIconPath: "assets/tabbar/home-active.png",
    text: "首页",
  },
  {
    iconPath: "assets/tabbar/me-default.png",
    pagePath: "pages/me/index",
    selectedIconPath: "assets/tabbar/me-active.png",
    text: "我的",
  },
];

const EXPECTED_MINIAPP_PROTOTYPE_SCOPE_FRAMES = [
  "03 小程序 / 首页（预订）",
  "04 小程序 / 提交与修改确认",
  "05 小程序 / 订单",
  "06 小程序 / 我的",
  "07 小程序 / 地址管理",
  "08 小程序 / 登录",
  "11 小程序 / 套餐",
  "12 小程序 / 修改已预订内容",
  "13 小程序 / 首页（无套餐）",
];

const EXPECTED_MINIAPP_LINKED_FIGMA_FRAMES = [
  "03 小程序 / 首页（有套餐）",
  "04 小程序 / 提交与修改确认",
  "05 小程序 / 订单",
  "06 小程序 / 我的",
  "07 小程序 / 地址管理",
  "08 小程序 / 登录",
  "11 小程序 / 套餐",
  "12 小程序 / 修改已预订内容",
  "13 小程序 / 首页（无套餐）",
];

const EXPECTED_MINIAPP_LINKED_FIGMA_NODES = [
  {
    frameName: "03 小程序 / 首页（有套餐）",
    nodeId: "node-id=89-2",
  },
  {
    frameName: "04 小程序 / 提交与修改确认",
    nodeId: "node-id=36-2",
  },
  {
    frameName: "05 小程序 / 订单",
    nodeId: "node-id=3-443",
  },
  {
    frameName: "06 小程序 / 我的",
    nodeId: "node-id=36-3",
  },
  {
    frameName: "07 小程序 / 地址管理",
    nodeId: "node-id=144-2",
  },
  {
    frameName: "08 小程序 / 登录",
    nodeId: "node-id=15-42",
  },
  {
    frameName: "11 小程序 / 套餐",
    nodeId: "node-id=36-4",
  },
  {
    frameName: "12 小程序 / 修改已预订内容",
    nodeId: "node-id=36-5",
  },
  {
    frameName: "13 小程序 / 首页（无套餐）",
    nodeId: "node-id=100-2",
  },
];

const EXPECTED_MINIAPP_FIGMA_SCREENSHOTS = [
  {
    height: 844,
    path: "docs/prototypes/figma-screenshots/03-miniapp-home-with-package.png",
    width: 450,
  },
  {
    height: 844,
    path: "docs/prototypes/figma-screenshots/04-miniapp-submit-confirm.png",
    width: 390,
  },
  {
    height: 844,
    path: "docs/prototypes/figma-screenshots/05-miniapp-orders.png",
    width: 390,
  },
  {
    height: 844,
    path: "docs/prototypes/figma-screenshots/06-miniapp-me.png",
    width: 390,
  },
  {
    height: 844,
    path: "docs/prototypes/figma-screenshots/07-miniapp-addresses.png",
    width: 390,
  },
  {
    height: 844,
    path: "docs/prototypes/figma-screenshots/08-miniapp-login.png",
    width: 390,
  },
  {
    height: 844,
    path: "docs/prototypes/figma-screenshots/11-miniapp-packages.png",
    width: 390,
  },
  {
    height: 844,
    path: "docs/prototypes/figma-screenshots/12-miniapp-edit-reservation.png",
    width: 390,
  },
  {
    height: 844,
    path: "docs/prototypes/figma-screenshots/13-miniapp-home-no-package.png",
    width: 450,
  },
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function collectFileSizes(rootDir) {
  const files = new Map();

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      const fileStat = await stat(fullPath);
      files.set(relative(rootDir, fullPath), fileStat.size);
    }
  }

  await walk(rootDir);
  return files;
}

async function collectKnownFileSizes(rootDir, paths) {
  const files = new Map();
  for (const filePath of paths) {
    const fileStat = await stat(join(rootDir, filePath));
    files.set(filePath, fileStat.size);
  }

  return files;
}

async function readTextFileIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

function extractRuleBlockAfterSelector(scss, selector) {
  const selectorIndex = scss.indexOf(selector);
  if (selectorIndex < 0) {
    throw new Error(`MINIAPP_HOME_GRID_PROTOTYPE_MISMATCH: missing ${selector}`);
  }

  const openIndex = scss.indexOf("{", selectorIndex);
  const closeIndex = scss.indexOf("}", openIndex);
  if (openIndex < 0 || closeIndex < 0) {
    throw new Error(`MINIAPP_HOME_GRID_PROTOTYPE_MISMATCH: invalid ${selector}`);
  }

  return scss.slice(openIndex + 1, closeIndex);
}

function extractPxDeclaration(block, property) {
  const match = block.match(new RegExp(`${property}\\s*:\\s*(\\d+)px`));
  if (!match) {
    throw new Error(`MINIAPP_HOME_GRID_PROTOTYPE_MISMATCH: missing ${property}`);
  }

  return Number(match[1]);
}

function extractCssVariablePxDeclaration(block, property) {
  const match = block.match(new RegExp(`${property}\\s*:\\s*(\\d+)px`));
  if (!match) {
    throw new Error(`MINIAPP_HOME_GRID_PROTOTYPE_MISMATCH: missing ${property}`);
  }

  return Number(match[1]);
}

function extractOptionalPxDeclaration(block, property) {
  const match = block.match(new RegExp(`${property}\\s*:\\s*(\\d+)px`));
  return match ? Number(match[1]) : null;
}

function extractSignedPxDeclaration(block, property) {
  const match = block.match(new RegExp(`${property}\\s*:\\s*(-?\\d+)px`));
  if (!match) {
    throw new Error(`MINIAPP_HOME_GRID_PROTOTYPE_MISMATCH: missing ${property}`);
  }

  return Number(match[1]);
}

function readPngDimensions(buffer) {
  if (
    buffer.length < 24 ||
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47
  ) {
    throw new Error("MINIAPP_DIST_TAB_ICON_INVALID: not a PNG");
  }

  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

async function collectPngDimensions(rootDir, paths) {
  const dimensions = new Map();
  for (const iconPath of paths) {
    dimensions.set(
      iconPath,
      readPngDimensions(await readFile(join(rootDir, iconPath))),
    );
  }

  return dimensions;
}

function extractVerticalPadding(block) {
  const match = block.match(/padding\s*:\s*([^;]+);/);
  if (!match) {
    throw new Error("MINIAPP_HOME_GRID_PROTOTYPE_MISMATCH: missing padding");
  }

  const values = match[1]
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (token === "0") {
        return 0;
      }
      const px = token.match(/^(\d+)px$/);
      return px ? Number(px[1]) : Number.NaN;
    })
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) {
    throw new Error("MINIAPP_HOME_GRID_PROTOTYPE_MISMATCH: invalid padding");
  }

  if (values.length === 1) {
    return { bottom: values[0], top: values[0] };
  }

  if (values.length === 2) {
    return { bottom: values[0], top: values[0] };
  }

  return { bottom: values[2], top: values[0] };
}

function extractPaddingValues(block) {
  const match = block.match(/padding\s*:\s*([^;]+);/);
  if (!match) {
    throw new Error("MINIAPP_HOME_GRID_PROTOTYPE_MISMATCH: missing padding");
  }

  const values = match[1]
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (token === "0") {
        return 0;
      }
      const px = token.match(/^(\d+)px$/);
      return px ? Number(px[1]) : Number.NaN;
    })
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) {
    throw new Error("MINIAPP_HOME_GRID_PROTOTYPE_MISMATCH: invalid padding");
  }

  if (values.length === 1) {
    return {
      bottom: values[0],
      left: values[0],
      right: values[0],
      top: values[0],
    };
  }
  if (values.length === 2) {
    return {
      bottom: values[0],
      left: values[1],
      right: values[1],
      top: values[0],
    };
  }
  if (values.length === 3) {
    return {
      bottom: values[2],
      left: values[1],
      right: values[1],
      top: values[0],
    };
  }

  return {
    bottom: values[2],
    left: values[3],
    right: values[1],
    top: values[0],
  };
}

function assertSnippetOrder(source, snippets, errorPrefix) {
  let previousIndex = -1;
  for (const snippet of snippets) {
    const currentIndex = source.indexOf(snippet);
    if (currentIndex < 0) {
      throw new Error(`${errorPrefix}: missing ${snippet}`);
    }
    if (currentIndex < previousIndex) {
      throw new Error(`${errorPrefix}: invalid order near ${snippet}`);
    }
    previousIndex = currentIndex;
  }
}

function getHomeThreeColumnCardContentFreeSpace(scss) {
  const cardBlock = extractRuleBlockAfterSelector(
    scss,
    ".dish-grid--cols-3 .dish-card",
  );
  const mediaBlock = extractRuleBlockAfterSelector(
    scss,
    ".dish-grid--cols-3 .dish-card__media",
  );
  const nameBlock = extractRuleBlockAfterSelector(
    scss,
    ".dish-grid--cols-3 .dish-card__name",
  );
  const actionsBlock = extractRuleBlockAfterSelector(
    scss,
    ".dish-grid--cols-3 .dish-card__actions",
  );
  const padding = extractVerticalPadding(cardBlock);
  const cardHeight = extractPxDeclaration(cardBlock, "height");
  const mediaHeight = extractPxDeclaration(mediaBlock, "height");
  const mediaWidth = extractPxDeclaration(mediaBlock, "width");
  const nameLineHeight = extractPxDeclaration(nameBlock, "line-height");
  const nameMarginTop = extractPxDeclaration(nameBlock, "margin-top");
  const actionsMarginTop = extractPxDeclaration(actionsBlock, "margin-top");
  const stepButtonHeight = extractCssVariablePxDeclaration(
    cardBlock,
    "--dish-step-size",
  );

  return {
    cardContentFreeSpacePx:
    cardHeight -
    padding.top -
    mediaHeight -
    nameMarginTop -
    nameLineHeight -
    actionsMarginTop -
    stepButtonHeight -
      padding.bottom,
    cardHeight,
    imageHeight: mediaHeight,
    imageWidth: mediaWidth,
  };
}

export function assertMiniappProjectConfig(config) {
  const miniprogramRoot = String(config.miniprogramRoot ?? "").replace(/\/+$/, "");
  if (config.appid !== EXPECTED_APP_ID || miniprogramRoot !== "dist") {
    throw new Error(
      `MINIAPP_PROJECT_ROOT_MISMATCH: expected ${EXPECTED_APP_ID} with miniprogramRoot=dist`,
    );
  }

  return {
    appid: config.appid,
    miniprogramRoot,
  };
}

export function assertMiniappFigmaPrototypeRecord(markdown) {
  const missingScopeFrames = EXPECTED_MINIAPP_PROTOTYPE_SCOPE_FRAMES.filter(
    (frameName) => !markdown.includes(frameName),
  );
  if (missingScopeFrames.length > 0) {
    throw new Error(
      `MINIAPP_FIGMA_PROTOTYPE_SCOPE_MISSING: ${missingScopeFrames.join(", ")}`,
    );
  }

  const missingLinkedFrames = EXPECTED_MINIAPP_LINKED_FIGMA_FRAMES.filter(
    (frameName) => !markdown.includes(frameName),
  );
  if (missingLinkedFrames.length > 0) {
    throw new Error(
      `MINIAPP_FIGMA_PROTOTYPE_RECORD_MISSING: ${missingLinkedFrames.join(", ")}`,
    );
  }

  const missingLinkedNodes = EXPECTED_MINIAPP_LINKED_FIGMA_NODES.filter(
    ({ frameName, nodeId }) => !markdown.includes(frameName) || !markdown.includes(nodeId),
  );
  if (missingLinkedNodes.length > 0) {
    throw new Error(
      `MINIAPP_FIGMA_LINKED_NODE_MISSING: ${missingLinkedNodes
        .map(({ frameName, nodeId }) => `${frameName} ${nodeId}`)
        .join(", ")}`,
    );
  }

  return {
    linkedFrames: EXPECTED_MINIAPP_LINKED_FIGMA_FRAMES,
    linkedNodes: EXPECTED_MINIAPP_LINKED_FIGMA_NODES,
    scopeFrames: EXPECTED_MINIAPP_PROTOTYPE_SCOPE_FRAMES,
    hasFullMiniappNodeTraceability: true,
  };
}

export function assertMiniappFigmaScreenshotArtifacts(files, dimensions) {
  for (const screenshot of EXPECTED_MINIAPP_FIGMA_SCREENSHOTS) {
    const fileSize = files.get(screenshot.path) ?? 0;
    if (fileSize < MIN_FIGMA_SCREENSHOT_BYTES) {
      throw new Error(
        `MINIAPP_FIGMA_SCREENSHOT_MISSING: ${screenshot.path}`,
      );
    }

    const actualDimensions = dimensions.get(screenshot.path);
    if (!actualDimensions) {
      throw new Error(
        `MINIAPP_FIGMA_SCREENSHOT_DIMENSIONS_MISSING: ${screenshot.path}`,
      );
    }
    if (
      actualDimensions.width !== screenshot.width ||
      actualDimensions.height !== screenshot.height
    ) {
      throw new Error(
        `MINIAPP_FIGMA_SCREENSHOT_DIMENSION_MISMATCH: ${screenshot.path} ${actualDimensions.width}x${actualDimensions.height}`,
      );
    }
  }

  return {
    screenshots: EXPECTED_MINIAPP_FIGMA_SCREENSHOTS.map((screenshot) => ({
      height: screenshot.height,
      path: screenshot.path,
      width: screenshot.width,
    })),
  };
}

function getMinimumWxssBytes(page) {
  return PAGE_WXSS_MIN_BYTES.get(page) ?? MIN_WXSS_BYTES;
}

export function assertMiniappPageArtifacts(files, pages = REQUIRED_MINIAPP_PAGES) {
  for (const page of pages) {
    for (const ext of ["js", "wxml"]) {
      const fileName = `${page}.${ext}`;
      if (!files.has(fileName)) {
        throw new Error(`MINIAPP_ARTIFACT_MISSING: ${fileName}`);
      }
    }

    const wxssName = `${page}.wxss`;
    if (!files.has(wxssName)) {
      if (!OPTIONAL_PAGE_WXSS.has(page)) {
        throw new Error(`MINIAPP_ARTIFACT_MISSING: ${wxssName}`);
      }
      continue;
    }

    const wxssSize = files.get(wxssName) ?? 0;
    const minWxssBytes = getMinimumWxssBytes(page);
    if (wxssSize < minWxssBytes) {
      throw new Error(`MINIAPP_WXSS_TOO_SMALL: ${wxssName} has ${wxssSize} bytes`);
    }
  }

  return { pages };
}

function extractObjectBlock(source, key) {
  const keyIndex = source.indexOf(`${key}:`);
  if (keyIndex < 0) {
    throw new Error(`MINIAPP_TAB_BAR_CONTRACT_MISMATCH: missing ${key}`);
  }

  const openIndex = source.indexOf("{", keyIndex);
  if (openIndex < 0) {
    throw new Error(`MINIAPP_TAB_BAR_CONTRACT_MISMATCH: invalid ${key}`);
  }

  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openIndex, index + 1);
      }
    }
  }

  throw new Error(`MINIAPP_TAB_BAR_CONTRACT_MISMATCH: invalid ${key}`);
}

export function assertMiniappTabBarContract(appConfigSource) {
  const tabBarBlock = extractObjectBlock(appConfigSource, "tabBar");

  const pagePathCount = (tabBarBlock.match(/pagePath:/g) ?? []).length;
  if (pagePathCount !== EXPECTED_MINIAPP_TAB_BAR_TABS.length) {
    throw new Error(
      `MINIAPP_TAB_BAR_CONTRACT_MISMATCH: got ${pagePathCount} tabs`,
    );
  }

  for (const tab of EXPECTED_MINIAPP_TAB_BAR_TABS) {
    for (const [key, value] of Object.entries(tab)) {
      if (!tabBarBlock.includes(`${key}: "${value}"`)) {
        throw new Error(
          `MINIAPP_TAB_BAR_CONTRACT_MISMATCH: missing ${key}=${value}`,
        );
      }
    }
  }

  return { tabs: EXPECTED_MINIAPP_TAB_BAR_TABS };
}

export function assertMiniappDistTabBarContract(appJson, files, iconDimensions = new Map()) {
  const distTabs = appJson?.tabBar?.list;
  if (!Array.isArray(distTabs)) {
    throw new Error("MINIAPP_DIST_TAB_BAR_MISMATCH: missing tabBar.list");
  }
  if (distTabs.length !== EXPECTED_MINIAPP_TAB_BAR_TABS.length) {
    throw new Error(
      `MINIAPP_DIST_TAB_BAR_MISMATCH: got ${distTabs.length} tabs`,
    );
  }

  for (const expectedTab of EXPECTED_MINIAPP_TAB_BAR_TABS) {
    const actualTab = distTabs.find(
      (tab) => tab?.pagePath === expectedTab.pagePath,
    );
    if (!actualTab) {
      throw new Error(
        `MINIAPP_DIST_TAB_BAR_MISMATCH: missing ${expectedTab.pagePath}`,
      );
    }

    for (const [key, value] of Object.entries(expectedTab)) {
      if (actualTab[key] !== value) {
        throw new Error(
          `MINIAPP_DIST_TAB_BAR_MISMATCH: ${expectedTab.pagePath} ${key}=${actualTab[key]}`,
        );
      }
    }

    for (const iconPath of [expectedTab.iconPath, expectedTab.selectedIconPath]) {
      if (!files.has(iconPath)) {
        throw new Error(`MINIAPP_DIST_TAB_ICON_MISSING: ${iconPath}`);
      }
      if ((files.get(iconPath) ?? 0) <= 0) {
        throw new Error(`MINIAPP_DIST_TAB_ICON_EMPTY: ${iconPath}`);
      }
      const dimensions = iconDimensions.get(iconPath);
      if (dimensions) {
        const { height, width } = dimensions;
        if (
          width !== height ||
          width < MIN_TAB_BAR_ICON_PX ||
          width > MAX_TAB_BAR_ICON_PX
        ) {
          throw new Error(
            `MINIAPP_DIST_TAB_ICON_SIZE_MISMATCH: ${iconPath} ${width}x${height}`,
          );
        }
      }
    }
  }

  return { tabs: EXPECTED_MINIAPP_TAB_BAR_TABS };
}

export function assertMiniappCustomTopConfig(configSources) {
  const expected = ["home", "me", "login", "orders", "packages", "addresses"];
  for (const page of expected) {
    const source = configSources[page];
    if (!source?.includes('navigationStyle: "custom"')) {
      throw new Error(`MINIAPP_CUSTOM_TOP_MISMATCH: ${page} must use custom nav`);
    }
    if (source.includes("navigationBarTitleText")) {
      throw new Error(
        `MINIAPP_CUSTOM_TOP_MISMATCH: ${page} must not output native title`,
      );
    }
  }

  return { customPages: expected };
}

export function assertMiniappCustomTopSource(pageSources) {
  const expectations = [
    {
      marker: 'className="home__custom-top"',
      page: "home",
      source: pageSources.home,
    },
    {
      marker: 'className="profile-hero__top"',
      page: "me",
      source: pageSources.me,
    },
    {
      marker: 'className="login__custom-top"',
      page: "login",
      source: pageSources.login,
    },
    {
      marker: 'className="orders__custom-top"',
      page: "orders",
      source: pageSources.orders,
    },
    {
      marker: 'className="packages__custom-top"',
      page: "packages",
      source: pageSources.packages,
    },
    {
      marker: 'className="addresses__custom-top"',
      page: "addresses",
      source: pageSources.addresses,
    },
  ];

  const requiredComponentSnippets = [
    "Taro.getWindowInfo",
    "Taro.getMenuButtonBoundingClientRect",
    "paddingTop",
    "capsuleWidth",
    "mini-custom-top__capsule-space",
    "mini-custom-top__back",
  ];
  for (const snippet of requiredComponentSnippets) {
    if (!pageSources.component?.includes(snippet)) {
      throw new Error(
        `MINIAPP_CUSTOM_TOP_SOURCE_MISMATCH: missing ${snippet}`,
      );
    }
  }

  for (const expectation of expectations) {
    if (!expectation.source?.includes("MiniCustomTop")) {
      throw new Error(
        `MINIAPP_CUSTOM_TOP_SOURCE_MISMATCH: ${expectation.page} must render MiniCustomTop`,
      );
    }
    if (!expectation.source.includes(expectation.marker)) {
      throw new Error(
        `MINIAPP_CUSTOM_TOP_SOURCE_MISMATCH: ${expectation.page} missing ${expectation.marker}`,
      );
    }
  }

  const titlelessTopPages = [
    {
      marker: 'className="home__custom-top"',
      page: "home",
      source: pageSources.home,
    },
    {
      marker: 'className="profile-hero__top"',
      page: "me",
      source: pageSources.me,
    },
    {
      marker: 'className="login__custom-top"',
      page: "login",
      source: pageSources.login,
    },
  ];
  for (const page of titlelessTopPages) {
    const customTopMatch = page.source?.match(
      new RegExp(`<MiniCustomTop[\\s\\S]*?${page.marker}[\\s\\S]*?\\/?>`),
    );
    if (customTopMatch?.[0]?.includes("title=")) {
      throw new Error(
        `MINIAPP_CUSTOM_TOP_TITLE_MISMATCH: ${page.page} must blend with page background without a title`,
      );
    }
  }

  if (!pageSources.login?.includes("back") || !pageSources.login.includes("onBack={goBack}")) {
    throw new Error(
      "MINIAPP_CUSTOM_TOP_SOURCE_MISMATCH: login must wire shared back control",
    );
  }

  return {
    renderedPages: expectations.map((item) => item.page),
    titlelessPages: titlelessTopPages.map((item) => item.page),
  };
}

export function assertMiniappDistCustomTopConfig(pageJsons, appJson) {
  const expected = ["home", "me", "login", "orders", "packages", "addresses"];
  if (appJson && appJson.window?.navigationStyle !== "custom") {
    throw new Error("MINIAPP_DIST_CUSTOM_TOP_GLOBAL_MISMATCH");
  }
  if (appJson?.window?.navigationBarTitleText) {
    throw new Error("MINIAPP_DIST_CUSTOM_TOP_GLOBAL_TITLE_MISMATCH");
  }

  for (const page of expected) {
    const pageJson = pageJsons[page];
    if (pageJson?.navigationStyle !== "custom") {
      throw new Error(`MINIAPP_DIST_CUSTOM_TOP_MISMATCH: ${page}`);
    }
    if ("navigationBarTitleText" in pageJson) {
      throw new Error(`MINIAPP_DIST_CUSTOM_TOP_TITLE_MISMATCH: ${page}`);
    }
  }

  return {
    customPages: expected,
    globalCustomNavigation: appJson ? true : undefined,
  };
}

export function assertMiniappWebviewNavigationConfig(pageJson) {
  if (pageJson?.navigationStyle !== "default") {
    throw new Error("MINIAPP_WEBVIEW_NAVIGATION_MISMATCH");
  }
  if (pageJson.navigationBarTitleText !== "协议详情") {
    throw new Error("MINIAPP_WEBVIEW_TITLE_MISMATCH");
  }

  return {
    hasNativeNavigation: true,
    title: pageJson.navigationBarTitleText,
  };
}

function assertSnippets(source, snippets, errorPrefix, label) {
  for (const snippet of snippets) {
    if (!source?.includes(snippet)) {
      throw new Error(`${errorPrefix}: ${label} missing ${snippet}`);
    }
  }
}

export function assertMiniappDistRuntimeStructure({ commonWxss, pages }) {
  assertSnippets(
    commonWxss,
    [
      ".mini-custom-top",
      ".mini-custom-top__back",
      ".mini-custom-top__capsule-space",
    ],
    "MINIAPP_DIST_RUNTIME_MISMATCH",
    "common.wxss",
  );

  const expectations = {
    home: {
      js: [
        "home__custom-top",
        "package-card__stats",
        "dish-grid--cols-",
        "summary__address",
        "reservation-confirm",
        "address-switch-modal",
      ],
      wxss: [
        ".home__custom-top",
        ".package-card__cutoff",
        ".package-card__stats",
        ".dish-grid--cols-3",
        ".dish-card__image",
        ".summary__address",
        ".reservation-confirm",
        ".address-switch-modal",
      ],
    },
    login: {
      js: [
        "login__custom-top",
        "login__mark-image",
        "login__brand-name",
        "getPhoneNumber",
        "login__agreement",
      ],
      wxss: [
        ".login__custom-top",
        ".login__mark",
        ".login__mark-image",
        ".login__button",
        ".login__agreement",
      ],
    },
    me: {
      js: [
        "profile-hero__top",
        "profile-hero__image",
        "member-card__usage",
        "service-grid",
      ],
      wxss: [
        ".profile-hero",
        ".profile-hero__top",
        ".member-card",
        ".member-card__usage",
        ".service-grid",
        ".service-item__icon--order",
      ],
    },
    orders: {
      js: [
        "orders__custom-top",
        "order-tabs__item--active",
        "order__status--pending",
        "order__status--shipped",
        "order__status--signed",
        "order__status--canceled",
        "order__button--primary",
        "order__button--danger",
      ],
      wxss: [
        ".orders__custom-top",
        ".order-tabs",
        ".order-tabs__item--active",
        ".order__status--pending",
        ".order__status--shipped",
        ".order__status--signed",
        ".order__status--canceled",
        ".order__button",
      ],
    },
    addresses: {
      js: [
        "addresses__custom-top",
        "address-card__detail",
        "address-card__action--danger",
        "address-form-modal__mask",
        "form-panel__handle",
        "form-panel__close",
        "field--switch",
        "default-status",
      ],
      wxss: [
        ".addresses__custom-top",
        ".address-card",
        ".address-card__tag",
        ".address-card__action--danger",
        ".address-form-modal",
        ".address-form-modal__mask",
        ".form-panel__handle",
        ".form-panel__close",
      ],
    },
    packages: {
      js: [
        "packages__custom-top",
        "package-switcher",
        "package-swiper",
        "package-dots",
        "hero-card__photo",
        "benefit-card__dot--orange",
        "cycle-card__track",
        "usage-card__title",
      ],
      wxss: [
        ".packages__custom-top",
        ".package-switcher",
        ".package-swiper",
        ".package-dots",
        ".hero-card",
        ".hero-card__photo",
        ".benefit-grid",
        ".cycle-card",
        ".usage-card",
        ".primary-button",
      ],
    },
  };

  for (const [page, expected] of Object.entries(expectations)) {
    assertSnippets(
      pages?.[page]?.js,
      expected.js,
      "MINIAPP_DIST_RUNTIME_MISMATCH",
      `${page}.js`,
    );
    assertSnippets(
      pages?.[page]?.wxss,
      expected.wxss,
      "MINIAPP_DIST_RUNTIME_MISMATCH",
      `${page}.wxss`,
    );
  }

  return {
    hasCommonCustomTop: true,
    pages: Object.keys(expectations),
  };
}

export function assertMiniappLoginPrototypeSource({ scss, tsx }) {
  const requiredTsxSnippets = [
    "login-vegetables.jpg",
    "MiniCustomTop",
    'className="login__custom-top"',
    'className="login__mark-image"',
    "Hentor Fresh",
    "社区鲜蔬会员",
    "立即登录",
    'openType={agreementAccepted ? "getPhoneNumber" : undefined}',
    "promptAgreementRequired",
    "login__agreement-check",
    "返回",
    "returnToPreviousPage",
    'className="login__agreement"',
    "《用户协议》",
    "《隐私政策》",
  ];
  for (const snippet of requiredTsxSnippets) {
    if (!tsx.includes(snippet)) {
      throw new Error(`MINIAPP_LOGIN_PROTOTYPE_MISMATCH: missing ${snippet}`);
    }
  }

  const phoneLoginActionCount = (tsx.match(/getPhoneNumber/g) ?? []).length;
  if (phoneLoginActionCount < 1) {
    throw new Error("MINIAPP_LOGIN_PROTOTYPE_MISMATCH: missing phone login action");
  }
  if (tsx.includes('openType="getPhoneNumber"')) {
    throw new Error("MINIAPP_LOGIN_PROTOTYPE_MISMATCH: phone auth cannot be requested before agreement");
  }

  const forbiddenContent = [
    "无套餐",
    "暂无套餐",
    "购买套餐",
    "套餐入口",
    "新人",
    "优惠",
    "专享",
  ];
  for (const content of forbiddenContent) {
    if (tsx.includes(content)) {
      throw new Error(`MINIAPP_LOGIN_PROTOTYPE_MISMATCH: remove ${content}`);
    }
  }

  const requiredScssSnippets = [
    ".login__custom-top",
    ".login__brand",
    ".login__mark",
    ".login__mark-image",
    ".login__brand-name",
    ".login__actions",
    "flex: 1",
    ".login__button",
    ".login__agreement",
    "margin-top: auto",
  ];
  for (const snippet of requiredScssSnippets) {
    if (!scss.includes(snippet)) {
      throw new Error(`MINIAPP_LOGIN_PROTOTYPE_MISMATCH: missing ${snippet}`);
    }
  }

  const forbiddenScssSnippets = [
    ".login__hero",
    ".login__visual",
    ".login__scene",
    ".login__truck",
    ".login__basket",
  ];
  for (const snippet of forbiddenScssSnippets) {
    if (scss.includes(snippet)) {
      throw new Error(`MINIAPP_LOGIN_PROTOTYPE_MISMATCH: remove ${snippet}`);
    }
  }

  return {
    hasAgreement: true,
    hasPhoneLogin: true,
    hasVegetableImage: true,
  };
}

export function assertMiniappMePrototypeSource({ scss, tsx }) {
  const requiredTsxSnippets = [
    "login-vegetables.jpg",
    "getPackageUsageStats",
    "查看套餐",
    "showActionSheet",
    "退出登录",
    'Taro.removeStorageSync("editing_order_id")',
    "await loadMe()",
    "/pages/orders/index",
    "/pages/packages/index",
    'className="profile-hero"',
    'className="member-card"',
    'className="member-card__usage"',
    'className="service-card"',
    'className="service-grid"',
    'service-item__icon--',
    'label: "订单"',
    'label: "地址管理"',
    'label: "套餐"',
    'label: "账号设置"',
  ];
  for (const snippet of requiredTsxSnippets) {
    if (!tsx.includes(snippet)) {
      throw new Error(`MINIAPP_ME_PROTOTYPE_MISMATCH: missing ${snippet}`);
    }
  }

  assertSnippetOrder(
    tsx,
    [
      'className="profile-hero"',
      'className="member-card"',
      'className="service-card"',
    ],
    "MINIAPP_ME_PROTOTYPE_MISMATCH",
  );
  assertSnippetOrder(
    tsx,
    [
      'label: "订单"',
      'label: "地址管理"',
      'label: "套餐"',
      'label: "账号设置"',
    ],
    "MINIAPP_ME_SERVICE_ORDER_MISMATCH",
  );

  const requiredScssSnippets = [
    ".profile-hero",
    ".profile-hero__image",
    ".member-card",
    ".member-card__usage",
    ".member-card__progress",
    ".service-grid",
    ".service-item__icon",
    ".service-item__icon--order",
    ".service-item__icon--pin",
    ".service-item__icon--card",
    ".service-item__icon--user",
    "grid-template-columns: repeat(3, 96px)",
    "height: 82px",
  ];
  for (const snippet of requiredScssSnippets) {
    if (!scss.includes(snippet)) {
      throw new Error(`MINIAPP_ME_PROTOTYPE_MISMATCH: missing ${snippet}`);
    }
  }

  const meBlock = extractRuleBlockAfterSelector(scss, ".me {");
  const mePadding = extractPaddingValues(meBlock);
  if (
    mePadding.left !== FIGMA_ME_HORIZONTAL_PADDING_PX ||
    mePadding.right !== FIGMA_ME_HORIZONTAL_PADDING_PX ||
    !meBlock.includes("#073f25 286px") ||
    !meBlock.includes("#f5faf2 286px")
  ) {
    throw new Error("MINIAPP_ME_FIGMA_LAYOUT_MISMATCH: page background");
  }

  const heroBlock = extractRuleBlockAfterSelector(scss, ".profile-hero {");
  const heroPadding = extractPaddingValues(heroBlock);
  const heroMinHeight = extractPxDeclaration(heroBlock, "min-height");
  if (
    heroMinHeight !== FIGMA_ME_HERO_HEIGHT_PX ||
    heroPadding.left !== FIGMA_ME_HERO_INNER_PADDING_PX ||
    heroPadding.right !== FIGMA_ME_HERO_INNER_PADDING_PX ||
    !heroBlock.includes("margin: 0 -16px")
  ) {
    throw new Error("MINIAPP_ME_FIGMA_LAYOUT_MISMATCH: hero");
  }

  const heroImageBlock = extractRuleBlockAfterSelector(
    scss,
    ".profile-hero__image",
  );
  const heroImageHeight = extractPxDeclaration(heroImageBlock, "height");
  const heroImageWidth = extractPxDeclaration(heroImageBlock, "width");
  const hasAbsoluteHeroImagePlacement =
    /right\s*:\s*20px/.test(heroImageBlock) && /top\s*:\s*84px/.test(heroImageBlock);
  const hasFlexHeroImagePlacement = /flex\s*:\s*0\s+0\s+104px/.test(
    heroImageBlock,
  );
  if (
    heroImageHeight !== FIGMA_ME_HERO_IMAGE_HEIGHT_PX ||
    heroImageWidth !== FIGMA_ME_HERO_IMAGE_WIDTH_PX ||
    (!hasAbsoluteHeroImagePlacement && !hasFlexHeroImagePlacement)
  ) {
    throw new Error("MINIAPP_ME_FIGMA_LAYOUT_MISMATCH: hero image");
  }

  const memberBlock = extractRuleBlockAfterSelector(scss, ".member-card {");
  if (
    extractPxDeclaration(memberBlock, "border-radius") !==
      FIGMA_ME_MEMBER_CARD_RADIUS_PX ||
    extractSignedPxDeclaration(memberBlock, "margin-top") !==
      FIGMA_ME_MEMBER_CARD_OVERLAP_PX ||
    extractPxDeclaration(memberBlock, "padding") !==
      FIGMA_ME_MEMBER_CARD_PADDING_PX
  ) {
    throw new Error("MINIAPP_ME_FIGMA_LAYOUT_MISMATCH: member card");
  }

  const progressBlock = extractRuleBlockAfterSelector(
    scss,
    ".member-card__progress",
  );
  if (
    extractPxDeclaration(progressBlock, "height") !==
      FIGMA_ME_PROGRESS_HEIGHT_PX ||
    extractPxDeclaration(progressBlock, "width") !== FIGMA_ME_PROGRESS_WIDTH_PX
  ) {
    throw new Error("MINIAPP_ME_FIGMA_LAYOUT_MISMATCH: package progress");
  }

  const serviceBlock = extractRuleBlockAfterSelector(scss, ".service-card {");
  const serviceGridBlock = extractRuleBlockAfterSelector(scss, ".service-grid");
  const serviceItemBlock = extractRuleBlockAfterSelector(scss, ".service-item");
  if (
    extractPxDeclaration(serviceBlock, "margin-top") !== 24 ||
    !scss.includes('content: "常用服务"') ||
    !serviceGridBlock.includes("gap: 12px 31px") ||
    !serviceGridBlock.includes("justify-content: space-between") ||
    extractPxDeclaration(serviceItemBlock, "height") !==
      FIGMA_ME_SERVICE_ITEM_HEIGHT_PX ||
    extractPxDeclaration(serviceItemBlock, "width") !==
      FIGMA_ME_SERVICE_ITEM_WIDTH_PX
  ) {
    throw new Error("MINIAPP_ME_FIGMA_LAYOUT_MISMATCH: services");
  }

  const forbiddenTsxSnippets = [
    "我的套餐",
    "当前套餐剩余次数",
    "待发货，可修改",
    "今日已预订",
    "去修改",
    "账号注销",
    'label: "修改预订"',
    'label: "联系客服"',
    'className="today-card"',
    'className="current-store-card"',
    'className="recent-card"',
    'className="entry"',
    'className="entry__main"',
    'className="member-card__meta"',
    'className="profile__store"',
    'className="store-switcher"',
    'className="store-chip"',
    '<View className="card__title">当前门店</View>',
  ];
  for (const snippet of forbiddenTsxSnippets) {
    if (tsx.includes(snippet)) {
      throw new Error(`MINIAPP_ME_PROTOTYPE_MISMATCH: remove ${snippet}`);
    }
  }

  const forbiddenScssSnippets = [
    ".entry",
    ".entry__main",
    ".entry__meta",
    ".member-card__meta",
    ".profile__store",
    ".store-switcher",
    ".store-chip",
  ];
  for (const snippet of forbiddenScssSnippets) {
    if (scss.includes(snippet)) {
      throw new Error(`MINIAPP_ME_PROTOTYPE_MISMATCH: remove ${snippet}`);
    }
  }

  const forbiddenTextIcons = [
    '<View className="service-item__icon">订</View>',
    '<View className="service-item__icon">改</View>',
    '<View className="service-item__icon">址</View>',
    '<View className="service-item__icon">客</View>',
    '<View className="service-item__icon">套</View>',
    '<View className="service-item__icon">设</View>',
  ];
  for (const snippet of forbiddenTextIcons) {
    if (tsx.includes(snippet)) {
      throw new Error("MINIAPP_ME_TEXT_SERVICE_ICONS");
    }
  }

  return {
    hasCustomerServiceEntry: true,
    hasEditReservationEntry: false,
    hasOrdersEntry: true,
    hasPackagesEntry: true,
    hasStoreSwitchFlow: false,
    heroHeight: FIGMA_ME_HERO_HEIGHT_PX,
    heroImageHeight,
    heroImageWidth,
    memberCardOverlap: FIGMA_ME_MEMBER_CARD_OVERLAP_PX,
    serviceItemHeight: FIGMA_ME_SERVICE_ITEM_HEIGHT_PX,
    serviceItemWidth: FIGMA_ME_SERVICE_ITEM_WIDTH_PX,
  };
}

export function assertMiniappPackagesPrototypeSource({ scss, tsx }) {
  const requiredTsxSnippets = [
    "login-vegetables.jpg",
    "Swiper",
    "SwiperItem",
    "getFirstPackageItem",
    "getPackageHeroView",
    "getPackageSlidePosition",
    "Hentor Fresh",
    "我的套餐",
    "左右滑动切换",
    "套餐权益",
    "本周期用量",
    "套餐使用明细",
    "去首页预订",
    "package-switcher",
    "package-swiper",
    "package-dots",
    "hero-card",
    "benefit-grid",
    "cycle-card",
  ];
  for (const snippet of requiredTsxSnippets) {
    if (!tsx.includes(snippet)) {
      throw new Error(`MINIAPP_PACKAGES_PROTOTYPE_MISMATCH: missing ${snippet}`);
    }
  }

  const requiredScssSnippets = [
    ".hero-card",
    ".hero-card__photo",
    ".package-switcher",
    ".package-swiper",
    ".package-dots",
    ".benefit-grid",
    "grid-template-columns: repeat(2, minmax(0, 1fr))",
    ".cycle-card",
    ".usage-card",
    ".primary-button",
  ];
  for (const snippet of requiredScssSnippets) {
    if (!scss.includes(snippet)) {
      throw new Error(`MINIAPP_PACKAGES_PROTOTYPE_MISMATCH: missing ${snippet}`);
    }
  }

  const forbiddenSnippets = [
    'className="package-card__numbers"',
    ".package-card__numbers",
    "剩余次数",
    "单次额度",
    "已用/总数",
    'className="reserve__item"',
    ".reserve__item",
    'className="reserve__title"',
    ".reserve__title",
    "更多功能",
    "更多功能暂未开放",
    "购买/续费套餐",
    "payment-reserve",
    "reservePurchase(purchaseTemplate.id)",
  ];
  for (const snippet of forbiddenSnippets) {
    if (tsx.includes(snippet) || scss.includes(snippet)) {
      throw new Error(`MINIAPP_PACKAGES_PROTOTYPE_MISMATCH: remove ${snippet}`);
    }
  }

  return {
    hasBenefitGrid: true,
    hasPackageSwiper: true,
    hasUsageDetails: true,
  };
}

export function assertMiniappHomePrototypeSource({ scss, tsx }) {
  const forbiddenSelectors = [
    ".category",
    ".category-list",
    ".category-tabs",
    ".dish-list",
    ".edit-banner",
  ];
  for (const selector of forbiddenSelectors) {
    if (scss.includes(selector) || tsx.includes(selector)) {
      throw new Error(`MINIAPP_HOME_OLD_CATEGORY_LAYOUT: remove ${selector}`);
    }
  }

  const requiredScssSnippets = [
    ".dish-grid--cols-2",
    ".dish-grid--cols-3",
    ".dish-grid--cols-4",
    ".summary__address",
    ".summary__address-action",
    ".summary__body",
    ".address-switch-modal",
    ".address-switch-modal__mask",
    ".address-switch-panel",
    ".address-switch-panel__handle",
    ".address-switch-panel__add",
    ".address-option",
    "grid-template-columns: repeat(3, minmax(0, 1fr))",
    "width: 100%",
    "height: 132px",
    "border: 2px solid #dceed7",
    "border-radius: 22px",
    ".package-card__cutoff",
    ".package-card__stats",
    ".package-card__stat-value",
    ".package-card--empty",
    ".package-card__empty-title",
    ".package-card__empty-meta",
    ".reservation-confirm",
    ".confirm-dish-list",
    ".confirm-dish-item",
    ".confirm-address",
    ".confirm-notice",
    ".confirm-primary",
  ];
  for (const snippet of requiredScssSnippets) {
    if (!scss.includes(snippet)) {
      throw new Error(`MINIAPP_HOME_GRID_PROTOTYPE_MISMATCH: missing ${snippet}`);
    }
  }

  const requiredTsxSnippets = [
    "dish-grid",
    "homeData?.store.homeDishColumns",
    "getPackageUsageProgressPercent",
    "getReservationConfirmView",
    "buildSetDefaultAddressUrl",
    "formatAddressReceiverLine",
    "isEditingCurrentOrder",
    "originalItems: editableCurrentOrder?.items",
    "reservationGate.hideSubmitButton",
    "confirmationView",
    "confirmSubmitOrder",
    "addressSwitchOpen",
    "loadAddressItems",
    "selectReservationAddress",
    "openCreateAddressFromSwitch",
    "selectedAddress",
    "reservationReceiver",
    'reservationAddress.source === "currentOrder"',
    "selectedAddress?.receiverName",
    "dish-grid--cols-",
    'className="dish-card__actions"',
    'className="dish-card__image"',
    'className="package-card__cutoff"',
    'className="package-card__stats"',
    'className="package-card__stat-value"',
    "package-card--empty",
    'className="package-card__empty-title"',
    'className="package-card__empty-meta"',
    'className="confirm-dish-list"',
    'className="confirm-dish-item"',
    'className="summary"',
    'className="summary__address"',
    'className="summary__address-action"',
    'className="address-switch-modal"',
    'className="address-switch-modal__mask"',
    'className="address-switch-panel"',
    'className="address-option__tag"',
    "今天已有订单",
    "再来一单",
    "去修改",
    "提交订单",
    "确认修改",
    "confirmationView.title",
    "confirmationView.secondaryText",
    "getDishImage",
    'reservationAddress.id ? "切换" : "新增地址"',
  ];
  for (const snippet of requiredTsxSnippets) {
    if (!tsx.includes(snippet)) {
      throw new Error(`MINIAPP_HOME_GRID_PROTOTYPE_MISMATCH: missing ${snippet}`);
    }
  }

  if (tsx.includes('className="address"')) {
    throw new Error("MINIAPP_HOME_ADDRESS_NOT_BOTTOM");
  }

  if (tsx.includes('Taro.navigateTo({ url: "/pages/addresses/index" })')) {
    throw new Error("MINIAPP_HOME_ADDRESS_SWITCH_LEAVES_CONTEXT");
  }

  if (tsx.includes('className="home__title"')) {
    throw new Error("MINIAPP_HOME_REDUNDANT_BODY_TITLE");
  }

  if (tsx.includes('<View className="empty-package">{reservationGate.emptyMessage}</View>')) {
    throw new Error("MINIAPP_HOME_NO_PACKAGE_USES_OLD_ALERT");
  }

  if (tsx.includes('className="edit-banner"')) {
    throw new Error("MINIAPP_HOME_OLD_EDIT_BANNER");
  }

  if (tsx.includes("剩余 {summary.remainingWeightJin}")) {
    throw new Error("MINIAPP_HOME_REPEATED_REMAINING_WEIGHT");
  }

  if (
    tsx.includes("已选 {summary.totalWeightJin}") ||
    tsx.includes("已选 {summary.totalWeightJin} / {packageInfo.weightLimitJin}斤") ||
    tsx.includes("每次最多 {packageInfo.weightLimitJin}斤")
  ) {
    throw new Error("MINIAPP_HOME_PACKAGE_CARD_REPEATS_SELECTED_WEIGHT");
  }

  if (tsx.includes('className="package-card__visual"')) {
    throw new Error("MINIAPP_HOME_PACKAGE_CARD_HAS_DECORATIVE_IMAGE");
  }

  if (tsx.includes("Taro.showModal({") && !tsx.includes("underLimitConfirm")) {
    throw new Error("MINIAPP_HOME_CONFIRMATION_USES_SYSTEM_MODAL");
  }

  if (
    tsx.includes('className="reservation-confirm__status"') ||
    tsx.includes('className="reservation-confirm__menu"') ||
    scss.includes(".reservation-confirm__status") ||
    scss.includes(".reservation-confirm__menu") ||
    tsx.includes("9:41") ||
    tsx.includes("•• ○")
  ) {
    throw new Error("MINIAPP_HOME_CONFIRMATION_DUPLICATES_WECHAT_TOP");
  }

  if (tsx.includes("getDishFallbackIcon") || scss.includes(".dish-card__icon")) {
    throw new Error("MINIAPP_HOME_DISH_FALLBACK_IS_TEXT");
  }

  if (!/\.dish-card__weight\s*\{[^}]*white-space:\s*nowrap/s.test(scss)) {
    throw new Error("MINIAPP_HOME_WEIGHT_CAN_WRAP");
  }

  if (!/\.package-card\s*\{[^}]*position:\s*relative/s.test(scss)) {
    throw new Error("MINIAPP_HOME_PACKAGE_CARD_CUTOFF_POSITION_CONTEXT");
  }

  const homeBlock = extractRuleBlockAfterSelector(scss, ".home {");
  const homePadding = extractPaddingValues(homeBlock);
  if (
    homePadding.left !== FIGMA_HOME_HORIZONTAL_PADDING_PX ||
    homePadding.right !== FIGMA_HOME_HORIZONTAL_PADDING_PX
  ) {
    throw new Error(
      `MINIAPP_HOME_SIDE_PADDING_MISMATCH: ${homePadding.left}/${homePadding.right}`,
    );
  }

  const packageCardBlock = extractRuleBlockAfterSelector(scss, ".package-card {");
  const packageCardMinHeight = extractOptionalPxDeclaration(
    packageCardBlock,
    "min-height",
  );
  if (packageCardMinHeight !== FIGMA_HOME_PACKAGE_CARD_MIN_HEIGHT_PX) {
    throw new Error(
      `MINIAPP_HOME_PACKAGE_CARD_HEIGHT_MISMATCH: ${packageCardMinHeight}`,
    );
  }

  const cutoffBlock = extractRuleBlockAfterSelector(
    scss,
    ".package-card__cutoff",
  );
  if (
    cutoffBlock.includes("position: absolute") ||
    cutoffBlock.includes("right:") ||
    cutoffBlock.includes("top:")
  ) {
    throw new Error("MINIAPP_HOME_PACKAGE_CARD_CUTOFF_OVERLAPS_STATS");
  }

  if (!/\.summary__address-action\s*\{[^}]*white-space:\s*nowrap/s.test(scss)) {
    throw new Error("MINIAPP_HOME_ADDRESS_ACTION_CAN_WRAP");
  }

  if (!tsx.includes("reservationAddress.detail")) {
    throw new Error("MINIAPP_HOME_ADDRESS_DETAIL_DUPLICATED_LABEL_RISK");
  }

  const summaryBlock = extractRuleBlockAfterSelector(scss, ".summary {");
  const summaryBottomPx = extractPxDeclaration(summaryBlock, "bottom");
  const summaryLeftPx = extractPxDeclaration(summaryBlock, "left");
  const summaryRightPx = extractPxDeclaration(summaryBlock, "right");
  if (summaryBottomPx > MAX_HOME_SUMMARY_BOTTOM_PX) {
    throw new Error(
      `MINIAPP_HOME_SUMMARY_TOO_HIGH: bottom ${summaryBottomPx}px`,
    );
  }
  if (
    summaryLeftPx !== FIGMA_HOME_SUMMARY_SIDE_OFFSET_PX ||
    summaryRightPx !== FIGMA_HOME_SUMMARY_SIDE_OFFSET_PX
  ) {
    throw new Error(
      `MINIAPP_HOME_SUMMARY_SIDE_OFFSET_MISMATCH: ${summaryLeftPx}/${summaryRightPx}`,
    );
  }

  const summarySubmitBlock = extractRuleBlockAfterSelector(
    scss,
    ".summary__submit {",
  );
  const summarySubmitHeightPx = extractPxDeclaration(
    summarySubmitBlock,
    "height",
  );
  const summarySubmitMinWidthPx = extractPxDeclaration(
    summarySubmitBlock,
    "min-width",
  );
  if (summarySubmitHeightPx !== FIGMA_HOME_SUMMARY_SUBMIT_HEIGHT_PX) {
    throw new Error(
      `MINIAPP_HOME_SUMMARY_SUBMIT_HEIGHT_MISMATCH: ${summarySubmitHeightPx}`,
    );
  }
  if (summarySubmitMinWidthPx !== FIGMA_HOME_SUMMARY_SUBMIT_MIN_WIDTH_PX) {
    throw new Error(
      `MINIAPP_HOME_SUMMARY_SUBMIT_WIDTH_MISMATCH: ${summarySubmitMinWidthPx}`,
    );
  }

  const cardMetrics = getHomeThreeColumnCardContentFreeSpace(scss);
  const { cardContentFreeSpacePx } = cardMetrics;
  if (cardContentFreeSpacePx < MIN_HOME_CARD_CONTENT_FREE_SPACE_PX) {
    throw new Error(
      `MINIAPP_HOME_CARD_NAME_CLIP_RISK: only ${cardContentFreeSpacePx}px free`,
    );
  }
  if (cardMetrics.cardHeight !== FIGMA_HOME_THREE_COLUMN_CARD_HEIGHT_PX) {
    throw new Error(
      `MINIAPP_HOME_CARD_FIGMA_SIZE_MISMATCH: height ${cardMetrics.cardHeight}`,
    );
  }
  if (
    cardMetrics.imageHeight !== FIGMA_HOME_THREE_COLUMN_IMAGE_HEIGHT_PX ||
    cardMetrics.imageWidth !== FIGMA_HOME_THREE_COLUMN_IMAGE_WIDTH_PX
  ) {
    throw new Error(
      `MINIAPP_HOME_CARD_IMAGE_FIGMA_SIZE_MISMATCH: ${cardMetrics.imageWidth}x${cardMetrics.imageHeight}`,
    );
  }

  return {
    cardContentFreeSpacePx,
    cardHeight: cardMetrics.cardHeight,
    defaultColumns: 3,
    imageHeight: cardMetrics.imageHeight,
    imageWidth: cardMetrics.imageWidth,
    packageCardMinHeight,
    summaryBottomPx,
    summaryLeftPx,
    summaryRightPx,
    summarySubmitHeightPx,
    summarySubmitMinWidthPx,
  };
}

export function assertMiniappOrdersPrototypeSource({ lib, scss, tsx }) {
  const forbiddenSnippets = [
    'label: "全部"',
    'className="header__back"',
    'className="header__title"',
    'className="header__refresh"',
    'className="header__meta"',
    'className="order__weight"',
    "openPendingActions",
    "showActionSheet",
    'itemList: ["取消预订", "修改预订"]',
    "刷新",
    "待发货 {statusCounts",
  ];
  for (const snippet of forbiddenSnippets) {
    if (lib.includes(snippet) || tsx.includes(snippet) || scss.includes(snippet)) {
      throw new Error(`MINIAPP_ORDERS_PROTOTYPE_MISMATCH: remove ${snippet}`);
    }
  }

  const requiredTsxSnippets = [
    "MiniCustomTop",
    'className="orders__custom-top"',
    'title="订单"',
    "ORDER_STATUS_TABS.map",
    "filterOrdersByStatus",
    "editOrder",
    "/pages/order-edit/index?orderId=",
    "cancelOrder",
    "MiniConfirmModal",
    "showConfirmDialog",
    "取消后会恢复本次套餐次数和附加权益",
    "copyLogisticsNo",
    "Taro.setClipboardData",
    "data: logisticsNo",
    'order.status === "SHIPPED" && order.logisticsNo',
    "copyLogisticsNo(order.logisticsNo)",
    "hideOrder",
    'order.status === "CANCELED" || order.status === "VOIDED"',
    "void hideOrder(order.id)",
    "修改",
    "取消",
    "复制运单",
    "删除",
  ];
  for (const snippet of requiredTsxSnippets) {
    if (!tsx.includes(snippet)) {
      throw new Error(`MINIAPP_ORDERS_PROTOTYPE_MISMATCH: missing ${snippet}`);
    }
  }

  const requiredScssSnippets = [
    "background: #f8fbf6",
    ".orders__custom-top",
    "grid-template-columns: repeat(4, 1fr)",
    ".order__status--pending",
    ".order__status--shipped",
    ".order__status--signed",
    ".order__status--canceled",
    "border-radius: 16px",
    "min-height: 138px",
    ".order__button",
    "height: 36px",
    "min-width: 60px",
    "padding: 0 12px",
  ];
  for (const snippet of requiredScssSnippets) {
    if (!scss.includes(snippet)) {
      throw new Error(`MINIAPP_ORDERS_PROTOTYPE_MISMATCH: missing ${snippet}`);
    }
  }

  return {
    hasCanceledHideAction: true,
    hasFourStatusTabs: true,
    hasLogisticsClipboardAction: true,
    hasPendingActionSheet: false,
  };
}

export function assertMiniappAddressesPrototypeSource({ lib, scss, tsx }) {
  const forbiddenSnippets = [
    "{item.receiverName} {item.receiverPhone}",
    'onClick={() => setFormOpen(false)}',
  ];
  for (const snippet of forbiddenSnippets) {
    if (tsx.includes(snippet)) {
      throw new Error(`MINIAPP_ADDRESSES_PROTOTYPE_MISMATCH: remove ${snippet}`);
    }
  }

  const requiredLibSnippets = [
    "maskReceiverPhone",
    "formatAddressReceiverLine",
    "buildAddressSubmitPayload",
    "buildSetDefaultAddressUrl",
  ];
  for (const snippet of requiredLibSnippets) {
    if (!lib.includes(snippet)) {
      throw new Error(`MINIAPP_ADDRESSES_PROTOTYPE_MISMATCH: missing ${snippet}`);
    }
  }

  const requiredTsxSnippets = [
    "formatAddressReceiverLine(item)",
    "closeForm",
    'className="address-form-modal"',
    'className="address-form-modal__mask"',
    'className="form-panel__handle"',
    'className="form-panel__meta"',
    "setDefaultAddress(item)",
    "deleteAddress(item)",
    "buildSetDefaultAddressUrl",
    "buildAddressSubmitPayload",
    "buildAddressResourceUrl",
    'method: editing ? "PUT" : "POST"',
    "addressId: editing.id",
  ];
  for (const snippet of requiredTsxSnippets) {
    if (!tsx.includes(snippet)) {
      throw new Error(`MINIAPP_ADDRESSES_PROTOTYPE_MISMATCH: missing ${snippet}`);
    }
  }

  const requiredScssSnippets = [
    ".address-form-modal",
    ".address-form-modal__mask",
    "background: rgb(7 20 12 / 40%)",
    ".form-panel__handle",
    "max-height: 86vh",
    "overflow-y: auto",
    ".form-panel__meta",
    ".form-panel__close",
  ];
  for (const snippet of requiredScssSnippets) {
    if (!scss.includes(snippet)) {
      throw new Error(`MINIAPP_ADDRESSES_PROTOTYPE_MISMATCH: missing ${snippet}`);
    }
  }

  return {
    hasBottomSheetModal: true,
    masksReceiverPhone: true,
  };
}

export async function runMiniappArtifactSmoke(options = {}) {
  const miniappDir = options.miniappDir ?? new URL("../apps/miniapp", import.meta.url).pathname;
  const repoDir = join(miniappDir, "../..");
  const projectConfig = assertMiniappProjectConfig(
    await readJson(join(miniappDir, "project.config.json")),
  );
  const figmaPrototypeRecord = assertMiniappFigmaPrototypeRecord(
    await readFile(join(repoDir, "docs/prototypes/figma-prototype.md"), "utf8"),
  );
  const figmaScreenshotPaths = EXPECTED_MINIAPP_FIGMA_SCREENSHOTS.map(
    (screenshot) => screenshot.path,
  );
  const figmaScreenshots = assertMiniappFigmaScreenshotArtifacts(
    await collectKnownFileSizes(repoDir, figmaScreenshotPaths),
    await collectPngDimensions(repoDir, figmaScreenshotPaths),
  );
  const distConfig = await readJson(join(miniappDir, "dist/project.config.json"));
  if (distConfig.miniprogramRoot !== "./") {
    throw new Error("MINIAPP_DIST_PROJECT_ROOT_MISMATCH: dist project root must be ./");
  }

  const files = await collectFileSizes(join(miniappDir, "dist"));
  const tabIconDimensions = await collectPngDimensions(
    join(miniappDir, "dist"),
    EXPECTED_MINIAPP_TAB_BAR_TABS.flatMap((tab) => [
      tab.iconPath,
      tab.selectedIconPath,
    ]),
  );
  const artifacts = assertMiniappPageArtifacts(files);
  const tabBar = assertMiniappTabBarContract(
    await readFile(join(miniappDir, "src/app.config.ts"), "utf8"),
  );
  const distTabBar = assertMiniappDistTabBarContract(
    await readJson(join(miniappDir, "dist/app.json")),
    files,
    tabIconDimensions,
  );
  const customTop = assertMiniappCustomTopConfig({
    addresses: await readFile(
      join(miniappDir, "src/pages/addresses/index.config.ts"),
      "utf8",
    ),
    home: await readFile(join(miniappDir, "src/pages/home/index.config.ts"), "utf8"),
    login: await readFile(join(miniappDir, "src/pages/login/index.config.ts"), "utf8"),
    me: await readFile(join(miniappDir, "src/pages/me/index.config.ts"), "utf8"),
    orders: await readFile(
      join(miniappDir, "src/pages/orders/index.config.ts"),
      "utf8",
    ),
    packages: await readFile(
      join(miniappDir, "src/pages/packages/index.config.ts"),
      "utf8",
    ),
  });
  const customTopSource = assertMiniappCustomTopSource({
    addresses: await readFile(
      join(miniappDir, "src/pages/addresses/index.tsx"),
      "utf8",
    ),
    component: await readFile(
      join(miniappDir, "src/components/mini-custom-top.tsx"),
      "utf8",
    ),
    home: await readFile(join(miniappDir, "src/pages/home/index.tsx"), "utf8"),
    login: await readFile(join(miniappDir, "src/pages/login/index.tsx"), "utf8"),
    me: await readFile(join(miniappDir, "src/pages/me/index.tsx"), "utf8"),
    orders: await readFile(join(miniappDir, "src/pages/orders/index.tsx"), "utf8"),
    packages: await readFile(
      join(miniappDir, "src/pages/packages/index.tsx"),
      "utf8",
    ),
  });
  const distAppJson = await readJson(join(miniappDir, "dist/app.json"));
  const distCustomTop = assertMiniappDistCustomTopConfig({
    addresses: await readJson(join(miniappDir, "dist/pages/addresses/index.json")),
    home: await readJson(join(miniappDir, "dist/pages/home/index.json")),
    login: await readJson(join(miniappDir, "dist/pages/login/index.json")),
    me: await readJson(join(miniappDir, "dist/pages/me/index.json")),
    orders: await readJson(join(miniappDir, "dist/pages/orders/index.json")),
    packages: await readJson(join(miniappDir, "dist/pages/packages/index.json")),
  }, distAppJson);
  const webviewNavigation = assertMiniappWebviewNavigationConfig(
    await readJson(join(miniappDir, "dist/pages/webview/index.json")),
  );
  const distCommonJs = await readTextFileIfExists(join(miniappDir, "dist/common.js"));
  const distCommonWxss = await readFile(join(miniappDir, "dist/common.wxss"), "utf8");
  const distRuntime = assertMiniappDistRuntimeStructure({
    commonWxss: distCommonWxss,
    pages: {
      home: {
        js: [
          await readFile(join(miniappDir, "dist/pages/home/index.js"), "utf8"),
          distCommonJs,
        ].join("\n"),
        wxss: [
          await readTextFileIfExists(join(miniappDir, "dist/pages/home/index.wxss")),
          distCommonWxss,
        ].join("\n"),
      },
      login: {
        js: await readFile(
          join(miniappDir, "dist/pages/login/index.js"),
          "utf8",
        ),
        wxss: await readFile(
          join(miniappDir, "dist/pages/login/index.wxss"),
          "utf8",
        ),
      },
      me: {
        js: await readFile(join(miniappDir, "dist/pages/me/index.js"), "utf8"),
        wxss: await readFile(
          join(miniappDir, "dist/pages/me/index.wxss"),
          "utf8",
        ),
      },
      orders: {
        js: await readFile(
          join(miniappDir, "dist/pages/orders/index.js"),
          "utf8",
        ),
        wxss: await readFile(
          join(miniappDir, "dist/pages/orders/index.wxss"),
          "utf8",
        ),
      },
      addresses: {
        js: await readFile(
          join(miniappDir, "dist/pages/addresses/index.js"),
          "utf8",
        ),
        wxss: await readFile(
          join(miniappDir, "dist/pages/addresses/index.wxss"),
          "utf8",
        ),
      },
      packages: {
        js: await readFile(
          join(miniappDir, "dist/pages/packages/index.js"),
          "utf8",
        ),
        wxss: await readFile(
          join(miniappDir, "dist/pages/packages/index.wxss"),
          "utf8",
        ),
      },
    },
  });
  const loginPrototype = assertMiniappLoginPrototypeSource({
    scss: await readFile(join(miniappDir, "src/pages/login/index.scss"), "utf8"),
    tsx: await readFile(join(miniappDir, "src/pages/login/index.tsx"), "utf8"),
  });
  const mePrototype = assertMiniappMePrototypeSource({
    scss: await readFile(join(miniappDir, "src/pages/me/index.scss"), "utf8"),
    tsx: await readFile(join(miniappDir, "src/pages/me/index.tsx"), "utf8"),
  });
  const packagesPrototype = assertMiniappPackagesPrototypeSource({
    scss: await readFile(
      join(miniappDir, "src/pages/packages/index.scss"),
      "utf8",
    ),
    tsx: await readFile(
      join(miniappDir, "src/pages/packages/index.tsx"),
      "utf8",
    ),
  });
  const homePrototype = assertMiniappHomePrototypeSource({
    scss: await readFile(join(miniappDir, "src/pages/home/index.scss"), "utf8"),
    tsx: await readFile(join(miniappDir, "src/pages/home/index.tsx"), "utf8"),
  });
  const ordersPrototype = assertMiniappOrdersPrototypeSource({
    lib: await readFile(join(miniappDir, "src/lib/orders.ts"), "utf8"),
    scss: await readFile(join(miniappDir, "src/pages/orders/index.scss"), "utf8"),
    tsx: await readFile(join(miniappDir, "src/pages/orders/index.tsx"), "utf8"),
  });
  const addressesPrototype = assertMiniappAddressesPrototypeSource({
    lib: await readFile(join(miniappDir, "src/lib/addresses.ts"), "utf8"),
    scss: await readFile(
      join(miniappDir, "src/pages/addresses/index.scss"),
      "utf8",
    ),
    tsx: await readFile(
      join(miniappDir, "src/pages/addresses/index.tsx"),
      "utf8",
    ),
  });

  return {
    addressesPrototype,
    artifacts,
    customTop,
    customTopSource,
    distCustomTop,
    distProjectRoot: distConfig.miniprogramRoot,
    distRuntime,
    distTabBar,
    figmaPrototypeRecord,
    figmaScreenshots,
    webviewNavigation,
    homePrototype,
    loginPrototype,
    mePrototype,
    ordersPrototype,
    packagesPrototype,
    projectConfig,
    tabBar,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runMiniappArtifactSmoke();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
