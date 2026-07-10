import { describe, expect, it } from "vitest";

import {
  buildSelectedBenefits,
  buildHomeUrl,
  buildReservationEditConfirmContent,
  buildReservationRequestOptions,
  buildReservationConfirmContent,
  buildSelectedItems,
  changeBenefitSelection,
  changeDishSelection,
  getDishDisplayImage,
  getSelectablePackageBenefits,
  getDishFallbackImageKey,
  getDisplayDishes,
  getEditingOrderResolution,
  getHomeDishColumns,
  getPackageBenefitDisplays,
  getPackageCardCutoffBadge,
  getPackageUsageProgressPercent,
  getReservationConfirmView,
  getReservationGate,
  getReservationAddress,
  getReservationAddressTitle,
  getReservationSummaryMeta,
  getUnderPackageLimitConfirm,
  getUnavailableSelectedItems,
  isPastCutoff,
} from "./home";

const dishes = [
  {
    category: "LEAFY",
    id: "dish-spinach",
    name: "菠菜",
    stockJin: 2,
  },
  {
    category: "FRUIT",
    id: "dish-tomato",
    name: "番茄",
    stockJin: 0,
  },
];

describe("miniapp home helpers", () => {
  it("builds selected reservation items from current dish state", () => {
    expect(
      buildSelectedItems(dishes, {
        "dish-spinach": 1.5,
        "dish-tomato": 0,
        "missing-dish": 2,
      }),
    ).toEqual([
      {
        dishId: "dish-spinach",
        name: "菠菜",
        weightJin: 1.5,
      },
    ]);
  });

  it("keeps current-order items visible when they are no longer available today", () => {
    const selected = {
      "dish-spinach": 1.5,
      "dish-off-sale": 2,
    };
    const currentOrderItems = [
      { dishId: "dish-off-sale", name: "下架菜", weightJin: 2 },
    ];

    expect(buildSelectedItems(dishes, selected, currentOrderItems)).toEqual([
      {
        dishId: "dish-spinach",
        name: "菠菜",
        weightJin: 1.5,
      },
      {
        dishId: "dish-off-sale",
        name: "下架菜",
        weightJin: 2,
      },
    ]);
    expect(
      getUnavailableSelectedItems(dishes, selected, currentOrderItems),
    ).toEqual([
      {
        dishId: "dish-off-sale",
        name: "下架菜",
        weightJin: 2,
      },
    ]);
  });

  it("keeps all package benefits visible on the package card while only allowing remaining benefits to be selected", () => {
    const benefits = [
      {
        id: "benefit-egg",
        kind: "EGG",
        name: "土鸡蛋",
        remainingQuantity: 0,
        totalQuantity: 1,
        unit: "箱",
        usedQuantity: 1,
      },
      {
        id: "benefit-chicken",
        kind: "CHICKEN",
        name: "老母鸡",
        remainingQuantity: 1,
        totalQuantity: 1,
        unit: "只",
        usedQuantity: 0,
      },
    ];

    expect(getPackageBenefitDisplays(benefits)).toEqual([
      expect.objectContaining({
        id: "benefit-egg",
        name: "土鸡蛋",
        remainingQuantity: 0,
        unit: "箱",
      }),
      expect.objectContaining({
        id: "benefit-chicken",
        name: "老母鸡",
        remainingQuantity: 1,
        unit: "只",
      }),
    ]);
    expect(getSelectablePackageBenefits(benefits)).toEqual([
      expect.objectContaining({
        id: "benefit-chicken",
      }),
    ]);
  });

  it("builds selected benefit payloads from user-selected extra benefits", () => {
    const benefits = [
      {
        id: "benefit-egg",
        kind: "EGG",
        name: "土鸡蛋",
        remainingQuantity: 0,
        totalQuantity: 1,
        unit: "箱",
        usedQuantity: 1,
      },
      {
        id: "benefit-chicken",
        kind: "CHICKEN",
        name: "老母鸡",
        remainingQuantity: 2,
        totalQuantity: 3,
        unit: "只",
        usedQuantity: 1,
      },
    ];

    expect(
      changeBenefitSelection(
        {},
        {
          benefitId: "benefit-chicken",
          delta: 1,
          maxQuantity: 2,
        },
      ),
    ).toEqual({ "benefit-chicken": 1 });
    expect(
      changeBenefitSelection(
        { "benefit-chicken": 2 },
        {
          benefitId: "benefit-chicken",
          delta: 1,
          maxQuantity: 2,
        },
      ),
    ).toEqual({ "benefit-chicken": 2 });
    expect(
      buildSelectedBenefits(benefits, {
        "benefit-egg": 1,
        "benefit-chicken": 1,
      }),
    ).toEqual([
      {
        id: "benefit-chicken",
        kind: "CHICKEN",
        name: "老母鸡",
        quantity: 1,
        unit: "只",
      },
    ]);
  });

  it("changes dish selection by configured step and never goes below zero", () => {
    const selected = changeDishSelection(
      {
        "dish-spinach": 0.5,
      },
      {
        delta: 0.5,
        dishId: "dish-spinach",
        stepJin: 0.5,
      },
    );

    expect(selected).toEqual({ "dish-spinach": 1 });
    expect(
      changeDishSelection(selected, {
        delta: -2,
        dishId: "dish-spinach",
        stepJin: 0.5,
      }),
    ).toEqual({ "dish-spinach": 0 });
  });

  it("keeps selected weights aligned to decimal steps", () => {
    expect(
      changeDishSelection(
        {},
        {
          delta: 0.3,
          dishId: "dish-tomato",
          stepJin: 0.3,
        },
      ),
    ).toEqual({ "dish-tomato": 0.3 });
  });

  it("keeps home dishes in API order without category grouping", () => {
    expect(getDisplayDishes(dishes)).toEqual(dishes);
  });

  it("uses three dish cards per row by default and supports safe column config", () => {
    expect(getHomeDishColumns()).toBe(3);
    expect(getHomeDishColumns("")).toBe(3);
    expect(getHomeDishColumns("3")).toBe(3);
    expect(getHomeDishColumns("2")).toBe(2);
    expect(getHomeDishColumns("4")).toBe(4);
    expect(getHomeDishColumns("1")).toBe(3);
    expect(getHomeDishColumns("5")).toBe(3);
    expect(getHomeDishColumns("3.5")).toBe(3);
  });

  it("maps common vegetables to fallback image keys", () => {
    expect(getDishFallbackImageKey("菠菜")).toBe("spinach");
    expect(getDishFallbackImageKey("生菜")).toBe("lettuce");
    expect(getDishFallbackImageKey("小白菜")).toBe("cabbage");
    expect(getDishFallbackImageKey("空心菜")).toBe("greens");
    expect(getDishFallbackImageKey("番茄")).toBe("tomato");
    expect(getDishFallbackImageKey("黄瓜")).toBe("cucumber");
    expect(getDishFallbackImageKey("未知菜品")).toBe("greens");
  });

  it("uses uploaded dish image urls before local fallback images", () => {
    const fallbackImages = {
      cabbage: "fallback-cabbage.jpg",
      cucumber: "fallback-cucumber.jpg",
      greens: "fallback-greens.jpg",
      lettuce: "fallback-lettuce.jpg",
      spinach: "fallback-spinach.jpg",
      tomato: "fallback-tomato.jpg",
    };

    expect(
      getDishDisplayImage(
        {
          imageUrl: "http://localhost:9000/hentor-assets/dishes/spinach.png",
          name: "菠菜",
        },
        fallbackImages,
      ),
    ).toBe("http://localhost:9000/hentor-assets/dishes/spinach.png");
    expect(
      getDishDisplayImage({ imageUrl: "", name: "菠菜" }, fallbackImages),
    ).toBe("fallback-spinach.jpg");
  });

  it("does not add sold-out dishes to the current selection", () => {
    expect(
      changeDishSelection(
        {},
        {
          delta: 1,
          dishId: "dish-tomato",
          isAvailable: false,
          stepJin: 1,
        },
      ),
    ).toEqual({});
  });

  it("builds home API url with optional editing order id", () => {
    expect(
      buildHomeUrl({
        apiBaseUrl: "http://127.0.0.1:3000",
        editingOrderId: "order id/1",
        storeCode: "lotus/garden",
      }),
    ).toBe(
      "http://127.0.0.1:3000/api/v1/home?storeCode=lotus%2Fgarden&orderId=order%20id%2F1",
    );
  });

  it("builds separate reservation submit and update requests", () => {
    const common = {
      addressId: "address-1",
      apiBaseUrl: "http://127.0.0.1:3000",
      items: [{ dishId: "dish-spinach", name: "菠菜", weightJin: 1.5 }],
      storeCode: "lotus-garden",
      userPackageId: "package-1",
    };

    expect(buildReservationRequestOptions(common)).toEqual({
      data: {
        addressId: "address-1",
        items: [{ dishId: "dish-spinach", weightJin: 1.5 }],
        storeCode: "lotus-garden",
        userPackageId: "package-1",
      },
      method: "POST",
      url: "http://127.0.0.1:3000/api/v1/reservations",
    });

    expect(
      buildReservationRequestOptions({
        ...common,
        benefitSelections: [
          { quantity: 1, userPackageBenefitId: "benefit-chicken" },
        ],
      }),
    ).toMatchObject({
      data: {
        benefitSelections: [
          { quantity: 1, userPackageBenefitId: "benefit-chicken" },
        ],
      },
      method: "POST",
    });

    expect(
      buildReservationRequestOptions({
        ...common,
        editingOrderId: "order id/1",
      }),
    ).toEqual({
      data: {
        addressId: "address-1",
        benefitSelections: [],
        items: [{ dishId: "dish-spinach", weightJin: 1.5 }],
        storeCode: "lotus-garden",
        userPackageId: "package-1",
      },
      method: "PUT",
      url: "http://127.0.0.1:3000/api/v1/orders/order%20id%2F1",
    });
  });

  it("detects when the requested editing order is no longer editable", () => {
    expect(
      getEditingOrderResolution("order-1", {
        currentOrder: { id: "order-1" },
      }),
    ).toEqual({ shouldClearEditingOrder: false });
    expect(
      getEditingOrderResolution("order-1", {
        currentOrder: null,
      }),
    ).toEqual({
      shouldClearEditingOrder: true,
      toastTitle: "该订单已不可修改",
    });
    expect(
      getEditingOrderResolution(undefined, {
        currentOrder: null,
      }),
    ).toEqual({ shouldClearEditingOrder: false });
  });

  it("shows frozen packages as unavailable instead of treating them as missing", () => {
    expect(
      getReservationGate({
        packageInfo: {
          frozenReason: "后台冻结测试",
          remainingTimes: 6,
          status: "FROZEN",
        },
      }),
    ).toEqual({
      canReserve: false,
      emptyMessage: null,
      packageMeta: "套餐已冻结：后台冻结测试",
      submitDisabled: true,
    });
  });

  it("locks reservations for disabled miniapp accounts before package checks", () => {
    expect(
      getReservationGate({
        memberInfo: {
          disabledReason: "用户主动注销",
          status: "DISABLED",
        },
        packageInfo: {
          remainingTimes: 3,
          status: "ACTIVE",
        },
      }),
    ).toEqual({
      canReserve: false,
      emptyMessage: null,
      packageMeta: "账号已停用：用户主动注销",
      submitDisabled: true,
    });
  });

  it("keeps the no-package reservation prompt short for the homepage card", () => {
    const gate = getReservationGate({ packageInfo: null });

    expect(gate).toEqual({
      canReserve: false,
      emptyMessage: "请在“我的-套餐”购买后再预订",
      packageMeta: null,
      submitDisabled: true,
    });
    expect(gate.emptyMessage?.length).toBeLessThanOrEqual(18);
  });

  it("allows modifying today's order even when the package has no remaining times", () => {
    expect(
      getReservationGate({
        hasCurrentOrder: true,
        packageInfo: {
          remainingTimes: 0,
          status: "ACTIVE",
        },
      }),
    ).toEqual({
      canReserve: true,
      emptyMessage: null,
      packageMeta: null,
      submitDisabled: false,
    });
  });

  it("does not let create-mode homepage bypass used-up packages just because today has an order", () => {
    expect(
      getReservationGate({
        hasCurrentOrder: false,
        packageInfo: {
          remainingTimes: 0,
          status: "ACTIVE",
        },
      }),
    ).toEqual({
      canReserve: false,
      emptyMessage: null,
      packageMeta: "套餐次数已用完",
      submitDisabled: true,
    });
  });

  it("locks reservations when there is no active task", () => {
    expect(
      getReservationGate({
        hasActiveTask: false,
        packageInfo: {
          remainingTimes: 3,
          status: "ACTIVE",
        },
      }),
    ).toEqual({
      canReserve: false,
      emptyMessage: null,
      packageMeta: "今日暂无可预订任务",
      submitDisabled: true,
    });
  });

  it("locks reservations after the store cutoff time", () => {
    expect(
      getReservationGate({
        isPastCutoff: true,
        packageInfo: {
          remainingTimes: 3,
          status: "ACTIVE",
        },
      }),
    ).toEqual({
      canReserve: false,
      emptyMessage: null,
      hideSubmitButton: true,
      packageMeta: "今日已截单，明天再来预订",
      submitDisabled: true,
    });
  });

  it("detects whether the current local time is past cutoff", () => {
    expect(isPastCutoff("18:00", new Date("2026-06-18T17:59:00+08:00"))).toBe(
      false,
    );
    expect(isPastCutoff("18:00", new Date("2026-06-18T18:00:00+08:00"))).toBe(
      true,
    );
    expect(isPastCutoff("18:00", new Date("2026-06-18T18:01:00+08:00"))).toBe(
      true,
    );
  });

  it("builds a concise reservation confirmation summary", () => {
    expect(
      buildReservationConfirmContent({
        addressDetail: "莲花小区 3 栋 602",
        items: [
          { dishId: "dish-spinach", name: "菠菜", weightJin: 1 },
          { dishId: "dish-tomato", name: "番茄", weightJin: 2 },
        ],
        totalWeightJin: 3,
      }),
    ).toBe("菠菜 1斤 / 番茄 2斤\n合计 3斤\n配送至：莲花小区 3 栋 602");
  });

  it("builds an edit confirmation summary without change detail copy", () => {
    expect(
      buildReservationEditConfirmContent({
        addressDetail: "莲花小区 3 栋 602",
        currentItems: [
          { dishId: "dish-spinach", name: "菠菜", weightJin: 1.5 },
          { dishId: "dish-tomato", name: "番茄", weightJin: 1 },
          { dishId: "dish-cucumber", name: "黄瓜", weightJin: 0.5 },
        ],
        originalItems: [
          { dishId: "dish-spinach", name: "菠菜", weightJin: 1 },
          { dishId: "dish-tomato", name: "番茄", weightJin: 2 },
        ],
        orderNo: "OD202606180001",
        totalWeightJin: 3,
      }),
    ).toBe(
      "原订单：OD202606180001\n已选菜品：菠菜 1.5斤 / 番茄 1斤 / 黄瓜 0.5斤\n合计 3斤\n配送至：莲花小区 3 栋 602",
    );
  });

  it("keeps the existing order address when modifying until the user switches address", () => {
    expect(
      getReservationAddress({
        currentOrder: {
          address: { detail: "旧地址 1 栋 101" },
          addressId: "old-address",
        },
        defaultAddress: {
          detail: "新默认地址 3 栋 602",
          id: "new-address",
        },
      }),
    ).toEqual({
      detail: "旧地址 1 栋 101",
      id: "old-address",
      source: "currentOrder",
    });
  });

  it("uses the explicitly selected address over the existing order address", () => {
    expect(
      getReservationAddress({
        currentOrder: {
          address: { detail: "旧地址 1 栋 101" },
          addressId: "old-address",
        },
        defaultAddress: {
          detail: "新默认地址 3 栋 602",
          id: "new-address",
        },
        selectedAddress: {
          detail: "手动选择地址 5 栋 808",
          id: "selected-address",
        },
      }),
    ).toEqual({
      detail: "手动选择地址 5 栋 808",
      id: "selected-address",
      source: "selected",
    });
  });

  it("formats province, city, district, and detail for homepage reservation addresses", () => {
    expect(
      getReservationAddress({
        defaultAddress: {
          city: "南京市",
          detail: "龙池街道 1 号",
          district: "六合区",
          id: "default-address",
          province: "江苏省",
        },
      }),
    ).toEqual({
      detail: "江苏省 南京市 六合区 龙池街道 1 号",
      id: "default-address",
      source: "default",
    });

    expect(
      getReservationAddress({
        selectedAddress: {
          detail: "龙池街道 1 号",
          fullAddress: "江苏省 南京市 六合区 龙池街道 1 号",
          id: "selected-address",
        },
      }),
    ).toEqual({
      detail: "江苏省 南京市 六合区 龙池街道 1 号",
      id: "selected-address",
      source: "selected",
    });
  });

  it("keeps the existing order address when no default address is available", () => {
    expect(
      getReservationAddress({
        currentOrder: {
          address: { detail: "旧地址 1 栋 101" },
          addressId: "old-address",
        },
        defaultAddress: null,
      }),
    ).toEqual({
      detail: "旧地址 1 栋 101",
      id: "old-address",
      source: "currentOrder",
    });
  });

  it("formats compact address titles for the redesigned home header", () => {
    expect(
      getReservationAddressTitle({
        detail: "莲花小区 3栋 602",
        id: "address-1",
        source: "default",
      }),
    ).toBe("默认地址：莲花小区 3栋 602");

    expect(
      getReservationAddressTitle({
        detail: "旧地址 1栋 101",
        id: "address-2",
        source: "currentOrder",
      }),
    ).toBe("预订地址：旧地址 1栋 101");

    expect(
      getReservationAddressTitle({
        detail: "请先添加配送地址",
        id: null,
        source: "missing",
      }),
    ).toBe("配送地址：请先添加配送地址");
  });

  it("keeps the sticky basket concise without repeating remaining package weight", () => {
    expect(
      getReservationSummaryMeta({
        isOverLimit: false,
        packageMeta: null,
        selectedCount: 2,
      }),
    ).toBe("确认后提交预订，截单前可修改");

    expect(
      getReservationSummaryMeta({
        isOverLimit: false,
        packageMeta: "套餐已冻结：后台冻结测试",
        selectedCount: 2,
      }),
    ).toBe("套餐已冻结：后台冻结测试");

    expect(
      getReservationSummaryMeta({
        isOverLimit: true,
        packageMeta: null,
        selectedCount: 2,
      }),
    ).toBe("超过套餐额度，请减少菜品");
  });

  it("formats the cutoff badge inside the weekly package card", () => {
    expect(getPackageCardCutoffBadge("18:00")).toBe("18:00 截单");
    expect(getPackageCardCutoffBadge(undefined)).toBe("截单时间待定");
  });

  it("uses package usage count for the weekly package card progress", () => {
    expect(
      getPackageUsageProgressPercent({
        remainingTimes: 6,
        totalTimes: 8,
        usedTimes: 2,
      }),
    ).toBe(25);

    expect(
      getPackageUsageProgressPercent({
        remainingTimes: 0,
        totalTimes: 0,
        usedTimes: 0,
      }),
    ).toBe(0);
  });

  it("builds a read-only edit confirmation view with selected dishes", () => {
    expect(
      getReservationConfirmView({
        addressDetail: "莲花小区 3栋 602",
        cutoffTime: "09:00",
        currentItems: [
          { dishId: "dish-spinach", name: "菠菜", weightJin: 1.5 },
          { dishId: "dish-cucumber", name: "黄瓜", weightJin: 2 },
          { dishId: "dish-tomato", name: "番茄", weightJin: 1 },
        ],
        mode: "edit",
        originalItems: [
          { dishId: "dish-spinach", name: "菠菜", weightJin: 1 },
          { dishId: "dish-cucumber", name: "黄瓜", weightJin: 1.5 },
        ],
        receiverName: "张建国",
        receiverPhone: "13812345678",
        totalWeightJin: 4.5,
        weightLimitJin: 8,
      }),
    ).toMatchObject({
      addressMeta: "张建国 138****5678 · 明日09:00前配送",
      detailTitle: "已选菜品",
      main: "3样菜 · 4.5斤",
      meta: "合计4.5斤，套餐单次最多8斤",
      noticeTitle: "保存后覆盖原预订",
      primaryText: "确认修改",
      progressPercent: 56.25,
      rows: [
        {
          label: "菠菜",
          tag: "1.5斤",
          tone: "positive",
        },
        {
          label: "黄瓜",
          tag: "2斤",
          tone: "positive",
        },
        {
          label: "番茄",
          tag: "1斤",
          tone: "positive",
        },
      ],
      stateLabel: "待保存",
      summaryLabel: "预订确认",
      title: "提交与修改确认",
    });
  });

  it("builds a create confirmation view without system modal copy", () => {
    expect(
      getReservationConfirmView({
        addressDetail: "莲花小区 3栋 602",
        currentItems: [
          { dishId: "dish-spinach", name: "菠菜", weightJin: 1 },
          { dishId: "dish-tomato", name: "番茄", weightJin: 2 },
        ],
        mode: "create",
        totalWeightJin: 3,
        weightLimitJin: 8,
      }),
    ).toMatchObject({
      detailTitle: "已选菜品",
      main: "2样菜 · 3斤",
      noticeTitle: "提交后生成预订",
      primaryText: "确认提交",
      rows: [
        { label: "菠菜", tag: "1斤", tone: "positive" },
        { label: "番茄", tag: "2斤", tone: "positive" },
      ],
      stateLabel: "待提交",
      summaryLabel: "预订确认",
    });
  });

  it("asks for confirmation when selected vegetables are below package limit", () => {
    expect(
      getUnderPackageLimitConfirm({
        mode: "create",
        totalWeightJin: 3.5,
        weightLimitJin: 8,
      }),
    ).toEqual({
      cancelText: "再来一单",
      confirmText: "确认提交",
      content: "套餐本次可选 8斤，当前已选 3.5斤，还没选满。确认提交吗？",
      title: "未选满套餐额度",
    });

    expect(
      getUnderPackageLimitConfirm({
        mode: "edit",
        totalWeightJin: 8,
        weightLimitJin: 8,
      }),
    ).toBeNull();
  });
});
