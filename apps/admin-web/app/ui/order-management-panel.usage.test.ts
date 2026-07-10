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
    expect(deliveryBlock).toContain("例如：蔬菜包裹");
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

  it("shows the delivery recipient from the order address snapshot in the detail modal", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );
    const detailBlock = source.slice(
      source.indexOf("<h3 className=\"text-base font-semibold\">基础信息</h3>"),
      source.indexOf("<h3 className=\"text-base font-semibold\">菜品明细</h3>"),
    );

    expect(detailBlock).toContain("收货人");
    expect(detailBlock).toContain(
      'textFromSnapshot(modal.item.addressSnapshot, "receiverName")',
    );
    expect(detailBlock).toContain(
      'textFromSnapshot(modal.item.addressSnapshot, "receiverPhone")',
    );
  });

  it("does not keep fixed cutoff copy on the order management page", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("orderTasks?: OrderCutoffTask[]");
    expect(source).toContain("orderTasks = []");
    expect(source).not.toContain("今日截单");
    expect(source).not.toContain("还有 3小时");
    expect(source).not.toContain("12分");
  });

  it("keeps the order management page focused on the list instead of top statistic cards", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );

    expect(source).not.toContain('["今日待发货", summary.pendingShipment');
    expect(source).not.toContain('["今日订单", summary.total');
    expect(source).not.toContain('["已发货", summary.shipped');
    expect(source).not.toContain('["已签收", summary.signed');
    expect(source).not.toContain('<div className="text-sm font-medium text-[#66756d]">今日截单</div>');
  });

  it("requires a confirmation dialog before generating electronic waybills", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("AdminConfirmDialog");
    expect(source).toContain("printConfirmOrderIds");
    expect(source).toContain("requestElectronicWaybillConfirmation");
    expect(source).toContain("确认生成电子面单");
    expect(source).toContain("生成后会写入物流单号");
    expect(source).toContain("onConfirm={confirmElectronicWaybillPrint}");
    expect(source).not.toContain("onClick={() => void cloudPrintOrders()}");
    expect(source).not.toContain("onClick={() => void cloudPrintOrders([order.id])}");
  });

  it("validates address completeness before generating electronic waybills", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("function electronicWaybillAddressIssue(order: OrderPanelItem)");
    expect(source).toContain("function findElectronicWaybillAddressIssue(");
    expect(source).toContain("详细地址过短，请补充街道、小区、楼栋或门牌号");
    expect(source).toContain("请先编辑会员地址或让用户补充后再生成电子面单");
    expect(source).toContain("const addressIssue = findElectronicWaybillAddressIssue(ids, items)");
    expect(source).toContain("const addressIssue = findElectronicWaybillAddressIssue(orderIds, items)");
    expect(source).toContain("省、市、区需要填写完整");
  });

  it("supports canceling pending orders with a required reason confirmation", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("cancelCandidate");
    expect(source).toContain("cancelReason");
    expect(source).toContain("requestCancelOrder(order)");
    expect(source).toContain("/cancel");
    expect(source).toContain("取消原因");
    expect(source).toContain("请输入取消原因");
    expect(source).toContain("confirmDisabled={saving || !cancelReason.trim()}");
    expect(source).toContain("确认取消订单");
    expect(source).toContain("订单会保留在后台，并标记为已取消");
  });

  it("keeps order detail modal compact with four-column detail sections", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/order-management-panel.tsx"),
      "utf8",
    );
    const detailBlock = source.slice(
      source.indexOf("<h3 className=\"text-base font-semibold\">基础信息</h3>"),
      source.indexOf("{modal.mode === \"edit\" ?", source.indexOf("配送处理")),
    );

    expect(detailBlock).toContain("md:grid-cols-2 xl:grid-cols-4");
    expect(detailBlock).toContain("grid-cols-[repeat(auto-fill,minmax(112px,1fr))]");
    expect(detailBlock).toContain("px-2.5 py-1.5 text-sm");
    expect(detailBlock).toContain("modalIsReadOnly ? (");
    expect(detailBlock).toContain("sm:grid-cols-2 xl:grid-cols-4");
    expect(detailBlock).toContain("rounded-lg border border-[#dbe6dc] bg-[#f8fbf7] px-3 py-2 text-sm");
    expect(detailBlock).toContain("h-9 w-full");
  });
});
