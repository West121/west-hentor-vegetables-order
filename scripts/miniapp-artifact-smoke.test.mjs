import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  EXPECTED_MINIAPP_TAB_BAR_TABS,
  REQUIRED_MINIAPP_PAGES,
  assertMiniappAddressesPrototypeSource,
  assertMiniappCustomTopConfig,
  assertMiniappCustomTopSource,
  assertMiniappDistCustomTopConfig,
  assertMiniappDistRuntimeStructure,
  assertMiniappDistTabBarContract,
  assertMiniappFigmaPrototypeRecord,
  assertMiniappFigmaScreenshotArtifacts,
  assertMiniappHomePrototypeSource,
  assertMiniappLoginPrototypeSource,
  assertMiniappMePrototypeSource,
  assertMiniappOrdersPrototypeSource,
  assertMiniappPackagesPrototypeSource,
  assertMiniappPageArtifacts,
  assertMiniappProjectConfig,
  assertMiniappTabBarContract,
  assertMiniappWebviewNavigationConfig,
} from "./miniapp-artifact-smoke.mjs";

test("miniapp Taro configs expose configurable dish grid columns with three as default", () => {
  const devConfig = readFileSync(
    new URL("../apps/miniapp/config/dev.ts", import.meta.url),
    "utf8",
  );
  const prodConfig = readFileSync(
    new URL("../apps/miniapp/config/prod.ts", import.meta.url),
    "utf8",
  );

  for (const config of [devConfig, prodConfig]) {
    assert.match(config, /TARO_APP_HOME_DISH_COLUMNS:\s*JSON\.stringify/);
    assert.match(config, /process\.env\.TARO_APP_HOME_DISH_COLUMNS\s*\?\?\s*"3"/);
  }
});

const miniappPrototypeScopeFixture = `
## 当前原型范围
- 03 小程序 / 首页（预订）
- 04 小程序 / 提交与修改确认
- 05 小程序 / 订单
- 06 小程序 / 我的
- 07 小程序 / 地址管理
- 08 小程序 / 登录
- 11 小程序 / 套餐
- 12 小程序 / 修改已预订内容
- 13 小程序 / 首页（无套餐）
`;

test("miniapp Figma record includes core prototype scope and linked nodes", () => {
  assert.deepEqual(
    assertMiniappFigmaPrototypeRecord(`${miniappPrototypeScopeFixture}
[03 小程序 / 首页（有套餐）](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=89-2)
[04 小程序 / 提交与修改确认](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=36-2)
[05 小程序 / 订单](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=3-443)
[06 小程序 / 我的](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=36-3)
[07 小程序 / 地址管理](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=144-2)
[08 小程序 / 登录](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=15-42)
[11 小程序 / 套餐](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=36-4)
[12 小程序 / 修改已预订内容](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=36-5)
[13 小程序 / 首页（无套餐）](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=100-2)
`),
    {
      linkedFrames: [
        "03 小程序 / 首页（有套餐）",
        "04 小程序 / 提交与修改确认",
        "05 小程序 / 订单",
        "06 小程序 / 我的",
        "07 小程序 / 地址管理",
        "08 小程序 / 登录",
        "11 小程序 / 套餐",
        "12 小程序 / 修改已预订内容",
        "13 小程序 / 首页（无套餐）",
      ],
      linkedNodes: [
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
      ],
      scopeFrames: [
        "03 小程序 / 首页（预订）",
        "04 小程序 / 提交与修改确认",
        "05 小程序 / 订单",
        "06 小程序 / 我的",
        "07 小程序 / 地址管理",
        "08 小程序 / 登录",
        "11 小程序 / 套餐",
        "12 小程序 / 修改已预订内容",
        "13 小程序 / 首页（无套餐）",
      ],
      hasFullMiniappNodeTraceability: true,
    },
  );

  assert.throws(
    () =>
      assertMiniappFigmaPrototypeRecord(`
[03 小程序 / 首页（有套餐）](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=89-2)
[04 小程序 / 提交与修改确认](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=36-2)
[05 小程序 / 订单](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=3-443)
[06 小程序 / 我的](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=36-3)
[07 小程序 / 地址管理](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=144-2)
[08 小程序 / 登录](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=15-42)
[11 小程序 / 套餐](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=36-4)
[12 小程序 / 修改已预订内容](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=36-5)
[13 小程序 / 首页（无套餐）](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=100-2)
`),
    /MINIAPP_FIGMA_PROTOTYPE_SCOPE_MISSING/,
  );

  assert.throws(
    () =>
      assertMiniappFigmaPrototypeRecord(`${miniappPrototypeScopeFixture}
[03 小程序 / 首页（有套餐）](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=89-2)
[04 小程序 / 提交与修改确认](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=36-2)
[05 小程序 / 订单](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=3-443)
[06 小程序 / 我的](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=36-3)
[13 小程序 / 首页（无套餐）](https://www.figma.com/design/O2IXF7XWERtVJfRT7lUYo3?node-id=100-2)
`),
    /MINIAPP_FIGMA_LINKED_NODE_MISSING/,
  );
});

test("miniapp Figma screenshots are captured for visual comparison baselines", () => {
  const screenshots = [
    [
      "docs/prototypes/figma-screenshots/03-miniapp-home-with-package.png",
      { height: 844, width: 450 },
    ],
    [
      "docs/prototypes/figma-screenshots/04-miniapp-submit-confirm.png",
      { height: 844, width: 390 },
    ],
    [
      "docs/prototypes/figma-screenshots/05-miniapp-orders.png",
      { height: 844, width: 390 },
    ],
    [
      "docs/prototypes/figma-screenshots/06-miniapp-me.png",
      { height: 844, width: 390 },
    ],
    [
      "docs/prototypes/figma-screenshots/07-miniapp-addresses.png",
      { height: 844, width: 390 },
    ],
    [
      "docs/prototypes/figma-screenshots/08-miniapp-login.png",
      { height: 844, width: 390 },
    ],
    [
      "docs/prototypes/figma-screenshots/11-miniapp-packages.png",
      { height: 844, width: 390 },
    ],
    [
      "docs/prototypes/figma-screenshots/12-miniapp-edit-reservation.png",
      { height: 844, width: 390 },
    ],
    [
      "docs/prototypes/figma-screenshots/13-miniapp-home-no-package.png",
      { height: 844, width: 450 },
    ],
  ];
  const files = new Map(screenshots.map(([path]) => [path, 2048]));
  const dimensions = new Map(screenshots);

  assert.deepEqual(assertMiniappFigmaScreenshotArtifacts(files, dimensions), {
    screenshots: screenshots.map(([path, size]) => ({
      height: size.height,
      path,
      width: size.width,
    })),
  });

  assert.throws(
    () => assertMiniappFigmaScreenshotArtifacts(new Map(), dimensions),
    /MINIAPP_FIGMA_SCREENSHOT_MISSING/,
  );

  assert.throws(
    () =>
      assertMiniappFigmaScreenshotArtifacts(
        files,
        new Map([
          ...screenshots.slice(0, -1),
          [
            "docs/prototypes/figma-screenshots/13-miniapp-home-no-package.png",
            { height: 844, width: 390 },
          ],
        ]),
      ),
    /MINIAPP_FIGMA_SCREENSHOT_DIMENSION_MISMATCH/,
  );
});

test("assertMiniappProjectConfig requires opening the source project with dist root", () => {
  assert.deepEqual(
    assertMiniappProjectConfig({
      appid: "wx165126960d67638f",
      miniprogramRoot: "dist",
    }),
    {
      appid: "wx165126960d67638f",
      miniprogramRoot: "dist",
    },
  );

  assert.throws(
    () => assertMiniappProjectConfig({ appid: "demo", miniprogramRoot: "./" }),
    /MINIAPP_PROJECT_ROOT_MISMATCH/,
  );
});

test("assertMiniappPageArtifacts checks js, wxml and page-appropriate wxss for required pages", () => {
  const files = new Map([
    ["pages/home/index.js", 100],
    ["pages/home/index.wxml", 100],
    ["pages/home/index.wxss", 1200],
    ["pages/webview/index.js", 100],
    ["pages/webview/index.wxml", 100],
    ["pages/webview/index.wxss", 24],
  ]);

  assert.deepEqual(
    assertMiniappPageArtifacts(files, [
      "pages/home/index",
      "pages/webview/index",
    ]),
    {
      pages: ["pages/home/index", "pages/webview/index"],
    },
  );

  assert.throws(
    () => assertMiniappPageArtifacts(new Map(), ["pages/home/index"]),
    /MINIAPP_ARTIFACT_MISSING/,
  );
  assert.throws(
    () =>
      assertMiniappPageArtifacts(
        new Map([
          ["pages/home/index.js", 100],
          ["pages/home/index.wxml", 100],
          ["pages/home/index.wxss", 4],
        ]),
        ["pages/home/index"],
      ),
    /MINIAPP_WXSS_TOO_SMALL/,
  );
});

test("required miniapp pages keep login, home, me and secondary pages covered", () => {
  assert.deepEqual(REQUIRED_MINIAPP_PAGES, [
    "pages/home/index",
    "pages/me/index",
    "pages/addresses/index",
    "pages/orders/index",
    "pages/packages/index",
    "pages/login/index",
    "pages/webview/index",
  ]);
});

test("miniapp tab bar keeps reservation on home and secondary pages under me", () => {
  assert.deepEqual(
    assertMiniappTabBarContract(`
export default defineAppConfig({
  tabBar: {
    list: [
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
    ],
  },
});
`),
    {
      tabs: EXPECTED_MINIAPP_TAB_BAR_TABS,
    },
  );

  assert.throws(
    () =>
      assertMiniappTabBarContract(`
export default defineAppConfig({
  tabBar: {
    list: [
      { pagePath: "pages/home/index", text: "首页" },
      { pagePath: "pages/orders/index", text: "订单" },
      { pagePath: "pages/packages/index", text: "套餐" },
      { pagePath: "pages/me/index", text: "我的" },
    ],
  },
});
`),
    /MINIAPP_TAB_BAR_CONTRACT_MISMATCH/,
  );
});

test("miniapp built app.json keeps tab bar icons available to WeChat devtools", () => {
  const iconFiles = new Map(
    EXPECTED_MINIAPP_TAB_BAR_TABS.flatMap((tab) => [
      [tab.iconPath, 128],
      [tab.selectedIconPath, 128],
    ]),
  );

  assert.deepEqual(
    assertMiniappDistTabBarContract(
      {
        tabBar: {
          list: EXPECTED_MINIAPP_TAB_BAR_TABS,
        },
      },
      iconFiles,
      new Map(
        EXPECTED_MINIAPP_TAB_BAR_TABS.flatMap((tab) => [
          [tab.iconPath, { height: 81, width: 81 }],
          [tab.selectedIconPath, { height: 81, width: 81 }],
        ]),
      ),
    ),
    {
      tabs: EXPECTED_MINIAPP_TAB_BAR_TABS,
    },
  );

  assert.throws(
    () =>
      assertMiniappDistTabBarContract(
        {
          tabBar: {
            list: EXPECTED_MINIAPP_TAB_BAR_TABS.map((tab) =>
              tab.pagePath === "pages/home/index"
                ? { ...tab, selectedIconPath: undefined }
                : tab,
            ),
          },
        },
        iconFiles,
      ),
    /MINIAPP_DIST_TAB_BAR_MISMATCH/,
  );

  assert.throws(
    () =>
      assertMiniappDistTabBarContract(
        {
          tabBar: {
            list: EXPECTED_MINIAPP_TAB_BAR_TABS,
          },
        },
        new Map(),
      ),
    /MINIAPP_DIST_TAB_ICON_MISSING/,
  );

  assert.throws(
    () =>
      assertMiniappDistTabBarContract(
        {
          tabBar: {
            list: EXPECTED_MINIAPP_TAB_BAR_TABS,
          },
        },
        iconFiles,
        new Map([["assets/tabbar/home-default.png", { height: 96, width: 96 }]]),
      ),
    /MINIAPP_DIST_TAB_ICON_SIZE_MISMATCH/,
  );
});

test("miniapp home, me and login pages use a custom top area", () => {
  assert.deepEqual(
    assertMiniappCustomTopConfig({
      addresses: 'export default definePageConfig({ navigationStyle: "custom" });',
      home: 'export default definePageConfig({ navigationStyle: "custom" });',
      login: 'export default definePageConfig({ navigationStyle: "custom" });',
      me: 'export default definePageConfig({ navigationStyle: "custom" });',
      orders: 'export default definePageConfig({ navigationStyle: "custom" });',
      packages: 'export default definePageConfig({ navigationStyle: "custom" });',
    }),
    { customPages: ["home", "me", "login", "orders", "packages", "addresses"] },
  );

  assert.throws(
    () =>
      assertMiniappCustomTopConfig({
        addresses:
          'export default definePageConfig({ navigationStyle: "custom" });',
        home: 'export default definePageConfig({ navigationBarTitleText: "首页" });',
        login: 'export default definePageConfig({ navigationStyle: "custom" });',
        me: 'export default definePageConfig({ navigationStyle: "custom" });',
        orders: 'export default definePageConfig({ navigationStyle: "custom" });',
        packages:
          'export default definePageConfig({ navigationStyle: "custom" });',
      }),
    /MINIAPP_CUSTOM_TOP_MISMATCH/,
  );

  assert.throws(
    () =>
      assertMiniappCustomTopConfig({
        addresses:
          'export default definePageConfig({ navigationStyle: "custom" });',
        home: 'export default definePageConfig({ navigationStyle: "custom", navigationBarTitleText: "首页" });',
        login: 'export default definePageConfig({ navigationStyle: "custom" });',
        me: 'export default definePageConfig({ navigationStyle: "custom" });',
        orders: 'export default definePageConfig({ navigationStyle: "custom" });',
        packages:
          'export default definePageConfig({ navigationStyle: "custom" });',
      }),
    /MINIAPP_CUSTOM_TOP_MISMATCH/,
  );
});

test("miniapp home, me and login pages render the shared custom top component", () => {
  assert.deepEqual(
    assertMiniappCustomTopSource({
      addresses:
        '<MiniCustomTop back className="addresses__custom-top" title="地址管理" />',
      component: `
        Taro.getWindowInfo();
        Taro.getMenuButtonBoundingClientRect?.();
        const paddingTop = 22;
        const capsuleWidth = 96;
        <View className="mini-custom-top__capsule-space" />
        <Text className="mini-custom-top__back" />
      `,
      home: '<MiniCustomTop className="home__custom-top" />',
      login:
        '<MiniCustomTop back className="login__custom-top" onBack={goBack} />',
      me: '<MiniCustomTop className="profile-hero__top" dark />',
      orders: '<MiniCustomTop back className="orders__custom-top" title="订单" />',
      packages:
        '<MiniCustomTop back className="packages__custom-top" title="套餐" />',
    }),
    {
      renderedPages: ["home", "me", "login", "orders", "packages", "addresses"],
      titlelessPages: ["home", "me", "login"],
    },
  );

  assert.throws(
    () =>
      assertMiniappCustomTopSource({
        addresses:
          '<MiniCustomTop back className="addresses__custom-top" title="地址管理" />',
        component: '<View className="mini-custom-top__capsule-space" />',
        home: '<MiniCustomTop className="home__custom-top" />',
        login:
          '<MiniCustomTop back className="login__custom-top" onBack={goBack} />',
        me: '<MiniCustomTop className="profile-hero__top" dark />',
        orders:
          '<MiniCustomTop back className="orders__custom-top" title="订单" />',
        packages:
          '<MiniCustomTop back className="packages__custom-top" title="套餐" />',
      }),
    /MINIAPP_CUSTOM_TOP_SOURCE_MISMATCH/,
  );

  assert.throws(
    () =>
      assertMiniappCustomTopSource({
        addresses:
          '<MiniCustomTop back className="addresses__custom-top" title="地址管理" />',
        component: `
          <View className="mini-custom-top__capsule-space" />
          <Text className="mini-custom-top__back" />
        `,
        home: '<View />',
        login:
          '<MiniCustomTop back className="login__custom-top" onBack={goBack} />',
        me: '<MiniCustomTop className="profile-hero__top" dark />',
        orders:
          '<MiniCustomTop back className="orders__custom-top" title="订单" />',
        packages:
          '<MiniCustomTop back className="packages__custom-top" title="套餐" />',
      }),
    /MINIAPP_CUSTOM_TOP_SOURCE_MISMATCH/,
  );

  assert.throws(
    () =>
      assertMiniappCustomTopSource({
        addresses:
          '<MiniCustomTop back className="addresses__custom-top" title="地址管理" />',
        component: `
          Taro.getWindowInfo();
          Taro.getMenuButtonBoundingClientRect?.();
          const paddingTop = 22;
          const capsuleWidth = 96;
          <View className="mini-custom-top__capsule-space" />
          <Text className="mini-custom-top__back" />
        `,
        home: '<MiniCustomTop className="home__custom-top" title="首页" />',
        login:
          '<MiniCustomTop back className="login__custom-top" onBack={goBack} />',
        me: '<MiniCustomTop className="profile-hero__top" dark />',
        orders:
          '<MiniCustomTop back className="orders__custom-top" title="订单" />',
        packages:
          '<MiniCustomTop back className="packages__custom-top" title="套餐" />',
      }),
    /MINIAPP_CUSTOM_TOP_TITLE_MISMATCH/,
  );

  assert.throws(
    () =>
      assertMiniappCustomTopSource({
        addresses:
          '<MiniCustomTop back className="addresses__custom-top" title="地址管理" />',
        component: `
          Taro.getWindowInfo();
          Taro.getMenuButtonBoundingClientRect?.();
          const paddingTop = 22;
          const capsuleWidth = 96;
          <View className="mini-custom-top__capsule-space" />
          <Text className="mini-custom-top__back" />
        `,
        home: '<MiniCustomTop className="home__custom-top" />',
        login:
          '<MiniCustomTop back className="login__custom-top" title="账号登录" onBack={goBack} />',
        me: '<MiniCustomTop className="profile-hero__top" dark />',
        orders:
          '<MiniCustomTop back className="orders__custom-top" title="订单" />',
        packages:
          '<MiniCustomTop back className="packages__custom-top" title="套餐" />',
      }),
    /MINIAPP_CUSTOM_TOP_TITLE_MISMATCH/,
  );
});

test("miniapp built page json keeps custom top without native titles", () => {
  assert.deepEqual(
    assertMiniappDistCustomTopConfig({
      addresses: { navigationStyle: "custom" },
      home: { navigationStyle: "custom" },
      login: { navigationStyle: "custom" },
      me: { navigationStyle: "custom" },
      orders: { navigationStyle: "custom" },
      packages: { navigationStyle: "custom" },
    }, { window: { navigationStyle: "custom" } }),
    {
      customPages: ["home", "me", "login", "orders", "packages", "addresses"],
      globalCustomNavigation: true,
    },
  );

  assert.deepEqual(
    assertMiniappDistCustomTopConfig({
      addresses: { navigationStyle: "custom" },
      home: { navigationStyle: "custom" },
      login: { navigationStyle: "custom" },
      me: { navigationStyle: "custom" },
      orders: { navigationStyle: "custom" },
      packages: { navigationStyle: "custom" },
    }),
    {
      customPages: ["home", "me", "login", "orders", "packages", "addresses"],
      globalCustomNavigation: undefined,
    },
  );

  assert.throws(
    () =>
      assertMiniappDistCustomTopConfig(
        {
          addresses: { navigationStyle: "custom" },
          home: { navigationStyle: "custom" },
          login: { navigationStyle: "custom" },
          me: { navigationStyle: "custom" },
          orders: { navigationStyle: "custom" },
          packages: { navigationStyle: "custom" },
        },
        { window: { navigationStyle: "default" } },
      ),
    /MINIAPP_DIST_CUSTOM_TOP_GLOBAL_MISMATCH/,
  );

  assert.throws(
    () =>
      assertMiniappDistCustomTopConfig(
        {
          addresses: { navigationStyle: "custom" },
          home: { navigationStyle: "custom" },
          login: { navigationStyle: "custom" },
          me: { navigationStyle: "custom" },
          orders: { navigationStyle: "custom" },
          packages: { navigationStyle: "custom" },
        },
        {
          window: {
            navigationBarTitleText: "首页",
            navigationStyle: "custom",
          },
        },
      ),
    /MINIAPP_DIST_CUSTOM_TOP_GLOBAL_TITLE_MISMATCH/,
  );

  assert.throws(
    () =>
      assertMiniappDistCustomTopConfig({
        addresses: { navigationStyle: "custom" },
        home: { navigationStyle: "custom", navigationBarTitleText: "首页" },
        login: { navigationStyle: "custom" },
        me: { navigationStyle: "custom" },
        orders: { navigationStyle: "custom" },
        packages: { navigationStyle: "custom" },
      }),
    /MINIAPP_DIST_CUSTOM_TOP_TITLE_MISMATCH/,
  );
});

test("miniapp built runtime keeps custom top, tab pages and login visual styles", () => {
  assert.deepEqual(
    assertMiniappDistRuntimeStructure({
      commonWxss: `
.mini-custom-top {}
.mini-custom-top__back {}
.mini-custom-top__capsule-space {}
`,
      pages: {
        home: {
          js: `
home__custom-top
package-card__stats
dish-grid--cols-
summary__address
reservation-confirm
address-switch-modal
`,
          wxss: `
.home__custom-top {}
.package-card__cutoff {}
.package-card__stats {}
.dish-grid--cols-3 {}
.dish-card__image {}
.summary__address {}
.reservation-confirm {}
.address-switch-modal {}
`,
        },
        login: {
          js: `
login__custom-top
login__mark-image
login__brand-name
getPhoneNumber
login__agreement
`,
          wxss: `
.login__custom-top {}
.login__mark {}
.login__mark-image {}
.login__button {}
.login__agreement {}
`,
        },
        me: {
          js: `
profile-hero__top
profile-hero__image
member-card__usage
today-card
service-grid
recent-card
`,
          wxss: `
.profile-hero {}
.profile-hero__top {}
.member-card {}
.member-card__usage {}
.service-grid {}
.service-item__icon--order {}
.recent-card {}
`,
        },
        orders: {
          js: `
orders__custom-top
order-tabs__item--active
order__status--pending
order__status--shipped
order__status--signed
order__status--canceled
order__button--primary
order__button--danger
`,
          wxss: `
.orders__custom-top {}
.order-tabs {}
.order-tabs__item--active {}
.order__status--pending {}
.order__status--shipped {}
.order__status--signed {}
.order__status--canceled {}
.order__button {}
`,
        },
        addresses: {
          js: `
addresses__custom-top
address-card__detail
address-card__action--danger
address-form-modal__mask
form-panel__handle
form-panel__close
field--switch
default-status
`,
          wxss: `
.addresses__custom-top {}
.address-card {}
.address-card__tag {}
.address-card__action--danger {}
.address-form-modal {}
.address-form-modal__mask {}
.form-panel__handle {}
.form-panel__close {}
`,
        },
        packages: {
          js: `
packages__custom-top
hero-card__photo
benefit-card__dot--orange
cycle-card__track
payment-reserve__button
payment-reserve__button--disabled
`,
          wxss: `
.packages__custom-top {}
.hero-card {}
.hero-card__photo {}
.benefit-grid {}
.cycle-card {}
.primary-button {}
.payment-reserve {}
.payment-reserve__button--disabled {}
`,
        },
      },
    }),
    {
      hasCommonCustomTop: true,
      pages: ["home", "login", "me", "orders", "addresses", "packages"],
    },
  );

  assert.throws(
    () =>
      assertMiniappDistRuntimeStructure({
        commonWxss: ".mini-custom-top {}",
        pages: {},
      }),
    /MINIAPP_DIST_RUNTIME_MISMATCH/,
  );
});

test("miniapp webview page keeps native navigation for agreement pages", () => {
  assert.deepEqual(
    assertMiniappWebviewNavigationConfig({
      navigationBarTitleText: "协议详情",
      navigationStyle: "default",
    }),
    {
      hasNativeNavigation: true,
      title: "协议详情",
    },
  );

  assert.throws(
    () =>
      assertMiniappWebviewNavigationConfig({
        navigationBarTitleText: "协议详情",
        navigationStyle: "custom",
      }),
    /MINIAPP_WEBVIEW_NAVIGATION_MISMATCH/,
  );
  assert.throws(
    () =>
      assertMiniappWebviewNavigationConfig({
        navigationBarTitleText: "用户协议",
        navigationStyle: "default",
      }),
    /MINIAPP_WEBVIEW_TITLE_MISMATCH/,
  );
});

test("miniapp login keeps a vegetable visual, one phone login action and bottom agreements", () => {
  assert.deepEqual(
    assertMiniappLoginPrototypeSource({
      scss: `
.login__custom-top {}
.login__brand { flex: 1; }
.login__mark {}
.login__mark-image {}
.login__brand-name {}
.login__actions { margin-top: auto; }
.login__button {}
.login__agreement {
  margin-top: auto;
}
`,
      tsx: `
import loginVegetablesImage from "../../assets/login-vegetables.jpg";
<MiniCustomTop back className="login__custom-top" onBack={goBack} />
<Image className="login__mark-image" src={loginVegetablesImage} />
<View>Hentor Fresh</View>
<View>社区鲜蔬会员</View>
<Button openType="getPhoneNumber">立即登录</Button>
<View className="login__agreement">我已阅读《用户协议》和《隐私政策》</View>
`,
    }),
    {
      hasAgreement: true,
      hasPhoneLogin: true,
      hasVegetableImage: true,
    },
  );

  assert.throws(
    () =>
      assertMiniappLoginPrototypeSource({
        scss: ".login__scene {}",
        tsx: `
<Button openType="getPhoneNumber">手机号快捷登录</Button>
<View>暂无套餐，购买套餐入口已预留</View>
`,
      }),
    /MINIAPP_LOGIN_PROTOTYPE_MISMATCH/,
  );
});

test("miniapp me page keeps order and package as secondary entries", () => {
  assert.deepEqual(
    assertMiniappMePrototypeSource({
      scss: `
.me {
  background: linear-gradient(180deg, #073f25 0, #073f25 286px, #f5faf2 286px, #f5faf2 100%);
  padding: 0 16px 96px;
}
.profile-hero {
  margin: 0 -16px;
  min-height: 286px;
  padding: 0 20px;
}
.profile-hero__image {
  border-radius: 14px;
  height: 72px;
  right: 20px;
  top: 84px;
  width: 104px;
}
.member-card {
  border-radius: 18px;
  margin-top: -92px;
  padding: 18px;
}
.member-card__usage {}
.member-card__progress {
  height: 5px;
  width: 210px;
}
.current-store-card {
  border-radius: 14px;
  margin-top: 14px;
  min-height: 78px;
}
.current-store-card__icon {}
.current-store-card__name {}
.current-store-card__action {}
.service-card {
  margin-top: 24px;
}
.service-card::before {
  content: "常用服务";
}
.service-grid {
  gap: 12px 31px;
  grid-template-columns: repeat(3, 96px);
  justify-content: space-between;
}
.service-item {
  height: 82px;
  width: 96px;
}
.service-item__icon {}
.service-item__icon--order {}
.service-item__icon--edit {}
.service-item__icon--pin {}
.service-item__icon--phone {}
.service-item__icon--card {}
.service-item__icon--user {}
.recent-card {}
`,
      tsx: `
import loginVegetablesImage from "../../assets/login-vegetables.jpg";
import { getOrderStatusLabel, getPackageUsageStats, getTodayOrderMeta } from "../../lib/me";
<View className="profile-hero"></View>
<Text>查看套餐</Text>
<View>{pendingOrder ? "今日已预订" : "今日未预订"}</View>
<View>{pendingOrder ? "去修改" : "去预订"}</View>
Taro.showActionSheet({ itemList: ["用户协议", "隐私政策", "账号注销"] });
Taro.showActionSheet({ itemList: ["切换门店", "用户协议", "隐私政策", "账号注销"] });
openStoreSwitchSheet();
async function loadStores() {
  await Taro.request({ url: "/api/v1/stores/current" });
}
shouldShowStoreSwitcher(storeData?.stores ?? []);
getStoreSwitchToast(nextStore.name);
storeData.stores.map((store) => store.name);
await Taro.request({ url: "/api/v1/stores/switch" });
Taro.setStorageSync("mini_session_token", nextToken);
Taro.setStorageSync(ACTIVE_STORE_CODE_KEY, nextStore.code);
Taro.removeStorageSync("editing_order_id");
await loadMe();
<View className="member-card"></View>
<View className="member-card__usage"></View>
<View className="today-card"></View>
<View className="current-store-card"></View>
<View className="current-store-card__name">当前只有一家可用门店</View>
<View className="current-store-card__action">切换门店</View>
<View className="service-card"></View>
<View className="service-grid"></View>
<View className={"service-item__icon service-item__icon--order"}></View>
getTodayOrderMeta(pendingOrder, cutoffTime);
getOrderStatusLabel(latestOrder.status);
Taro.navigateTo({ url: "/pages/orders/index" });
Taro.navigateTo({ url: "/pages/packages/index" });
label: "订单";
label: "修改预订";
label: "地址管理";
label: "联系客服";
label: "套餐";
label: "账号设置";
<View className="recent-card"></View>
`,
    }),
    {
      hasCustomerServiceEntry: true,
      hasEditReservationEntry: true,
      hasOrdersEntry: true,
      hasPackagesEntry: true,
      hasStoreSwitchFlow: true,
      heroHeight: 286,
      heroImageHeight: 72,
      heroImageWidth: 104,
      memberCardOverlap: -92,
      serviceItemHeight: 82,
      serviceItemWidth: 96,
    },
  );

  assert.throws(
    () =>
      assertMiniappMePrototypeSource({
        scss: ".profile-hero {} .entry {}",
        tsx: '<View className="entry__main">地址管理</View>',
      }),
    /MINIAPP_ME_PROTOTYPE_MISMATCH/,
  );

  assert.throws(
    () =>
      assertMiniappMePrototypeSource({
        scss: `
.me {
  background: linear-gradient(180deg, #073f25 0, #073f25 286px, #f5faf2 286px, #f5faf2 100%);
  padding: 0 16px 96px;
}
.profile-hero {
  margin: 0 -16px;
  min-height: 286px;
  padding: 0 20px;
}
.profile-hero__image {
  border-radius: 14px;
  height: 72px;
  right: 20px;
  top: 84px;
  width: 104px;
}
.member-card {
  border-radius: 18px;
  margin-top: -92px;
  padding: 18px;
}
.member-card__usage {}
.member-card__progress {
  height: 5px;
  width: 210px;
}
.current-store-card {
  border-radius: 14px;
  margin-top: 14px;
  min-height: 78px;
}
.current-store-card__icon {}
.current-store-card__name {}
.current-store-card__action {}
.service-card {
  margin-top: 24px;
}
.service-card::before {
  content: "常用服务";
}
.service-grid {
  gap: 12px 31px;
  grid-template-columns: repeat(3, 96px);
  justify-content: space-between;
}
.service-item {
  height: 82px;
  width: 96px;
}
.service-item__icon {}
.service-item__icon--order {}
.service-item__icon--edit {}
.service-item__icon--pin {}
.service-item__icon--phone {}
.service-item__icon--card {}
.service-item__icon--user {}
.recent-card {}
`,
        tsx: `
import loginVegetablesImage from "../../assets/login-vegetables.jpg";
import { getOrderStatusLabel, getPackageUsageStats, getTodayOrderMeta } from "../../lib/me";
<View className="profile-hero"></View>
<Text>查看套餐</Text>
<View>{pendingOrder ? "今日已预订" : "今日未预订"}</View>
<View>{pendingOrder ? "去修改" : "去预订"}</View>
Taro.showActionSheet({ itemList: ["切换门店", "用户协议", "隐私政策", "账号注销"] });
openStoreSwitchSheet();
async function loadStores() {
  await Taro.request({ url: "/api/v1/stores/current" });
}
shouldShowStoreSwitcher(storeData?.stores ?? []);
getStoreSwitchToast(nextStore.name);
storeData.stores.map((store) => store.name);
await Taro.request({ url: "/api/v1/stores/switch" });
Taro.setStorageSync("mini_session_token", nextToken);
Taro.setStorageSync(ACTIVE_STORE_CODE_KEY, nextStore.code);
Taro.removeStorageSync("editing_order_id");
await loadMe();
<View className="member-card"></View>
<View className="member-card__usage"></View>
<View className="today-card"></View>
<View className="current-store-card"></View>
<View className="current-store-card__name">当前只有一家可用门店</View>
<View className="current-store-card__action">切换门店</View>
<View className="service-card"></View>
<View className="service-grid"></View>
<View className={"service-item__icon service-item__icon--order"}></View>
getTodayOrderMeta(pendingOrder, cutoffTime);
getOrderStatusLabel(latestOrder.status);
Taro.navigateTo({ url: "/pages/orders/index" });
Taro.navigateTo({ url: "/pages/packages/index" });
label: "订单";
label: "地址管理";
label: "修改预订";
label: "联系客服";
label: "套餐";
label: "账号设置";
<View className="recent-card"></View>
`,
      }),
    /MINIAPP_ME_SERVICE_ORDER_MISMATCH/,
  );

  assert.throws(
    () =>
      assertMiniappMePrototypeSource({
        scss: `
.me {
  background: linear-gradient(180deg, #073f25 0, #073f25 286px, #f5faf2 286px, #f5faf2 100%);
  padding: 0 16px 96px;
}
.profile-hero {
  margin: 0 -16px;
  min-height: 286px;
  padding: 0 20px;
}
.profile-hero__image {
  border-radius: 14px;
  height: 72px;
  right: 20px;
  top: 84px;
  width: 104px;
}
.member-card {
  border-radius: 18px;
  margin-top: -92px;
  padding: 18px;
}
.member-card__usage {}
.member-card__progress {
  height: 5px;
  width: 210px;
}
.current-store-card {
  border-radius: 14px;
  margin-top: 14px;
  min-height: 78px;
}
.current-store-card__icon {}
.current-store-card__name {}
.current-store-card__action {}
.service-card {
  margin-top: 24px;
}
.service-card::before {
  content: "常用服务";
}
.service-grid {
  gap: 12px 31px;
  grid-template-columns: repeat(3, 96px);
  justify-content: space-between;
}
.service-item {
  height: 82px;
  width: 96px;
}
.service-item__icon {}
.service-item__icon--order {}
.service-item__icon--edit {}
.service-item__icon--pin {}
.service-item__icon--phone {}
.service-item__icon--card {}
.service-item__icon--user {}
.recent-card {}
`,
        tsx: `
import loginVegetablesImage from "../../assets/login-vegetables.jpg";
import { getOrderStatusLabel, getPackageUsageStats, getTodayOrderMeta } from "../../lib/me";
<View className="profile-hero"></View>
<Text>查看套餐</Text>
<View>{pendingOrder ? "今日已预订" : "今日未预订"}</View>
<View>{pendingOrder ? "去修改" : "去预订"}</View>
Taro.showActionSheet({ itemList: ["用户协议", "隐私政策", "账号注销"] });
Taro.showActionSheet({ itemList: ["切换门店", "用户协议", "隐私政策", "账号注销"] });
openStoreSwitchSheet();
async function loadStores() {
  await Taro.request({ url: "/api/v1/stores/current" });
}
shouldShowStoreSwitcher(storeData?.stores ?? []);
getStoreSwitchToast(nextStore.name);
storeData.stores.map((store) => store.name);
await Taro.request({ url: "/api/v1/stores/switch" });
Taro.setStorageSync("mini_session_token", nextToken);
Taro.setStorageSync(ACTIVE_STORE_CODE_KEY, nextStore.code);
await loadMe();
<View className="member-card"></View>
<View className="member-card__usage"></View>
<View className="today-card"></View>
<View className="current-store-card"></View>
<View className="current-store-card__name">当前只有一家可用门店</View>
<View className="current-store-card__action">切换门店</View>
<View className="service-card"></View>
<View className="service-grid"></View>
<View className={"service-item__icon service-item__icon--order"}></View>
getTodayOrderMeta(pendingOrder, cutoffTime);
getOrderStatusLabel(latestOrder.status);
Taro.navigateTo({ url: "/pages/orders/index" });
Taro.navigateTo({ url: "/pages/packages/index" });
label: "订单";
label: "修改预订";
label: "地址管理";
label: "联系客服";
label: "套餐";
label: "账号设置";
<View className="recent-card"></View>
`,
      }),
    /MINIAPP_ME_PROTOTYPE_MISMATCH: missing Taro\.removeStorageSync\("editing_order_id"\)/,
  );
});

test("miniapp packages page keeps the Figma benefits layout and payment reserve", () => {
  assert.deepEqual(
    assertMiniappPackagesPrototypeSource({
      scss: `
.hero-card {}
.hero-card__photo {}
.benefit-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.cycle-card {}
.primary-button {}
.payment-reserve {}
.payment-reserve__button {}
`,
      tsx: `
import loginVegetablesImage from "../../assets/login-vegetables.jpg";
import { getCurrentPackageItem, getPackageHeroView } from "../../lib/packages";
<View className="hero-card">Hentor Fresh</View>
<View>套餐权益</View>
<View className="benefit-grid"></View>
<View className="cycle-card">本周期用量</View>
<Text>去首页预订</Text>
<View className="payment-reserve">购买/续费套餐</View>
reservePurchase(purchaseTemplate.id);
`,
    }),
    {
      hasBenefitGrid: true,
      hasPaymentReserve: true,
    },
  );

  assert.throws(
    () =>
      assertMiniappPackagesPrototypeSource({
        scss: ".package-card__numbers {} .reserve__item {}",
        tsx: "<View>剩余次数</View><View>单次额度</View>",
      }),
    /MINIAPP_PACKAGES_PROTOTYPE_MISMATCH/,
  );

  assert.throws(
    () =>
      assertMiniappPackagesPrototypeSource({
        scss: `
.hero-card {}
.hero-card__photo {}
.benefit-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.cycle-card {}
.primary-button {}
.payment-reserve {}
.payment-reserve__button {}
`,
        tsx: `
import loginVegetablesImage from "../../assets/login-vegetables.jpg";
import { getCurrentPackageItem, getPackageHeroView } from "../../lib/packages";
<View className="hero-card">Hentor Fresh</View>
<Text>更多功能</Text>
<View>更多功能暂未开放</View>
<View>套餐权益</View>
<View className="benefit-grid"></View>
<View className="cycle-card">本周期用量</View>
<Text>去首页预订</Text>
<View className="payment-reserve">购买/续费套餐</View>
reservePurchase(purchaseTemplate.id);
`,
      }),
    /MINIAPP_PACKAGES_PROTOTYPE_MISMATCH/,
  );
});

test("home source keeps the Figma grid prototype contract", () => {
  assert.deepEqual(
    assertMiniappHomePrototypeSource({
      scss: `
.home {
  padding: 0 20px 112px;
}
.dish-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.dish-grid--cols-2 {}
.dish-grid--cols-3 {}
.dish-grid--cols-4 {}
.package-card {
  min-height: 126px;
  position: relative;
}
.package-card__cutoff {
  position: absolute;
  right: 18px;
  top: 14px;
}
.summary__address {}
.summary__address-action {
  white-space: nowrap;
}
.summary__body {}
.address-switch-modal {}
.address-switch-modal__mask {}
.address-switch-panel {}
.address-switch-panel__handle {}
.address-switch-panel__add {}
.address-option {}
.dish-card {
  width: 100%;
  height: 132px;
  border: 2px solid #dceed7;
  border-radius: 22px;
}
.dish-grid--cols-3 .dish-card {
  height: 132px;
  padding: 10px 6px 6px;
}
.dish-grid--cols-3 .dish-card__media,
.dish-grid--cols-3 .dish-card__image {
  height: 42px;
  width: 60px;
}
.dish-grid--cols-3 .dish-card__name {
  line-height: 22px;
  margin-top: 5px;
}
.dish-grid--cols-3 .dish-card__actions {
  margin-top: 6px;
}
.dish-grid--cols-3 .step-btn {
  height: 26px;
}
.dish-card__weight {
  white-space: nowrap;
}
.package-card__stats {
  display: grid;
}
.package-card__stat-value {
  font-size: 30px;
}
.package-card--empty {}
.package-card__empty-title {}
.package-card__empty-meta {}
.package-card__empty-reserve {}
.package-card__edit {
  display: flex;
}
.package-card__edit-badge {}
.package-card__edit-exit {}
.reservation-confirm {}
.confirm-summary {}
.confirm-changes {}
.confirm-address {}
.confirm-notice {}
.confirm-primary {}
.summary {
  bottom: 10px;
  left: 16px;
  right: 16px;
}
.summary__submit {
  height: 42px;
  min-width: 118px;
}
`,
      tsx: `
const HOME_DISH_COLUMNS = process.env.TARO_APP_HOME_DISH_COLUMNS;
getPackageUsageProgressPercent({});
getReservationConfirmView({});
buildSetDefaultAddressUrl({});
formatAddressReceiverLine({});
buildReservationEditConfirmContent({
  originalItems: editableCurrentOrder?.items,
});
const isEditingCurrentOrder = true;

reservationGate.hideSubmitButton;
const confirmationView = {};
async function confirmSubmitOrder() {}
const addressSwitchOpen = true;
const selectedAddress = {};
const reservationReceiver = {
  name: selectedAddress?.receiverName ?? (reservationAddress.source === "currentOrder" ? currentOrderName : defaultName),
};
async function loadAddressItems() {}
async function selectReservationAddress() {}
function openCreateAddressFromSwitch() {}
<View className="dish-grid" />
<View className={"dish-grid dish-grid--cols-" + HOME_DISH_COLUMNS} />
<View className="dish-card__actions" />
<Image className="dish-card__image" />
<Text className="package-card__cutoff" />
<View className="package-card__stats" />
<Text className="package-card__stat-value">{packageTotalTimes}</Text>
<View className="package-card package-card--empty" />
<View className="package-card__empty-title">暂不能下单</View>
<View className="package-card__empty-meta">{reservationGate.emptyMessage}</View>
<View className="package-card__empty-reserve">微信支付入口已预留</View>
<View className="package-card__edit">
  <Text className="package-card__edit-badge">修改中</Text>
  <Text className="package-card__edit-exit" onClick={exitEditing}>退出</Text>
</View>
getDishFallbackImageKey("菠菜");
<View className="summary" />
<View className="summary__address" />
<Text className="summary__address-detail">{reservationAddress.detail}</Text>
<Text className="summary__address-action">{reservationAddress.id ? "切换" : "新增地址"}</Text>
<View className="address-switch-modal" />
<View className="address-switch-modal__mask" />
<View className="address-switch-panel" />
<Text className="address-option__tag">选择</Text>
<Text>保存修改</Text>
<View>{confirmationView.title}</View>
<Text>{confirmationView.secondaryText}</Text>
`,
    }),
    {
      cardContentFreeSpacePx: 15,
      cardHeight: 132,
      defaultColumns: 3,
      imageHeight: 42,
      imageWidth: 60,
      packageCardMinHeight: 126,
      summaryBottomPx: 10,
      summaryLeftPx: 16,
      summaryRightPx: 16,
      summarySubmitHeightPx: 42,
      summarySubmitMinWidthPx: 118,
    },
  );

  assert.throws(
    () =>
      assertMiniappHomePrototypeSource({
        scss: ".category-list {} .dish-card { width: 100%; }",
        tsx: '<View className="summary">剩余 {summary.remainingWeightJin}</View>',
      }),
    /MINIAPP_HOME_OLD_CATEGORY_LAYOUT|MINIAPP_HOME_GRID_PROTOTYPE_MISMATCH|MINIAPP_HOME_REPEATED_REMAINING_WEIGHT/,
  );

  assert.throws(
    () =>
      assertMiniappHomePrototypeSource({
        scss: `
.home {
  padding: 0 20px 112px;
}
.dish-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.dish-grid--cols-2 {}
.dish-grid--cols-3 {}
.dish-grid--cols-4 {}
.package-card {
  min-height: 126px;
  position: relative;
}
.package-card__cutoff {
  position: absolute;
  right: 18px;
  top: 14px;
}
.summary__address {}
.summary__address-action {
  white-space: nowrap;
}
.summary__body {}
.address-switch-modal {}
.address-switch-modal__mask {}
.address-switch-panel {}
.address-switch-panel__handle {}
.address-switch-panel__add {}
.address-option {}
.dish-card {
  width: 100%;
  height: 132px;
  border: 2px solid #dceed7;
  border-radius: 22px;
}
.dish-grid--cols-3 .dish-card {
  height: 132px;
  padding: 10px 6px 6px;
}
.dish-grid--cols-3 .dish-card__media,
.dish-grid--cols-3 .dish-card__image {
  height: 36px;
}
.dish-grid--cols-3 .dish-card__name {
  line-height: 22px;
  margin-top: 5px;
}
.dish-grid--cols-3 .dish-card__actions {
  margin-top: 6px;
}
.dish-grid--cols-3 .step-btn {
  height: 26px;
}
.dish-card__weight {
  white-space: nowrap;
}
.package-card__stats {
  display: grid;
}
.package-card__stat-value {
  font-size: 30px;
}
.package-card--empty {}
.package-card__empty-title {}
.package-card__empty-meta {}
.package-card__empty-reserve {}
.package-card__edit {
  display: flex;
}
.package-card__edit-badge {}
.package-card__edit-exit {}
.reservation-confirm {}
.confirm-summary {}
.confirm-changes {}
.confirm-address {}
.confirm-notice {}
.confirm-primary {}
.summary {
  bottom: 10px;
  left: 16px;
  right: 16px;
}
.summary__submit {
  height: 42px;
  min-width: 118px;
}
`,
        tsx: `
const HOME_DISH_COLUMNS = process.env.TARO_APP_HOME_DISH_COLUMNS;
getPackageUsageProgressPercent({});
getReservationConfirmView({});
buildSetDefaultAddressUrl({});
formatAddressReceiverLine({});
buildReservationEditConfirmContent({
  originalItems: editableCurrentOrder?.items,
});
const isEditingCurrentOrder = true;
reservationGate.hideSubmitButton;
const confirmationView = {};
async function confirmSubmitOrder() {}
const addressSwitchOpen = true;
const selectedAddress = {};
const reservationReceiver = {
  name: selectedAddress?.receiverName ?? (reservationAddress.source === "currentOrder" ? currentOrderName : defaultName),
};
async function loadAddressItems() {}
async function selectReservationAddress() {}
function openCreateAddressFromSwitch() {}
<View className="dish-grid" />
<View className={"dish-grid dish-grid--cols-" + HOME_DISH_COLUMNS} />
<View className="dish-card__actions" />
<Image className="dish-card__image" />
<Text className="package-card__cutoff" />
<View className="package-card__stats" />
<Text className="package-card__stat-value">{packageTotalTimes}</Text>
<View className="package-card package-card--empty" />
<View className="package-card__empty-title">暂不能下单</View>
<View className="package-card__empty-meta">{reservationGate.emptyMessage}</View>
<View className="package-card__empty-reserve">微信支付入口已预留</View>
<View className="package-card__edit">
  <Text className="package-card__edit-badge">修改中</Text>
  <Text className="package-card__edit-exit" onClick={exitEditing}>退出</Text>
</View>
getDishFallbackImageKey("菠菜");
<View>每次最多 {packageInfo.weightLimitJin}斤</View>
<View>已选 {summary.totalWeightJin} / {packageInfo.weightLimitJin}斤</View>
<Image className="package-card__visual-image" />
<View className="summary" />
<View className="summary__address" />
<Text className="summary__address-detail">{reservationAddress.detail}</Text>
<Text className="summary__address-action">{reservationAddress.id ? "切换" : "新增地址"}</Text>
<View className="address-switch-modal" />
<View className="address-switch-modal__mask" />
<View className="address-switch-panel" />
<Text className="address-option__tag">选择</Text>
<Text>保存修改</Text>
<View>{confirmationView.title}</View>
<Text>{confirmationView.secondaryText}</Text>
`,
      }),
    /MINIAPP_HOME_PACKAGE_CARD_REPEATS_SELECTED_WEIGHT/,
  );

  assert.throws(
    () =>
      assertMiniappHomePrototypeSource({
        scss: `
.home {
  padding: 0 20px 112px;
}
.dish-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.dish-grid--cols-2 {}
.dish-grid--cols-3 {}
.dish-grid--cols-4 {}
.package-card {
  min-height: 126px;
  position: relative;
}
.package-card__cutoff {
  position: absolute;
  right: 18px;
  top: 14px;
}
.summary__address {}
.summary__address-action {
  white-space: nowrap;
}
.summary__body {}
.address-switch-modal {}
.address-switch-modal__mask {}
.address-switch-panel {}
.address-switch-panel__handle {}
.address-switch-panel__add {}
.address-option {}
.dish-card {
  width: 100%;
  height: 132px;
  border: 2px solid #dceed7;
  border-radius: 22px;
}
.dish-grid--cols-3 .dish-card {
  height: 132px;
  padding: 10px 6px 6px;
}
.dish-grid--cols-3 .dish-card__media,
.dish-grid--cols-3 .dish-card__image {
  height: 42px;
  width: 60px;
}
.dish-grid--cols-3 .dish-card__name {
  line-height: 22px;
  margin-top: 5px;
}
.dish-grid--cols-3 .dish-card__actions {
  margin-top: 6px;
}
.dish-grid--cols-3 .step-btn {
  height: 26px;
}
.dish-card__weight {
  white-space: nowrap;
}
.package-card__stats {
  display: grid;
}
.package-card__stat-value {
  font-size: 30px;
}
.package-card--empty {}
.package-card__empty-title {}
.package-card__empty-meta {}
.package-card__empty-reserve {}
.package-card__edit {
  display: flex;
}
.package-card__edit-badge {}
.package-card__edit-exit {}
.reservation-confirm {}
.reservation-confirm__status {}
.confirm-summary {}
.confirm-changes {}
.confirm-address {}
.confirm-notice {}
.confirm-primary {}
.summary {
  bottom: 10px;
  left: 16px;
  right: 16px;
}
.summary__submit {
  height: 42px;
  min-width: 118px;
}
`,
        tsx: `
const HOME_DISH_COLUMNS = process.env.TARO_APP_HOME_DISH_COLUMNS;
getPackageUsageProgressPercent({});
getReservationConfirmView({});
buildSetDefaultAddressUrl({});
formatAddressReceiverLine({});
buildReservationEditConfirmContent({
  originalItems: editableCurrentOrder?.items,
});
const isEditingCurrentOrder = true;
reservationGate.hideSubmitButton;
const confirmationView = {};
async function confirmSubmitOrder() {}
const addressSwitchOpen = true;
const selectedAddress = {};
const reservationReceiver = {
  name: selectedAddress?.receiverName ?? (reservationAddress.source === "currentOrder" ? currentOrderName : defaultName),
};
async function loadAddressItems() {}
async function selectReservationAddress() {}
function openCreateAddressFromSwitch() {}
<View className="dish-grid" />
<View className={"dish-grid dish-grid--cols-" + HOME_DISH_COLUMNS} />
<View className="dish-card__actions" />
<Image className="dish-card__image" />
<Text className="package-card__cutoff" />
<View className="package-card__stats" />
<Text className="package-card__stat-value">{packageTotalTimes}</Text>
<View className="package-card package-card--empty" />
<View className="package-card__empty-title">暂不能下单</View>
<View className="package-card__empty-meta">{reservationGate.emptyMessage}</View>
<View className="package-card__empty-reserve">微信支付入口已预留</View>
<View className="package-card__edit">
  <Text className="package-card__edit-badge">修改中</Text>
  <Text className="package-card__edit-exit" onClick={exitEditing}>退出</Text>
</View>
getDishFallbackImageKey("菠菜");
<View className="summary" />
<View className="summary__address" />
<Text className="summary__address-detail">{reservationAddress.detail}</Text>
<Text className="summary__address-action">{reservationAddress.id ? "切换" : "新增地址"}</Text>
<View className="address-switch-modal" />
<View className="address-switch-modal__mask" />
<View className="address-switch-panel" />
<Text className="address-option__tag">选择</Text>
<View className="reservation-confirm__status">9:41</View>
<View className="reservation-confirm__menu">•• ○</View>
<Text>保存修改</Text>
<View>{confirmationView.title}</View>
<Text>{confirmationView.secondaryText}</Text>
`,
      }),
    /MINIAPP_HOME_CONFIRMATION_DUPLICATES_WECHAT_TOP/,
  );
});

test("miniapp orders page keeps the Figma four-tab card prototype", () => {
  assert.deepEqual(
    assertMiniappOrdersPrototypeSource({
      lib: `
export const ORDER_STATUS_TABS = [
  { key: "PENDING_SHIPMENT", label: "待发货" },
  { key: "SHIPPED", label: "已发货" },
  { key: "SIGNED", label: "已签收" },
  { key: "CANCELED", label: "已取消" },
];
`,
      scss: `
.orders {
  background: #f8fbf6;
}
.orders__custom-top {}
.order-tabs {
  grid-template-columns: repeat(4, 1fr);
}
.order {
  border-radius: 16px;
  min-height: 138px;
}
.order__status--pending {}
.order__status--shipped {}
.order__status--signed {}
.order__status--canceled {}
.order__button {
  height: 36px;
  width: 92px;
}
`,
      tsx: `
filterOrdersByStatus([], activeStatus);
ORDER_STATUS_TABS.map((tab) => tab.label);
<MiniCustomTop back className="orders__custom-top" title="订单" />
async function openPendingActions(orderId: string) {
  Taro.showActionSheet({ itemList: ["取消预订", "修改预订"] });
}
function copyLogisticsNo(logisticsNo: string | null) {
  Taro.setClipboardData({
    data: logisticsNo,
  });
}
order.status === "SHIPPED" && order.logisticsNo;
copyLogisticsNo(order.logisticsNo);
order.status === "CANCELED" || order.status === "VOIDED";
void hideOrder(order.id);
<Text>可取消</Text>
<Text>复制运单</Text>
<Text>删除</Text>
`,
    }),
    {
      hasCanceledHideAction: true,
      hasFourStatusTabs: true,
      hasLogisticsClipboardAction: true,
      hasPendingActionSheet: true,
    },
  );

  assert.throws(
    () =>
      assertMiniappOrdersPrototypeSource({
        lib: 'export const ORDER_STATUS_TABS = [{ key: "ALL", label: "全部" }];',
        scss: ".order__weight {}",
        tsx: '<Text className="header__refresh">刷新</Text>',
      }),
    /MINIAPP_ORDERS_PROTOTYPE_MISMATCH/,
  );

  assert.throws(
    () =>
      assertMiniappOrdersPrototypeSource({
        lib: `
export const ORDER_STATUS_TABS = [
  { key: "PENDING_SHIPMENT", label: "待发货" },
  { key: "SHIPPED", label: "已发货" },
  { key: "SIGNED", label: "已签收" },
  { key: "CANCELED", label: "已取消" },
];
`,
        scss: `
.orders { background: #f8fbf6; }
.orders__custom-top {}
.order-tabs { grid-template-columns: repeat(4, 1fr); }
.order { border-radius: 16px; min-height: 138px; }
.order__status--pending {}
.order__status--shipped {}
.order__status--signed {}
.order__status--canceled {}
.order__button { height: 36px; width: 92px; }
`,
        tsx: `
filterOrdersByStatus([], activeStatus);
ORDER_STATUS_TABS.map((tab) => tab.label);
<MiniCustomTop back className="orders__custom-top" title="订单" />
async function openPendingActions(orderId: string) {
  Taro.showActionSheet({ itemList: ["取消预订", "修改预订"] });
}
function copyLogisticsNo(logisticsNo: string | null) {}
order.status === "SHIPPED" && order.logisticsNo;
copyLogisticsNo(order.logisticsNo);
order.status === "CANCELED" || order.status === "VOIDED";
void hideOrder(order.id);
<Text>可取消</Text>
<Text>复制运单</Text>
<Text>删除</Text>
`,
      }),
    /MINIAPP_ORDERS_PROTOTYPE_MISMATCH: missing Taro\.setClipboardData/,
  );
});

test("miniapp addresses page uses a bottom sheet form and masked receiver phone", () => {
  assert.deepEqual(
    assertMiniappAddressesPrototypeSource({
      lib: `
export function maskReceiverPhone() {}
export function formatAddressReceiverLine() {}
export function buildAddressSubmitPayload() {}
export function buildSetDefaultAddressUrl() {}
export function buildAddressResourceUrl() {}
export function buildAddressResourceUrl() {}
`,
      scss: `
.address-form-modal {}
.address-form-modal__mask {
  background: rgb(7 20 12 / 40%);
}
.form-panel {
  max-height: 86vh;
  overflow-y: auto;
}
.form-panel__handle {}
.form-panel__meta {}
.form-panel__close {}
`,
      tsx: `
formatAddressReceiverLine(item);
function closeForm() {}
<View className="address-form-modal" />
<View className="address-form-modal__mask" />
<View className="form-panel__handle" />
<View className="form-panel__meta" />
setDefaultAddress(item);
deleteAddress(item);
buildSetDefaultAddressUrl({});
buildAddressSubmitPayload({});
buildAddressResourceUrl({});
Taro.request({
  method: editing ? "PUT" : "POST",
  url: editing
    ? buildAddressResourceUrl({ addressId: editing.id, apiBaseUrl: API_BASE_URL })
    : "/api/v1/addresses",
});
`,
    }),
    {
      hasBottomSheetModal: true,
      masksReceiverPhone: true,
    },
  );

  assert.throws(
    () =>
      assertMiniappAddressesPrototypeSource({
        lib: "export function buildAddressSubmitPayload() {}",
        scss: ".form-panel {}",
        tsx: "{item.receiverName} {item.receiverPhone}",
      }),
    /MINIAPP_ADDRESSES_PROTOTYPE_MISMATCH/,
  );

  assert.throws(
    () =>
      assertMiniappAddressesPrototypeSource({
        lib: `
export function maskReceiverPhone() {}
export function formatAddressReceiverLine() {}
export function buildAddressSubmitPayload() {}
export function buildSetDefaultAddressUrl() {}
`,
        scss: `
.address-form-modal {}
.address-form-modal__mask {
  background: rgb(7 20 12 / 40%);
}
.form-panel {
  max-height: 86vh;
  overflow-y: auto;
}
.form-panel__handle {}
.form-panel__meta {}
.form-panel__close {}
`,
        tsx: `
formatAddressReceiverLine(item);
function closeForm() {}
<View className="address-form-modal" />
<View className="address-form-modal__mask" />
<View className="form-panel__handle" />
<View className="form-panel__meta" />
setDefaultAddress(item);
deleteAddress(item);
buildSetDefaultAddressUrl({});
buildAddressSubmitPayload({});
buildAddressResourceUrl({});
Taro.request({
  method: editing ? "PATCH" : "POST",
  url: editing
    ? buildAddressResourceUrl({ addressId: editing.id, apiBaseUrl: API_BASE_URL })
    : "/api/v1/addresses",
});
`,
      }),
    /MINIAPP_ADDRESSES_PROTOTYPE_MISMATCH: missing method: editing \? "PUT" : "POST"/,
  );
});
