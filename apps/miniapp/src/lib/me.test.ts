import { describe, expect, it } from "vitest";

import {
  getMemberLockNotice,
  getOrderStatusLabel,
  getPackageUsageStats,
  getTodayOrderMeta,
} from "./me";

describe("miniapp me helpers", () => {
  it("builds a visible lock notice for disabled members", () => {
    expect(
      getMemberLockNotice({
        bindingStatus: "DISABLED",
        disabledReason: "后台暂停服务",
      }),
    ).toEqual({
      actionText: "联系客服",
      message: "后台暂停服务",
      title: "账号服务已暂停",
    });
  });

  it("does not show a lock notice for active members", () => {
    expect(
      getMemberLockNotice({
        bindingStatus: "ACTIVE",
        disabledReason: null,
      }),
    ).toBeNull();
  });

  it("builds a lock notice when the account itself is disabled", () => {
    expect(
      getMemberLockNotice({
        bindingStatus: "ACTIVE",
        disabledReason: "用户主动注销",
        status: "DISABLED",
      }),
    ).toEqual({
      actionText: "联系客服",
      message: "用户主动注销",
      title: "账号服务已暂停",
    });
  });

  it("formats package usage stats for the Figma-style member card", () => {
    expect(
      getPackageUsageStats(
        {
          nameSnapshot: "8斤周套餐",
          remainingTimes: 7,
          totalTimes: 8,
          usedTimes: 1,
          weightLimitJin: 8,
        },
        2.5,
      ),
    ).toEqual({
      meta: "本周剩余 7 次 · 按添加时间先后使用",
      progressPercent: 68.75,
      remainingLabel: "7 次",
      remainingWeightLabel: "5.5斤",
      title: "8斤周套餐",
      usedLabel: "1 次",
    });

    expect(
      getPackageUsageStats({
        remainingTimes: 7,
        totalTimes: 8,
        usedTimes: 1,
        weightLimitJin: 8,
      }),
    ).toEqual({
      meta: "本周剩余 7 次 · 按添加时间先后使用",
      progressPercent: 100,
      remainingLabel: "7 次",
      remainingWeightLabel: "8斤",
      title: "8斤周套餐",
      usedLabel: "1 次",
    });

    expect(getPackageUsageStats(null)).toEqual({
      meta: "购买套餐入口已预留，微信支付暂未开放",
      progressPercent: 0,
      remainingLabel: "0 次",
      remainingWeightLabel: "0斤",
      title: "暂无套餐",
      usedLabel: "0 次",
    });
  });

  it("formats today order summary like the member prototype", () => {
    expect(
      getTodayOrderMeta({
        items: [{}, {}, {}],
        totalWeightJin: 4,
      }),
    ).toBe("3样菜 · 4斤");

    expect(getTodayOrderMeta(null)).toBe("从首页选择菜品后提交预订");
  });

  it("maps order statuses to user-facing labels", () => {
    expect(getOrderStatusLabel("SHIPPED")).toBe("已发货");
    expect(getOrderStatusLabel("PENDING_SHIPMENT")).toBe("待发货");
    expect(getOrderStatusLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});
