import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readAdminRoute(path: string) {
  return readFileSync(join(process.cwd(), "app/api/admin", path), "utf8");
}

function expectStorePermissionBefore(source: string, nextCall: string) {
  expect(source).toContain("getPermissionFailure(");
  expect(source).toContain('"stores.manage"');
  expect(source.indexOf("getPermissionFailure(")).toBeLessThan(
    source.indexOf(nextCall),
  );
}

describe("store management route access checks", () => {
  it("requires store permission before listing and creating stores", () => {
    const source = readAdminRoute("stores/route.ts");
    const getBody = source.slice(
      source.indexOf("export async function GET"),
      source.indexOf("export async function POST"),
    );
    const postBody = source.slice(source.indexOf("export async function POST"));

    expectStorePermissionBefore(getBody, "listStores(");
    expectStorePermissionBefore(postBody, "createStore(");
  });

  it("requires store permission before reading and updating a store", () => {
    const source = readAdminRoute("stores/[storeId]/route.ts");
    const getBody = source.slice(
      source.indexOf("export async function GET"),
      source.indexOf("export async function PATCH"),
    );
    const patchBody = source.slice(source.indexOf("export async function PATCH"));

    expectStorePermissionBefore(getBody, "getStore(");
    expectStorePermissionBefore(patchBody, "updateStore(");
  });

  it("requires store permission before listing and creating franchisees", () => {
    const source = readAdminRoute("franchisees/route.ts");
    const getBody = source.slice(
      source.indexOf("export async function GET"),
      source.indexOf("export async function POST"),
    );
    const postBody = source.slice(source.indexOf("export async function POST"));

    expectStorePermissionBefore(getBody, "listFranchisees(");
    expectStorePermissionBefore(postBody, "createFranchisee(");
  });

  it("requires store permission before reading and updating a franchisee", () => {
    const source = readAdminRoute("franchisees/[franchiseeId]/route.ts");
    const getBody = source.slice(
      source.indexOf("export async function GET"),
      source.indexOf("export async function PATCH"),
    );
    const patchBody = source.slice(source.indexOf("export async function PATCH"));

    expectStorePermissionBefore(getBody, "getFranchisee(");
    expectStorePermissionBefore(patchBody, "updateFranchisee(");
  });
});
