import { describe, expect, it } from "vitest";

import { getCollapsedFlyoutTop } from "./admin-collapsed-flyout-position";

describe("collapsed sidebar flyout positioning", () => {
  it("keeps an already visible flyout aligned with its trigger", () => {
    expect(getCollapsedFlyoutTop(120, 200, 800)).toBe(120);
  });

  it("keeps the flyout inside the viewport top edge", () => {
    expect(getCollapsedFlyoutTop(2, 200, 800)).toBe(12);
  });

  it("moves a long flyout above the viewport bottom edge", () => {
    expect(getCollapsedFlyoutTop(760, 320, 800)).toBe(468);
  });
});
