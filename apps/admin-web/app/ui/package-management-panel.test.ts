import { describe, expect, it } from "vitest";

import { normalizePackagePanelItem } from "./package-management-model";

describe("normalizePackagePanelItem", () => {
  it("adapts the Spring user package list shape for rendering", () => {
    const item = normalizePackagePanelItem({
      createdAt: "2026-06-23T11:57:39",
      id: "pkg-1",
      nameSnapshot: "8斤周套餐",
      remainingTimes: 7,
      status: "ACTIVE",
      totalTimes: 8,
      usedTimes: 1,
      userId: "user-1",
      userAvatarUrl: "/uploads/avatars/west.jpg",
      userNickname: "张建国",
      userPhone: "13800005678",
      userStatus: "ACTIVE",
      weightLimitJin: 8,
    });

    expect(item.user.avatarUrl).toBe("/uploads/avatars/west.jpg");
    expect(item.user.nickname).toBe("张建国");
    expect(item.user.phone).toBe("13800005678");
    expect(item.template.name).toBe("8斤周套餐");
    expect(item.store.id).toBe("");
    expect(item.usagePercent).toBe(12.5);
  });
});
