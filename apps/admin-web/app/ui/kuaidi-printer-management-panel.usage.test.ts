import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("kuaidi printer management panel", () => {
  it("provides CRUD and configurable request params for Kuaidi100 printers", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/kuaidi-printer-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("面单打印");
    expect(source).toContain("/api/admin/kuaidi-printers");
    expect(source).toContain("新建打印机");
    expect(source).toContain('"编辑"} · ${modal.item.name}');
    expect(source).toContain("删除打印机");
    expect(source).toContain("额外请求参数 JSON");
    expect(source).toContain("发货地址");
    expect(source).toContain("senderAddress");
    expect(source).toContain("发货手机号");
    expect(source).toContain("senderMobile");
    expect(source).toContain("parseRequestParams");
    expect(source).toContain("设为默认打印机");
  });

  it("registers the printer management page in the dashboard and navigation", () => {
    const dashboard = readFileSync(
      join(process.cwd(), "app/dashboard-client.tsx"),
      "utf8",
    );
    const navigation = readFileSync(
      join(process.cwd(), "app/lib/admin-navigation.ts"),
      "utf8",
    );

    expect(dashboard).toContain("KuaidiPrinterManagementPanel");
    expect(dashboard).toContain('activeSection === "kuaidi-printers"');
    expect(navigation).toContain('"kuaidi-printers"');
    expect(navigation).toContain("面单打印");
    expect(navigation).toContain('icon: "printer"');
  });
});
