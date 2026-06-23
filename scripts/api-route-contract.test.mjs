import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = process.cwd();

const putCompatRoutes = [
  {
    contextParam: "adminUserId",
    file: "apps/admin-web/app/api/admin/admin-users/[adminUserId]/route.ts",
  },
  {
    contextParam: "dishId",
    file: "apps/admin-web/app/api/admin/dishes/[dishId]/route.ts",
  },
  {
    contextParam: "franchiseeId",
    file: "apps/admin-web/app/api/admin/franchisees/[franchiseeId]/route.ts",
  },
  {
    contextParam: "userId",
    file: "apps/admin-web/app/api/admin/members/[userId]/route.ts",
  },
  {
    contextParam: "orderId",
    file: "apps/admin-web/app/api/admin/orders/[orderId]/route.ts",
  },
  {
    contextParam: "templateId",
    file: "apps/admin-web/app/api/admin/package-templates/[templateId]/route.ts",
  },
  {
    contextParam: "storeId",
    file: "apps/admin-web/app/api/admin/stores/[storeId]/route.ts",
  },
  {
    file: "apps/admin-web/app/api/admin/system-settings/route.ts",
  },
  {
    contextParam: "taskId",
    file: "apps/admin-web/app/api/admin/tasks/[taskId]/route.ts",
  },
  {
    contextParam: "packageId",
    file: "apps/admin-web/app/api/admin/user-packages/[packageId]/route.ts",
  },
  {
    contextParam: "addressId",
    file: "apps/admin-web/app/api/v1/addresses/[addressId]/route.ts",
  },
];

function readProjectFile(file) {
  return readFileSync(join(ROOT, file), "utf8");
}

test("update routes keep PUT compatibility with the published API contract", () => {
  for (const route of putCompatRoutes) {
    const source = readProjectFile(route.file);
    assert.match(source, /export async function PATCH/, `${route.file} PATCH`);
    assert.match(source, /export async function PUT/, `${route.file} PUT`);

    const expectedDelegate = route.contextParam
      ? "return PATCH(request, context);"
      : "return PATCH(request);";
    assert.ok(
      source.includes(expectedDelegate),
      `${route.file} delegates PUT to PATCH`,
    );
  }
});

test("real-data smoke exercises spec PUT update routes instead of PATCH-only paths", () => {
  const source = readProjectFile("scripts/real-data-smoke.mjs");
  assert.doesNotMatch(source, /method: "PATCH"/);

  const requiredLabels = [
    "admin dish update",
    "admin franchisee update",
    "admin store update",
    "admin package template update",
    "admin task update",
    "admin user update",
    "admin member disable",
    "admin member enable",
    "admin user package adjust",
    "admin system settings update",
    "miniapp address update",
  ];

  for (const label of requiredLabels) {
    assert.ok(source.includes(label), `real-data smoke covers ${label}`);
  }
});
