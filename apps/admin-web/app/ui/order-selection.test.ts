import { describe, expect, it } from "vitest";

import {
  areAllPendingOrdersSelected,
  getPendingOrderIds,
  hasBatchShipLogisticsDraft,
  togglePendingOrderSelection,
} from "./order-selection";

const orders = [
  { id: "pending-1", status: "PENDING_SHIPMENT" },
  { id: "shipped-1", status: "SHIPPED" },
  { id: "pending-2", status: "PENDING_SHIPMENT" },
  { id: "signed-1", status: "SIGNED" },
];

describe("admin order selection helpers", () => {
  it("finds only pending shipment orders in the current table view", () => {
    expect(getPendingOrderIds(orders)).toEqual(["pending-1", "pending-2"]);
  });

  it("selects all pending orders without selecting shipped or signed orders", () => {
    expect(togglePendingOrderSelection(orders, [])).toEqual([
      "pending-1",
      "pending-2",
    ]);
  });

  it("clears only pending selections when every pending order is selected", () => {
    expect(
      togglePendingOrderSelection(orders, [
        "pending-1",
        "pending-2",
        "manually-selected-shipped",
      ]),
    ).toEqual(["manually-selected-shipped"]);
  });

  it("checks header selection from pending orders only", () => {
    expect(areAllPendingOrdersSelected(orders, ["pending-1", "pending-2"])).toBe(
      true,
    );
    expect(
      areAllPendingOrdersSelected(orders, [
        "pending-1",
        "pending-2",
        "shipped-1",
      ]),
    ).toBe(true);
    expect(areAllPendingOrdersSelected(orders, ["pending-1"])).toBe(false);
    expect(areAllPendingOrdersSelected([{ id: "shipped-1", status: "SHIPPED" }], [])).toBe(
      false,
    );
  });

  it("detects unsaved batch logistics drafts for selected orders only", () => {
    expect(
      hasBatchShipLogisticsDraft(
        [{ id: "pending-1" }, { id: "pending-2" }],
        { "pending-1": "  SF001  " },
      ),
    ).toBe(true);
    expect(
      hasBatchShipLogisticsDraft(
        [{ id: "pending-1" }, { id: "pending-2" }],
        { "pending-1": "   ", "other-order": "SF999" },
      ),
    ).toBe(false);
  });
});
