export type OrderStatusFilter =
  | "ALL"
  | "CANCELED"
  | "PENDING_SHIPMENT"
  | "SHIPPED"
  | "SIGNED";

export type OrderStatusLike = {
  status: string;
};

export type HideOrderUrlInput = {
  apiBaseUrl: string;
  orderId: string;
  storeCode: string;
};

export type OrdersListUrlInput = {
  apiBaseUrl: string;
  storeCode: string;
};

export type CancelOrderUrlInput = {
  apiBaseUrl: string;
  orderId: string;
};

export const ORDER_STATUS_TABS: Array<{
  key: OrderStatusFilter;
  label: string;
}> = [
  { key: "PENDING_SHIPMENT", label: "待发货" },
  { key: "SHIPPED", label: "已发货" },
  { key: "SIGNED", label: "已签收" },
  { key: "CANCELED", label: "已取消" },
];

export const CANCEL_REASONS = [
  "临时不需要了",
  "菜品选错了",
  "地址需要调整",
  "其他原因",
];

export function filterOrdersByStatus<T extends OrderStatusLike>(
  orders: T[],
  status: OrderStatusFilter,
): T[] {
  if (status === "ALL") {
    return orders;
  }

  if (status === "CANCELED") {
    return orders.filter(
      (order) => order.status === "CANCELED" || order.status === "VOIDED",
    );
  }

  return orders.filter((order) => order.status === status);
}

export function buildOrderStatusCounts(orders: OrderStatusLike[]) {
  return {
    ALL: orders.length,
    CANCELED: filterOrdersByStatus(orders, "CANCELED").length,
    PENDING_SHIPMENT: filterOrdersByStatus(orders, "PENDING_SHIPMENT").length,
    SHIPPED: filterOrdersByStatus(orders, "SHIPPED").length,
    SIGNED: filterOrdersByStatus(orders, "SIGNED").length,
  };
}

export function buildHideOrderUrl({
  apiBaseUrl,
  orderId,
  storeCode,
}: HideOrderUrlInput) {
  return `${apiBaseUrl}/api/v1/orders/${encodeURIComponent(
    orderId,
  )}/user-visible?storeCode=${encodeURIComponent(storeCode)}`;
}

export function buildOrdersListUrl({ apiBaseUrl, storeCode }: OrdersListUrlInput) {
  return `${apiBaseUrl}/api/v1/orders?storeCode=${encodeURIComponent(storeCode)}`;
}

export function buildCancelOrderUrl({
  apiBaseUrl,
  orderId,
}: CancelOrderUrlInput) {
  return `${apiBaseUrl}/api/v1/orders/${encodeURIComponent(orderId)}/cancel`;
}
