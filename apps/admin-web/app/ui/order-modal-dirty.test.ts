import { describe, expect, it } from "vitest";

import {
  buildOrderFormState,
  hasUnsavedOrderModalChanges,
} from "./order-modal-state";

const order = {
  addressSnapshot: {},
  canceledAt: null,
  cancelReason: null,
  createdAt: "2026-06-18T00:00:00.000Z",
  id: "order-1",
  internalRemark: "原内部备注",
  items: [],
  logisticsNo: "SF001",
  modifiedAt: null,
  orderNo: "OD202606180001",
  shippedAt: null,
  signedAt: null,
  status: "PENDING_SHIPMENT",
  store: { code: "lotus", id: "store-1", name: "莲花小区加盟店" },
  totalWeightJin: 0,
  updatedAt: "2026-06-18T00:00:00.000Z",
  user: { id: "user-1", nickname: "张建国", phone: "13800000000", status: "ACTIVE" },
  userPackage: { id: "package-1", nameSnapshot: "8斤周套餐" },
  userVisibleRemark: "原用户备注",
};

describe("order modal dirty state", () => {
  it("does not mark an unchanged existing order form as dirty", () => {
    expect(
      hasUnsavedOrderModalChanges({
        current: buildOrderFormState(order),
        initial: buildOrderFormState(order),
        mode: "detail",
      }),
    ).toBe(false);
  });

  it("marks edited remarks, logistics and void reason as unsaved changes", () => {
    expect(
      hasUnsavedOrderModalChanges({
        current: {
          ...buildOrderFormState(order),
          internalRemark: "改过的备注",
        },
        initial: buildOrderFormState(order),
        mode: "edit",
      }),
    ).toBe(true);

    expect(
      hasUnsavedOrderModalChanges({
        current: {
          ...buildOrderFormState(order),
          logisticsNo: "SF002",
        },
        initial: buildOrderFormState(order),
        mode: "edit",
      }),
    ).toBe(true);

    expect(
      hasUnsavedOrderModalChanges({
        current: {
          ...buildOrderFormState(order),
          voidReason: "客户取消",
        },
        initial: buildOrderFormState(order),
        mode: "edit",
      }),
    ).toBe(true);
  });

  it("marks create modal selections and notes as unsaved changes", () => {
    const initial = buildOrderFormState(null, [{ id: "member-1" }]);

    expect(
      hasUnsavedOrderModalChanges({
        current: {
          ...initial,
          createItems: { "dish-1": "1" },
        },
        initial,
        mode: "create",
      }),
    ).toBe(true);

    expect(
      hasUnsavedOrderModalChanges({
        current: {
          ...initial,
          userVisibleRemark: "不要香菜",
        },
        initial,
        mode: "create",
      }),
    ).toBe(true);
  });
});
