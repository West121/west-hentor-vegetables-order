import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readRoute(path: string) {
  return readFileSync(join(process.cwd(), "app/api/admin/admin-users", path), "utf8");
}

describe("admin user route access checks", () => {
  it("requires system management permission before listing accounts", () => {
    const source = readRoute("route.ts");
    const getBody = source.slice(
      source.indexOf("export async function GET"),
      source.indexOf("export async function POST"),
    );

    expect(getBody).toContain("getPermissionFailure(");
    expect(getBody).toContain('"system.manage"');
    expect(getBody.indexOf("getPermissionFailure(")).toBeLessThan(
      getBody.indexOf("listAdminUsers({"),
    );
  });

  it("checks role assignment scope before creating an account", () => {
    const source = readRoute("route.ts");
    const postBody = source.slice(source.indexOf("export async function POST"));

    expect(postBody).toContain("getPermissionFailure(");
    expect(postBody).toContain('"system.manage"');
    expect(postBody.indexOf("getPermissionFailure(")).toBeLessThan(
      postBody.indexOf("createAdminUser({"),
    );
    expect(postBody).toContain("getRoleAssignmentFailure(");
    expect(postBody.indexOf("getRoleAssignmentFailure(")).toBeLessThan(
      postBody.indexOf("createAdminUser({"),
    );
  });

  it("checks target admin user scope before patching an account", () => {
    const source = readRoute("[adminUserId]/route.ts");
    const patchBody = source.slice(source.indexOf("export async function PATCH"));

    expect(patchBody).toContain("getPermissionFailure(");
    expect(patchBody).toContain('"system.manage"');
    expect(patchBody.indexOf("getPermissionFailure(")).toBeLessThan(
      patchBody.indexOf("updateAdminUser({"),
    );
    expect(patchBody).toContain("getRoleAssignmentFailure(");
    expect(patchBody.indexOf("getRoleAssignmentFailure(")).toBeLessThan(
      patchBody.indexOf("updateAdminUser({"),
    );
    expect(patchBody).toContain("getAdminUser({");
    expect(patchBody.indexOf("getAdminUser({")).toBeLessThan(
      patchBody.indexOf("updateAdminUser({"),
    );
    expect(patchBody).toContain("storeIds: access.stores.map((store) => store.id)");
  });

  it("checks target admin user scope before resetting a password", () => {
    const source = readRoute("[adminUserId]/password/route.ts");

    expect(source).toContain("getPermissionFailure(");
    expect(source).toContain('"system.manage"');
    expect(source.indexOf("getPermissionFailure(")).toBeLessThan(
      source.indexOf("resetAdminUserPassword({"),
    );
    expect(source).toContain("getAdminUser({");
    expect(source.indexOf("getAdminUser({")).toBeLessThan(
      source.indexOf("resetAdminUserPassword({"),
    );
    expect(source).toContain("storeIds: access.stores.map((store) => store.id)");
  });
});
