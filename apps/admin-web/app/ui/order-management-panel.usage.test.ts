import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("order management panel", () => {
  it("uses shadcn select for the order status filter instead of a native select", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );
    const filterBlock = source.slice(
      source.indexOf("<AdminDatePicker"),
      source.indexOf("<button", source.indexOf("查询")),
    );

    expect(source).toContain('from "@/components/ui/select"');
    expect(filterBlock).toContain("<Select");
    expect(filterBlock).toContain("<SelectTrigger");
    expect(filterBlock).toContain("<SelectContent");
    expect(filterBlock).toContain("<SelectGroup");
    expect(filterBlock).toContain("<SelectLabel>订单状态</SelectLabel>");
    expect(filterBlock).toContain("{filter.label}");
    expect(filterBlock).not.toContain("订单状态：{filter.label}");
    expect(filterBlock).not.toContain("<select");
  });

  it("only exposes electronic waybill actions for shipping labels", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );
    expect(source).toContain("async function cloudPrintOrders(");
    expect(source).toContain("电子面单");
    expect(source).toContain("CloudUpload");
    expect(source).toContain("function currentPrintOrderIds() {\n    return selectedOrderIds;\n  }");
    expect(source).toContain("请先勾选需要生成电子面单的待配送订单");
    expect(source).toContain('aria-label="选择当前页可生成电子面单的订单"');
    expect(source).toContain("function canCreateElectronicWaybill(order: OrderPanelItem)");
    expect(source).not.toContain("批量发货");
    expect(source).not.toContain("面单预览");
  });

  it("asks operators to choose a printer when there are more than two active printers", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("loadActivePrinters");
    expect(source).toContain("/api/admin/kuaidi-printers");
    expect(source).toContain("printers.length > 2");
    expect(source).toContain("setPrinterSelectorOpen(true)");
    expect(source).toContain("选择电子面单打印机");
    expect(source).toContain("printerId");
  });

  it("does not keep the removed manual batch shipping workflow", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );

    expect(source).not.toContain("batchShipOpen");
    expect(source).not.toContain("function openBatchShipPanel()");
    expect(source).not.toContain("function closeBatchShipPanel()");
    expect(source).not.toContain("hasBatchShipLogisticsDraft");
  });

  it("lets operators add multiple shipment rows in the order edit modal", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );
    const deliveryBlock = source.slice(
      source.indexOf("<h3 className=\"text-base font-semibold\">配送处理</h3>"),
      source.indexOf("{modal.mode === \"edit\" ?", source.indexOf("配送处理")),
    );

    expect(source).toContain("Plus");
    expect(source).toContain("Trash2");
    expect(source).toContain("function addShipmentRow()");
    expect(source).toContain("function removeShipmentRow(index: number)");
    expect(deliveryBlock).toContain("新增包裹");
    expect(deliveryBlock).toContain("包裹名称");
    expect(deliveryBlock).toContain("例如：蔬菜包裹、鸡蛋包裹");
    expect(deliveryBlock).toContain("录入运单号");
    expect(deliveryBlock).toContain("packageName: event.target.value");
    expect(deliveryBlock).toContain("logisticsNo: event.target.value");
  });

  it("renders member avatars in order rows and detail modal", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("AdminMemberAvatar");
    expect(source).toContain("avatarUrl={order.user?.avatarUrl}");
    expect(source).toContain("avatarUrl={modal.item.user?.avatarUrl}");
  });

  it("calculates today's cutoff card from task data instead of fixed copy", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );
    const cutoffBlock = source.slice(
      source.indexOf("function buildCutoffDisplay"),
      source.indexOf("<div className=\"flex flex-nowrap", source.indexOf("今日截单")),
    );

    expect(source).toContain("orderTasks?: OrderCutoffTask[]");
    expect(source).toContain("orderTasks = []");
    expect(source).toContain("const [now, setNow] = useState(() => new Date())");
    expect(source).toContain("window.setInterval(() => setNow(new Date()), 60_000)");
    expect(cutoffBlock).toContain("buildCutoffDisplay(orderTasks, now)");
    expect(cutoffBlock).toContain("{cutoffDisplay.cutoffText}");
    expect(cutoffBlock).toContain("cutoffDisplay.detailLines.map");
    expect(source).not.toContain("还有 3小时");
    expect(source).not.toContain("12分");
  });
});
