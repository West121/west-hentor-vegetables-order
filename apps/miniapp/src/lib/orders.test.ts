import { describe, expect, it } from "vitest";

import {
  buildCancelOrderUrl,
  buildHideOrderUrl,
  buildOrdersListUrl,
  buildOrderStatusCounts,
  filterOrdersByStatus,
  ORDER_STATUS_TABS,
} from "./orders";

const orders = [
  { id: "order-1", status: "PENDING_SHIPMENT" },
  { id: "order-2", status: "SHIPPED" },
  { id: "order-3", status: "SIGNED" },
  { id: "order-4", status: "CANCELED" },
  { id: "order-5", status: "VOIDED" },
];

describe("miniapp order helpers", () => {
  it("keeps the visible tabs aligned to the Figma order prototype", () => {
    expect(ORDER_STATUS_TABS).toEqual([
      { key: "PENDING_SHIPMENT", label: "待发货" },
      { key: "SHIPPED", label: "已发货" },
      { key: "SIGNED", label: "已签收" },
      { key: "CANCELED", label: "已取消" },
    ]);
  });

  it("filters orders by tab status while keeping all tab available", () => {
    expect(filterOrdersByStatus(orders, "ALL").map((order) => order.id)).toEqual([
      "order-1",
      "order-2",
      "order-3",
      "order-4",
      "order-5",
    ]);
    expect(
      filterOrdersByStatus(orders, "PENDING_SHIPMENT").map((order) => order.id),
    ).toEqual(["order-1"]);
  });

  it("counts canceled and voided orders in the canceled tab", () => {
    expect(buildOrderStatusCounts(orders)).toEqual({
      ALL: 5,
      CANCELED: 2,
      PENDING_SHIPMENT: 1,
      SHIPPED: 1,
      SIGNED: 1,
    });
  });

  it("builds the hide-order URL with encoded order and store identifiers", () => {
    expect(
      buildHideOrderUrl({
        apiBaseUrl: "http://127.0.0.1:3000",
        orderId: "order id/1",
        storeCode: "lotus/garden",
      }),
    ).toBe(
      "http://127.0.0.1:3000/api/v1/orders/order%20id%2F1/user-visible?storeCode=lotus%2Fgarden",
    );
  });

  it("builds encoded list and cancel order urls", () => {
    expect(
      buildOrdersListUrl({
        apiBaseUrl: "http://127.0.0.1:3000",
        storeCode: "lotus/garden",
      }),
    ).toBe("http://127.0.0.1:3000/api/v1/orders?storeCode=lotus%2Fgarden");
    expect(
      buildCancelOrderUrl({
        apiBaseUrl: "http://127.0.0.1:3000",
        orderId: "order id/1",
      }),
    ).toBe("http://127.0.0.1:3000/api/v1/orders/order%20id%2F1/cancel");
  });
});
