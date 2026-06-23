import { describe, expect, it } from "vitest";

import { canCloseAdminModal } from "./admin-modal-close-guard";

describe("admin modal close guard", () => {
  it("closes immediately when there are no unsaved changes", () => {
    expect(
      canCloseAdminModal({
        hasUnsavedChanges: false,
      }),
    ).toBe(true);
  });

  it("does not show a native confirmation for unsaved changes", () => {
    expect(
      canCloseAdminModal({
        hasUnsavedChanges: true,
      }),
    ).toBe(true);
  });
});
