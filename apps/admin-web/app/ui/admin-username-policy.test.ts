import { describe, expect, it } from "vitest";

import {
  ADMIN_USERNAME_WHITESPACE_ERROR,
  validateNewAdminUsername,
} from "./admin-username-policy";

describe("new admin username policy", () => {
  it("rejects ASCII, tab and full-width whitespace", () => {
    expect(validateNewAdminUsername("admin user")).toBe(
      ADMIN_USERNAME_WHITESPACE_ERROR,
    );
    expect(validateNewAdminUsername("admin\tuser")).toBe(
      ADMIN_USERNAME_WHITESPACE_ERROR,
    );
    expect(validateNewAdminUsername("admin　user")).toBe(
      ADMIN_USERNAME_WHITESPACE_ERROR,
    );
  });

  it("accepts a nonblank username without whitespace", () => {
    expect(validateNewAdminUsername("admin_user")).toBeNull();
  });
});
