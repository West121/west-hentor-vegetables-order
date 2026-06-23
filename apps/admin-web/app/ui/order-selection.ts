type OrderSelectionItem = {
  id: string;
  status: string;
};

type BatchShipDraftItem = {
  id: string;
};

export function getPendingOrderIds(items: OrderSelectionItem[]) {
  return items
    .filter((item) => item.status === "PENDING_SHIPMENT")
    .map((item) => item.id);
}

export function areAllPendingOrdersSelected(
  items: OrderSelectionItem[],
  selectedOrderIds: string[],
) {
  const pendingOrderIds = getPendingOrderIds(items);

  return (
    pendingOrderIds.length > 0 &&
    pendingOrderIds.every((orderId) => selectedOrderIds.includes(orderId))
  );
}

export function togglePendingOrderSelection(
  items: OrderSelectionItem[],
  selectedOrderIds: string[],
) {
  const pendingOrderIds = getPendingOrderIds(items);
  const pendingOrderIdSet = new Set(pendingOrderIds);

  if (
    pendingOrderIds.length > 0 &&
    pendingOrderIds.every((orderId) => selectedOrderIds.includes(orderId))
  ) {
    return selectedOrderIds.filter((orderId) => !pendingOrderIdSet.has(orderId));
  }

  return [
    ...selectedOrderIds,
    ...pendingOrderIds.filter((orderId) => !selectedOrderIds.includes(orderId)),
  ];
}

export function hasBatchShipLogisticsDraft(
  items: BatchShipDraftItem[],
  logisticsByOrderId: Record<string, string>,
) {
  return items.some(
    (item) => (logisticsByOrderId[item.id] ?? "").trim().length > 0,
  );
}
