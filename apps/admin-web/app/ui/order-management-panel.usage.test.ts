import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("order management batch ship modal", () => {
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
    expect(filterBlock).not.toContain("<select");
  });

  it("keeps the batch ship panel draggable, fullscreen-capable and resizable", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );
    const batchShipBlock = source.slice(
      source.indexOf("{batchShipOpen ? ("),
      source.indexOf("{modal ? ("),
    );

    expect(batchShipBlock).toContain("h-[66vh] w-[760px] max-w-full resize");
    expect(batchShipBlock).toContain("translate(");
    expect(batchShipBlock).toContain("onPointerDown={handleHeaderPointerDown}");
    expect(batchShipBlock).toContain("onPointerMove={handleHeaderPointerMove}");
    expect(batchShipBlock).toContain("onPointerCancel={handleHeaderPointerUp}");
    expect(batchShipBlock).toContain("onPointerUp={handleHeaderPointerUp}");
    expect(batchShipBlock).toContain(
      "onPointerDown={(event) => event.stopPropagation()}",
    );
    expect(batchShipBlock).toContain('title={fullscreen ? "退出全屏" : "全屏"}');
    expect(batchShipBlock).toContain("Maximize2");
    expect(batchShipBlock).toContain("Minimize2");
    expect(batchShipBlock).not.toContain(">全屏<");
  });

  it("resets shared modal placement when batch shipping opens or closes", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );
    const openBatchShipPanel = source.slice(
      source.indexOf("function openBatchShipPanel()"),
      source.indexOf("function closeBatchShipPanel()"),
    );
    const closeBatchShipPanel = source.slice(
      source.indexOf("function closeBatchShipPanel()"),
      source.indexOf("function exportOrders()"),
    );

    expect(closeBatchShipPanel).toContain("canCloseAdminModal");
    expect(closeBatchShipPanel).toContain("hasBatchShipLogisticsDraft");
    expect(closeBatchShipPanel).not.toContain("window.confirm");
    for (const block of [openBatchShipPanel, closeBatchShipPanel]) {
      expect(block).toContain("setFullscreen(false)");
      expect(block).toContain("setOffset({ x: 0, y: 0 })");
    }
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
});
