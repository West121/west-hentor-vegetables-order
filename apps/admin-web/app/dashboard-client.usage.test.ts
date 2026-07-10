import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("dashboard permission wiring", () => {
  const source = readFileSync(
    join(process.cwd(), "app/dashboard-client.tsx"),
    "utf8",
  );

  it("keeps navigation visibility separate from write actions", () => {
    expect(source).toContain("const hasPermission = (code: string)");
    expect(source).toContain('canWrite={hasPermission("orders.write")}');
    expect(source).toContain('canWrite={hasPermission("members.write")}');
    expect(source).toContain('canWrite={hasPermission("packages.write")}');
    expect(source).toContain('canWrite={hasPermission("dishes.write")}');
    expect(source).toContain('canWrite={hasPermission("tasks.write")}');
  });

  it("uses the reserved primary store internally when no store is assigned", () => {
    expect(source).toContain("DEFAULT_DATA_STORE");
    expect(source).toMatch(/session\.stores\[0\]\s*\?\?\s*DEFAULT_DATA_STORE/);
    expect(source).not.toContain("当前账号未分配数据范围");
  });

  it("refreshes and remounts section lists after menu switching", () => {
    expect(source).toContain("lastLoadedSectionRef");
    expect(source).toContain("setDataRevision");
    expect(source).toContain("refreshDashboardData");
    expect(source).toContain("key={`${activeSection}-${dataRevision}-${initialListQuery}`}");
  });

  it("renders animated overview statistics without the payment placeholder", () => {
    expect(source).toContain("dashboardMetrics");
    expect(source).toContain("fulfillmentSteps");
    expect(source).toContain("packageHealth");
    expect(source).toContain("dishHealth");
    expect(source).toContain("readinessItems");
    expect(source).toContain("admin-overview-card");
    expect(source).toContain("admin-overview-ring");
    expect(source).toContain("admin-overview-bar");
    expect(source).toContain("履约流程");
    expect(source).toContain("套餐与会员");
    expect(source).toContain("菜品库存");
    expect(source).toContain("今日运营准备");
    expect(source).not.toContain("stroke=\"#d59a26\"");
    expect(source).not.toContain("支付预留");
    expect(source).not.toContain("purchase order");
  });
});
