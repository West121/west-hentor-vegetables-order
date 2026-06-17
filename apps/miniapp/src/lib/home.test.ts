import { describe, expect, it } from "vitest";

import {
  buildHomeUrl,
  buildSelectedItems,
  changeDishSelection,
  getEditingOrderResolution,
} from "./home";

const dishes = [
  {
    id: "dish-spinach",
    name: "菠菜",
  },
  {
    id: "dish-tomato",
    name: "番茄",
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

  it("builds home API url with optional editing order id", () => {
    expect(
      buildHomeUrl({
        apiBaseUrl: "http://127.0.0.1:3000",
        editingOrderId: "order id/1",
        storeCode: "lotus-garden",
      }),
    ).toBe(
      "http://127.0.0.1:3000/api/v1/home?storeCode=lotus-garden&orderId=order%20id%2F1",
    );
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
});
