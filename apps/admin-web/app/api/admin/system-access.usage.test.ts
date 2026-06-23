import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readAdminRoute(path: string) {
  return readFileSync(join(process.cwd(), "app/api/admin", path), "utf8");
}

function expectSystemPermissionBefore(
  source: string,
  nextCall: string,
) {
  expect(source).toContain("getPermissionFailure(");
  expect(source).toContain('"system.manage"');
  expect(source.indexOf("getPermissionFailure(")).toBeLessThan(
    source.indexOf(nextCall),
  );
}

describe("system management route access checks", () => {
  it("requires system permission before listing and creating roles", () => {
    const source = readAdminRoute("roles/route.ts");
    const getBody = source.slice(
      source.indexOf("export async function GET"),
      source.indexOf("export async function POST"),
    );
    const postBody = source.slice(source.indexOf("export async function POST"));

    expectSystemPermissionBefore(getBody, "listAdminRoles(");
    expectSystemPermissionBefore(postBody, "createAdminRole(");
  });

  it("requires system permission before updating a role", () => {
    expectSystemPermissionBefore(
      readAdminRoute("roles/[roleId]/route.ts"),
      "updateAdminRole(",
    );
  });

  it("requires system permission before listing operation logs", () => {
    expectSystemPermissionBefore(
      readAdminRoute("operation-logs/route.ts"),
      "listAdminOperationLogs(",
    );
  });

  it("requires system permission before reading and writing system settings", () => {
    const source = readAdminRoute("system-settings/route.ts");
    const getBody = source.slice(
      source.indexOf("export async function GET"),
      source.indexOf("export async function PATCH"),
    );
    const patchBody = source.slice(source.indexOf("export async function PATCH"));

    expectSystemPermissionBefore(getBody, "getSystemSettings(");
    expectSystemPermissionBefore(patchBody, "updateSystemSettings(");
  });
});
