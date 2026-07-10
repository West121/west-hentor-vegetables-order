import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readAppFile(path: string) {
  return readFileSync(join(process.cwd(), "app", path), "utf8");
}

describe("admin operation log coverage", () => {
  it("loads operation logs across resources by default instead of only admin users", () => {
    const pageSource = readAppFile("dashboard-client.tsx");
    const panelSource = readAppFile("ui/operation-logs-panel.tsx");

    expect(pageSource).not.toContain('resource: "admin_user"');
    expect(panelSource).not.toContain('resource: "admin_user"');
  });

  it("labels order lifecycle operation logs for audit readability", () => {
    const panelSource = readAppFile("ui/operation-logs-panel.tsx");

    expect(panelSource).toContain('MINIAPP_ADDRESS_CREATED: "新增收货地址"');
    expect(panelSource).toContain('MINIAPP_ADDRESS_UPDATED: "编辑收货地址"');
    expect(panelSource).toContain('MINIAPP_ADDRESS_DEFAULT_SET: "设为默认地址"');
    expect(panelSource).toContain('MINIAPP_ADDRESS_DELETED: "删除收货地址"');
    expect(panelSource).toContain('MINIAPP_PHONE_LOGIN: "小程序登录"');
    expect(panelSource).toContain('MEMBER_CREATED: "新建会员"');
    expect(panelSource).toContain('ORDER_CREATED: "新建订单"');
    expect(panelSource).toContain('ORDER_INTERNAL_REMARK_UPDATED: "编辑订单备注"');
    expect(panelSource).toContain('ORDER_SHIPPED: "订单发货"');
    expect(panelSource).toContain('ORDER_SIGNED: "订单签收"');
    expect(panelSource).toContain('ORDER_VOIDED: "作废订单"');
  });

  it("renders detailed audit metadata in operation logs", () => {
    const panelSource = readAppFile("ui/operation-logs-panel.tsx");
    const pageSource = readAppFile("dashboard-client.tsx");

    expect(panelSource).toContain("requestParams");
    expect(panelSource).toContain("responseData");
    expect(panelSource).toContain("durationMs");
    expect(panelSource).toContain("statusCode");
    expect(panelSource).toContain("formatDateTimeSecond");
    expect(panelSource).toContain('"./date-format"');
    expect(pageSource).toContain("initialLogs={data.operationLogs}");
  });

  it("keeps admin users and operation logs as separate section panels", () => {
    const pageSource = readAppFile("dashboard-client.tsx");
    const adminUserPanelSource = readAppFile("ui/system-management-panel.tsx");
    const operationLogPanelSource = readAppFile("ui/operation-logs-panel.tsx");

    expect(pageSource).toContain('activeSection === "admin-users"');
    expect(pageSource).toContain("<SystemManagementPanel");
    expect(pageSource).toContain('activeSection === "operation-logs"');
    expect(pageSource).toContain("<OperationLogsPanel");
    expect(pageSource).not.toContain(
      'activeSection === "admin-users" || activeSection === "operation-logs"',
    );
    expect(adminUserPanelSource).not.toContain("initialLogs");
    expect(adminUserPanelSource).not.toContain("刷新日志");
    expect(operationLogPanelSource).toContain("独立展示关键操作记录");
  });

  it("keeps the log list compact and moves verbose payloads into a detail dialog", () => {
    const panelSource = readAppFile("ui/operation-logs-panel.tsx");

    expect(panelSource).toContain("selectedLog");
    expect(panelSource).toContain("操作日志详情");
    expect(panelSource).toContain("openLogDetail");
    expect(panelSource).toContain("compactText");
    expect(panelSource).toContain("业务操作记录");
    expect(panelSource).toContain("路径未采集");
    expect(panelSource).not.toContain("METHOD");
    expect(panelSource).not.toContain("未记录路径");
    expect(panelSource).toContain("title={");
    expect(panelSource).toContain("truncate");
    expect(panelSource).toContain("请求信息");
    expect(panelSource).toContain("响应信息");
    expect(panelSource).not.toContain('<th className="px-4 py-3 font-medium">请求参数</th>');
    expect(panelSource).not.toContain('<th className="px-4 py-3 font-medium">返回参数</th>');
  });
});
