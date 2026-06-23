import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ADMIN_RUNTIME_MODAL_TARGETS,
  ADMIN_RUNTIME_NAVIGATION_TARGETS,
  ADMIN_RUNTIME_SECTION_TARGETS,
  ADMIN_RUNTIME_VISUAL_TARGETS,
  assertAdminCollapsedSidebarLayout,
  assertAdminDraggedBox,
  assertAdminFullscreenBox,
  assertAdminGroupCollapsedLayout,
  assertAdminResizableStyle,
  detectChromeExecutable,
} from "./admin-runtime-visual-smoke.mjs";

test("admin runtime visual smoke covers the core shell, sections, and modal flows", () => {
  assert.deepEqual(
    ADMIN_RUNTIME_VISUAL_TARGETS.map((target) => target.name).slice(0, 3),
    ["login", "shell", "user-menu"],
  );
  assert.deepEqual(
    ADMIN_RUNTIME_NAVIGATION_TARGETS.map((target) => target.name),
    ["sidebar-collapsed", "system-menu-collapsed"],
  );
  assert.deepEqual(
    ADMIN_RUNTIME_SECTION_TARGETS.map((target) => target.section),
    [
      "overview",
      "orders",
      "shipment-stats",
      "members",
      "user-packages",
      "package-templates",
      "dishes",
      "stores",
      "franchisees",
      "tasks",
      "admin-users",
      "operation-logs",
      "system-settings",
    ],
  );
  assert.deepEqual(
    ADMIN_RUNTIME_MODAL_TARGETS.map((target) => target.name),
    [
      "order-modal",
      "member-modal",
      "user-package-modal",
      "template-modal",
      "dish-modal",
      "task-modal",
      "system-settings-modal",
    ],
  );
});

test("admin runtime targets carry visible text contracts", () => {
  for (const target of ADMIN_RUNTIME_VISUAL_TARGETS) {
    assert.ok(target.requiredTexts.length >= 3, target.name);
  }
});

test("admin runtime modal targets define a deterministic trigger", () => {
  for (const target of ADMIN_RUNTIME_MODAL_TARGETS) {
    assert.ok(target.section, target.name);
    assert.ok(target.triggerTitle || target.triggerText, target.name);
  }
});

test("detectChromeExecutable honors explicit env override", () => {
  assert.equal(
    detectChromeExecutable({
      candidates: [],
      env: { ADMIN_RUNTIME_CHROME_PATH: "/tmp/chrome" },
    }),
    "/tmp/chrome",
  );
});

test("detectChromeExecutable fails clearly when no browser is available", () => {
  assert.throws(
    () => detectChromeExecutable({ candidates: [], env: {} }),
    /ADMIN_RUNTIME_VISUAL_BROWSER_REQUIRED/,
  );
});

test("admin runtime modal interaction contracts catch fullscreen, drag and resize regressions", () => {
  assert.deepEqual(
    assertAdminFullscreenBox({
      box: { height: 960, width: 1400, x: 20, y: 20 },
    }),
    { fullscreen: true },
  );
  assert.deepEqual(
    assertAdminDraggedBox({
      after: { height: 640, width: 760, x: 420, y: 228 },
      before: { height: 640, width: 760, x: 340, y: 180 },
    }),
    { deltaX: 80, deltaY: 48 },
  );
  assert.deepEqual(assertAdminResizableStyle("both"), { resize: "both" });

  assert.throws(
    () =>
      assertAdminFullscreenBox({
        box: { height: 640, width: 760, x: 340, y: 180 },
      }),
    /ADMIN_RUNTIME_MODAL_FULLSCREEN_MISMATCH/,
  );
  assert.throws(
    () =>
      assertAdminDraggedBox({
        after: { height: 640, width: 760, x: 348, y: 184 },
        before: { height: 640, width: 760, x: 340, y: 180 },
      }),
    /ADMIN_RUNTIME_MODAL_DRAG_MISMATCH/,
  );
  assert.throws(
    () => assertAdminResizableStyle("none"),
    /ADMIN_RUNTIME_MODAL_RESIZE_MISMATCH/,
  );
});

test("admin runtime navigation interaction contracts catch sidebar and group regressions", () => {
  assert.deepEqual(
    assertAdminCollapsedSidebarLayout({
      contentPaddingLeft: 72,
      hiddenLabelCount: 0,
      sidebarBox: { height: 1000, width: 72, x: 0, y: 0 },
    }),
    {
      collapsed: true,
      contentPaddingLeft: 72,
      sidebarWidth: 72,
    },
  );
  assert.deepEqual(
    assertAdminGroupCollapsedLayout({
      hiddenChildCount: 0,
      visibleGroupCount: 1,
    }),
    {
      groupCollapsed: true,
      hiddenChildCount: 0,
      visibleGroupCount: 1,
    },
  );

  assert.throws(
    () =>
      assertAdminCollapsedSidebarLayout({
        contentPaddingLeft: 220,
        hiddenLabelCount: 1,
        sidebarBox: { height: 1000, width: 220, x: 0, y: 0 },
      }),
    /ADMIN_RUNTIME_SIDEBAR_COLLAPSE_MISMATCH/,
  );
  assert.throws(
    () =>
      assertAdminGroupCollapsedLayout({
        hiddenChildCount: 1,
        visibleGroupCount: 0,
      }),
    /ADMIN_RUNTIME_NAV_GROUP_COLLAPSE_MISMATCH/,
  );
});
