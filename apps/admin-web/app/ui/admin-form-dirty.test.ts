import { describe, expect, it } from "vitest";

import { hasAdminFormChanges } from "./admin-form-dirty";

describe("admin form dirty state", () => {
  it("does not mark identical primitive fields or reordered arrays as dirty", () => {
    expect(
      hasAdminFormChanges({
        current: {
          name: "后台用户",
          roleIds: ["role-2", "role-1"],
          status: "ACTIVE",
        },
        initial: {
          name: "后台用户",
          roleIds: ["role-1", "role-2"],
          status: "ACTIVE",
        },
      }),
    ).toBe(false);
  });

  it("marks primitive and array membership changes as dirty", () => {
    expect(
      hasAdminFormChanges({
        current: {
          name: "8斤套餐",
          totalTimes: "10",
        },
        initial: {
          name: "8斤套餐",
          totalTimes: "8",
        },
      }),
    ).toBe(true);

    expect(
      hasAdminFormChanges({
        current: {
          dishIds: ["dish-1", "dish-3"],
        },
        initial: {
          dishIds: ["dish-1", "dish-2"],
        },
      }),
    ).toBe(true);
  });
});
