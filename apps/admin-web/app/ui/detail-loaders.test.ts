import { describe, expect, it } from "vitest";

import {
  buildStoreScopedDetailPath,
  loadDetailResource,
} from "./detail-loaders";

describe("admin detail loaders", () => {
  it("builds a store-scoped detail url with encoded ids", () => {
    expect(
      buildStoreScopedDetailPath("members", "user 1", "store/alpha"),
    ).toBe("/api/admin/members/user%201?storeId=store%2Falpha");
  });

  it("loads a keyed detail resource from a successful response", async () => {
    const calls: string[] = [];
    const fetcher = async (url: string) => {
      calls.push(url);
      return new Response(
        JSON.stringify({
          data: { member: { id: "member-1", nickname: "张建国" } },
          success: true,
        }),
        { status: 200 },
      );
    };

    await expect(
      loadDetailResource<{ id: string }>(
        "/api/admin/members/member-1?storeId=store-1",
        "member",
        fetcher,
      ),
    ).resolves.toEqual({ id: "member-1", nickname: "张建国" });
    expect(calls).toEqual(["/api/admin/members/member-1?storeId=store-1"]);
  });

  it("loads an unkeyed spring detail resource from a successful response", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          data: { id: "package-1", nameSnapshot: "8斤周套餐" },
          success: true,
        }),
        { status: 200 },
      );

    await expect(
      loadDetailResource<{ id: string; nameSnapshot: string }>(
        "/api/admin/user-packages/package-1?storeId=store-1",
        "userPackage",
        fetcher,
      ),
    ).resolves.toEqual({ id: "package-1", nameSnapshot: "8斤周套餐" });
  });

  it("throws the api error message when loading fails", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          error: { message: "会员不存在" },
          success: false,
        }),
        { status: 404 },
      );

    await expect(
      loadDetailResource("/api/admin/members/missing?storeId=store-1", "member", fetcher),
    ).rejects.toThrow("会员不存在");
  });
});
