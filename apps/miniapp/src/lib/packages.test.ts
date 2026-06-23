import { describe, expect, it, vi } from "vitest";

import {
  buildPackagePrepayUrl,
  buildPackagesUrl,
  getCurrentPackageItem,
  getPackageHeroView,
  getPackagePurchaseAction,
  getPackagePurchaseToast,
} from "./packages";

describe("miniapp package helpers", () => {
  it("keeps package purchase intent available when WeChat payment is reserved but disabled", () => {
    expect(
      getPackagePurchaseAction({
        enabled: false,
        purchaseStatus: "PAYMENT_NOT_ENABLED",
        templateId: "template-1",
      }),
    ).toEqual({
      canReserveIntent: true,
      disabled: false,
      label: "预留购买",
      meta: "微信支付暂未开放，点击后仅记录购买意向",
    });
  });

  it("switches to a real purchase label when payment is enabled", () => {
    expect(
      getPackagePurchaseAction({
        enabled: true,
        purchaseStatus: "READY",
        templateId: "template-1",
      }),
    ).toMatchObject({
      canReserveIntent: true,
      disabled: false,
      label: "购买",
    });
  });

  it("formats the reserved WeChat prepay response into a clear user message", () => {
    expect(getPackagePurchaseToast("PAYMENT_NOT_ENABLED")).toBe(
      "已记录购买意向，微信支付暂未开放",
    );
    expect(getPackagePurchaseToast("PENDING_PAYMENT")).toBe("购买入口已预留");
  });

  it("builds encoded package list and prepay urls", () => {
    expect(
      buildPackagesUrl({
        apiBaseUrl: "http://127.0.0.1:3000",
        storeCode: "lotus/garden",
      }),
    ).toBe("http://127.0.0.1:3000/api/v1/packages?storeCode=lotus%2Fgarden");
    expect(
      buildPackagePrepayUrl({
        apiBaseUrl: "http://127.0.0.1:3000",
        purchaseOrderId: "purchase id/1",
        storeCode: "lotus/garden",
      }),
    ).toBe(
      "http://127.0.0.1:3000/api/v1/package-purchases/purchase%20id%2F1/wechat-prepay?storeCode=lotus%2Fgarden",
    );
  });

  it("selects the active package for the member package page", () => {
    expect(
      getCurrentPackageItem([
        {
          nameSnapshot: "冻结套餐",
          remainingTimes: 4,
          status: "FROZEN",
          totalTimes: 8,
          usedTimes: 4,
          weightLimitJin: 8,
        },
        {
          nameSnapshot: "8斤周套餐",
          remainingTimes: 5,
          status: "ACTIVE",
          totalTimes: 8,
          usedTimes: 3,
          weightLimitJin: 8,
        },
      ]),
    )?.toMatchObject({
      nameSnapshot: "8斤周套餐",
      status: "ACTIVE",
    });
  });

  it("formats the package page hero and cycle view from real package fields", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T10:00:00.000Z"));

    expect(
      getPackageHeroView({
        nameSnapshot: "8斤周套餐",
        remainingTimes: 5,
        status: "ACTIVE",
        totalTimes: 8,
        usedTimes: 3,
        weightLimitJin: 8,
      }),
    ).toMatchObject({
      cycleMeta: "已用 3/8 次 · 剩余 5 次",
      cycleProgressPercent: 37.5,
      nextOrderLabel: "按添加时间先后使用",
      remainingTimesLabel: "5次剩余",
      statusLabel: "已开通",
      statusMeta: "剩余 5 次",
      subtitle: "8斤/次 · 每周配送 · 支持截单前修改",
      title: "8斤周套餐",
      weightBenefitLabel: "8斤额度",
      weightBenefitMeta: "每次最多选 8斤",
    });

    vi.useRealTimers();
  });
});
