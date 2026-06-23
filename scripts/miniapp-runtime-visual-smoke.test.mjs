import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  assertRuntimeLayoutContract,
  assertRuntimeScreenshotContract,
  createMiniSessionToken,
  ensureNoPackageMiniSession,
  getMiniSessionSecret,
  loadSeedEditableOrder,
  readPngDimensionsFromBuffer,
  RUNTIME_VISUAL_TARGETS,
} from "./miniapp-runtime-visual-smoke.mjs";

function box(selector, { height, left, top, width }) {
  return {
    height,
    left,
    selector,
    top,
    width,
  };
}

test("runtime visual targets cover the core miniapp Figma pages", () => {
  assert.deepEqual(
    RUNTIME_VISUAL_TARGETS.map((target) => target.name),
    [
      "login",
      "home",
      "submitConfirm",
      "homeNoPackage",
      "editReservation",
      "orders",
      "addresses",
      "packages",
      "me",
    ],
  );
  assert.equal(RUNTIME_VISUAL_TARGETS[1].session, true);
  assert.equal(RUNTIME_VISUAL_TARGETS[2].action, "openSubmitConfirm");
  assert.equal(RUNTIME_VISUAL_TARGETS[3].sessionKind, "noPackage");
  assert.equal(RUNTIME_VISUAL_TARGETS[4].editingOrder, true);
  assert.equal(RUNTIME_VISUAL_TARGETS.at(-1).session, true);
});

test("runtime visual targets bind to distinct Figma screenshot baselines", () => {
  const figmaPaths = new Set(RUNTIME_VISUAL_TARGETS.map((target) => target.figmaPath));
  assert.equal(figmaPaths.size, RUNTIME_VISUAL_TARGETS.length);
  assert.ok(
    RUNTIME_VISUAL_TARGETS.some((target) =>
      target.figmaPath.endsWith("04-miniapp-submit-confirm.png"),
    ),
  );
  assert.ok(
    RUNTIME_VISUAL_TARGETS.some((target) =>
      target.figmaPath.endsWith("12-miniapp-edit-reservation.png"),
    ),
  );
  assert.ok(
    RUNTIME_VISUAL_TARGETS.some((target) =>
      target.figmaPath.endsWith("13-miniapp-home-no-package.png"),
    ),
  );
});

test("runtime visual DB helpers fail clearly without DATABASE_URL", async () => {
  const envDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  await assert.rejects(
    () => ensureNoPackageMiniSession({ rootDir: "/tmp/not-used" }),
    /MINIAPP_RUNTIME_VISUAL_DB_REQUIRED/,
  );
  await assert.rejects(
    () => loadSeedEditableOrder({ rootDir: "/tmp/not-used" }),
    /MINIAPP_RUNTIME_VISUAL_DB_REQUIRED/,
  );

  if (envDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = envDatabaseUrl;
  }
});

test("mini session secret follows backend fallback order", () => {
  assert.equal(
    getMiniSessionSecret({ ADMIN_SESSION_SECRET: "admin-secret" }),
    "admin-secret",
  );
  assert.equal(
    getMiniSessionSecret({
      ADMIN_SESSION_SECRET: "admin-secret",
      MINI_SESSION_SECRET: "mini-secret",
    }),
    "mini-secret",
  );
});

test("mini session token is signed as payload.signature", () => {
  const token = createMiniSessionToken(
    {
      issuedAt: 1,
      openid: "openid-1",
      storeId: "store-1",
      userId: "user-1",
    },
    "secret",
  );

  const [payload, signature] = token.split(".");
  assert.ok(payload);
  assert.ok(signature);
  assert.match(payload, /^[A-Za-z0-9_-]+$/);
  assert.match(signature, /^[A-Za-z0-9_-]+$/);
});

test("reads figma PNG dimensions", async () => {
  const buffer = await readFile(
    "docs/prototypes/figma-screenshots/08-miniapp-login.png",
  );

  assert.deepEqual(readPngDimensionsFromBuffer(buffer), {
    height: 844,
    width: 390,
  });
});

test("accepts 2x runtime screenshots against 390x844 figma frames", () => {
  const viewport = assertRuntimeScreenshotContract({
    figmaDimensions: { height: 844, width: 390 },
    name: "login",
    runtimeDimensions: { height: 1688, width: 780 },
  });

  assert.equal(viewport.scale, 2);
});

test("accepts figma home screenshots with shadow overflow width", () => {
  assert.doesNotThrow(() =>
    assertRuntimeScreenshotContract({
      figmaDimensions: { height: 844, width: 450 },
      name: "home",
      runtimeDimensions: { height: 1688, width: 780 },
    }),
  );
});

test("rejects screenshots that do not match the miniapp viewport", () => {
  assert.throws(
    () =>
      assertRuntimeScreenshotContract({
        figmaDimensions: { height: 844, width: 390 },
        name: "bad",
        runtimeDimensions: { height: 1200, width: 780 },
      }),
    /MINIAPP_RUNTIME_VISUAL_MISMATCH/,
  );
});

test("runtime layout contract keeps the home Figma hierarchy anchored", () => {
  assert.deepEqual(
    assertRuntimeLayoutContract({
      name: "home",
      boxes: {
        ".home__custom-top": box(".home__custom-top", {
          height: 91,
          left: 0,
          top: 0,
          width: 390,
        }),
        ".package-card": box(".package-card", {
          height: 131,
          left: 20,
          top: 101,
          width: 350,
        }),
        ".dish-grid": box(".dish-grid", {
          height: 440,
          left: 20,
          top: 292,
          width: 350,
        }),
        ".dish-card": box(".dish-card", {
          height: 137,
          left: 20,
          top: 292,
          width: 110,
        }),
        ".summary": box(".summary", {
          height: 132,
          left: 16,
          top: 622,
          width: 358,
        }),
        ".summary__address": box(".summary__address", {
          height: 49,
          left: 30,
          top: 634,
          width: 330,
        }),
      },
    }),
    { checked: true, name: "home" },
  );
});

test("runtime layout contract catches a floating home summary that is too high", () => {
  assert.throws(
    () =>
      assertRuntimeLayoutContract({
        name: "home",
        boxes: {
          ".home__custom-top": box(".home__custom-top", {
            height: 91,
            left: 0,
            top: 0,
            width: 390,
          }),
          ".package-card": box(".package-card", {
            height: 131,
            left: 20,
            top: 101,
            width: 350,
          }),
          ".dish-grid": box(".dish-grid", {
            height: 440,
            left: 20,
            top: 292,
            width: 350,
          }),
          ".dish-card": box(".dish-card", {
            height: 137,
            left: 20,
            top: 292,
            width: 110,
          }),
          ".summary": box(".summary", {
            height: 132,
            left: 16,
            top: 520,
            width: 358,
          }),
        },
      }),
    /MINIAPP_RUNTIME_LAYOUT_MISMATCH: home summary y/,
  );
});

test("runtime layout contract keeps login and me page sections in order", () => {
  assert.equal(
    assertRuntimeLayoutContract({
      name: "login",
      boxes: {
        ".login__custom-top": box(".login__custom-top", {
          height: 91,
          left: 0,
          top: 0,
          width: 390,
        }),
        ".login__mark": box(".login__mark", {
          height: 153,
          left: 118.5,
          top: 170,
          width: 153,
        }),
        ".login__button": box(".login__button", {
          height: 64,
          left: 29,
          top: 664,
          width: 332,
        }),
        ".login__agreement": box(".login__agreement", {
          height: 44,
          left: 29,
          top: 757,
          width: 332,
        }),
      },
    }).checked,
    true,
  );

  assert.equal(
    assertRuntimeLayoutContract({
      name: "me",
      boxes: {
        ".profile-hero__top": box(".profile-hero__top", {
          height: 91,
          left: 0,
          top: 0,
          width: 390,
        }),
        ".profile-hero": box(".profile-hero", {
          height: 297,
          left: 0,
          top: 0,
          width: 390,
        }),
        ".member-card": box(".member-card", {
          height: 145,
          left: 16,
          top: 202,
          width: 358,
        }),
        ".today-card": box(".today-card", {
          height: 99,
          left: 16,
          top: 365,
          width: 358,
        }),
        ".service-card": box(".service-card", {
          height: 218,
          left: 16,
          top: 488,
          width: 358,
        }),
        ".service-grid": box(".service-grid", {
          height: 182,
          left: 16,
          top: 524,
          width: 358,
        }),
        ".recent-card": box(".recent-card", {
          height: 97,
          left: 16,
          top: 724,
          width: 358,
        }),
      },
    }).checked,
    true,
  );
});

test("runtime layout contract covers the submit confirmation overlay", () => {
  assert.equal(
    assertRuntimeLayoutContract({
      name: "submitConfirm",
      boxes: {
        ".reservation-confirm": box(".reservation-confirm", {
          height: 844,
          left: 0,
          top: 0,
          width: 390,
        }),
        ".reservation-confirm__title": box(".reservation-confirm__title", {
          height: 31,
          left: 20,
          top: 58,
          width: 350,
        }),
        ".confirm-summary": box(".confirm-summary", {
          height: 132,
          left: 20,
          top: 127,
          width: 350,
        }),
        ".confirm-changes": box(".confirm-changes", {
          height: 164,
          left: 20,
          top: 279,
          width: 350,
        }),
        ".confirm-address": box(".confirm-address", {
          height: 92,
          left: 20,
          top: 463,
          width: 350,
        }),
        ".confirm-primary": box(".confirm-primary", {
          height: 48,
          left: 20,
          top: 694,
          width: 350,
        }),
        ".confirm-secondary": box(".confirm-secondary", {
          height: 42,
          left: 20,
          top: 752,
          width: 350,
        }),
      },
    }).checked,
    true,
  );
});
