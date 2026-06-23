import assert from "node:assert/strict";
import { test } from "node:test";

import {
  REQUIRED_FILE_GROUPS,
  REQUIRED_SOURCE_SNIPPETS,
  runCompletionAudit,
} from "./completion-audit.mjs";

test("completion audit covers the requested delivery surface", () => {
  assert.ok(
    REQUIRED_FILE_GROUPS.adminApiRoutes.includes(
      "apps/admin-web/app/api/admin/orders/[orderId]/void/route.ts",
    ),
  );
  assert.ok(
    REQUIRED_FILE_GROUPS.miniappApiRoutes.includes(
      "apps/admin-web/app/api/v1/package-purchases/[purchaseId]/wechat-prepay/route.ts",
    ),
  );
  assert.ok(
    REQUIRED_FILE_GROUPS.miniappPages.includes(
      "apps/miniapp/src/assets/tabbar/home-active.png",
    ),
  );
  assert.ok(
    REQUIRED_SOURCE_SNIPPETS["scripts/real-data-smoke.mjs"].includes(
      "checkMiniappWxPhoneLoginWithStub",
    ),
  );
  assert.ok(
    REQUIRED_SOURCE_SNIPPETS["scripts/admin-runtime-visual-smoke.mjs"].includes(
      "system-menu-collapsed",
    ),
  );
});

test("completion audit passes against the current workspace", async () => {
  const result = await runCompletionAudit();

  assert.equal(result.ok, true);
  assert.equal(result.groups.adminApiRoutes.checked, 36);
  assert.equal(result.groups.miniappApiRoutes.checked, 18);
  assert.equal(result.groups.figmaScreenshots.checked, 15);
  assert.ok(result.sourceContracts >= 7);
});
