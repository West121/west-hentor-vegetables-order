import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("miniapp orders page interactions", () => {
  it("uses separate edit and cancel buttons instead of a pending-order action sheet", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/orders/index.tsx"),
      "utf8",
    );

    expect(source).toContain("/pages/order-edit/index?orderId=");
    expect(source).toContain("修改");
    expect(source).toContain("取消");
    expect(source).toContain("MiniConfirmModal");
    expect(source).toContain("showConfirmDialog");
    expect(source).toContain('tone: "danger"');
    expect(source).toContain("取消后会恢复本次套餐次数和附加权益");
    expect(source).not.toContain("openPendingActions");
    expect(source).not.toContain("showActionSheet");
    expect(source).not.toContain("showModal");
    expect(source).not.toContain("CANCEL_REASONS");
    expect(source).not.toContain("editing_order_id");
    expect(source).not.toContain("switchTab");
  });
});
