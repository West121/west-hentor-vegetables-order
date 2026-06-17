import { describe, expect, it } from "vitest";

import { ADMIN_NAV_GROUPS } from "./admin-navigation";

describe("admin navigation", () => {
  it("keeps the server-to-client navigation model serializable", () => {
    for (const group of ADMIN_NAV_GROUPS) {
      for (const item of group.items) {
        expect(typeof item.icon).toBe("string");
      }
    }
  });
});
