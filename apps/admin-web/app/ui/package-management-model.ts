type StoreOption = {
  id: string;
  name: string;
};

export type PackagePanelItem = {
  benefits?: Array<{
    id: string;
    kind: string;
    nameSnapshot: string;
    shipmentGroup: string | null;
    sortOrder: number;
    totalQuantity: number;
    unitSnapshot: string;
    usedQuantity: number;
  }>;
  createdAt: string;
  expiresAt: string;
  frozenReason: string | null;
  id: string;
  lastUsedAt: string | null;
  nameSnapshot: string;
  operationLogs?: Array<{
    id: string;
    operator: { id: string; name: string } | null;
    reason: string;
  }>;
  recentOrders?: Array<{
    createdAt?: string;
    id: string;
    items?: Array<{
      dishId: string;
      dishNameSnapshot: string;
      id: string;
      weightJin: number;
    }>;
    orderNo: string;
    status: string;
    totalWeightJin: number;
    updatedAt?: string;
  }>;
  remainingTimes: number;
  startsAt: string;
  status: "ACTIVE" | "FROZEN" | "EXPIRED" | "USED_UP";
  store: StoreOption;
  template: {
    id: string;
    name: string;
  };
  totalTimes: number;
  updatedAt: string;
  usedTimes: number;
  usagePercent: number;
  user: {
    avatarUrl?: string | null;
    id: string;
    nickname: string | null;
    phone: string | null;
    status: string;
  };
  weightLimitJin: number;
};

export type SpringPackagePanelItem = Partial<PackagePanelItem> & {
  storeId?: string;
  storeName?: string;
  templateId?: string;
  templateName?: string;
  userId?: string;
  userAvatarUrl?: string | null;
  userNickname?: string | null;
  userPhone?: string | null;
  userStatus?: string;
};

export function normalizePackagePanelItem(
  item: SpringPackagePanelItem,
): PackagePanelItem {
  const totalTimes = Number(item.totalTimes ?? 0);
  const usedTimes = Number(item.usedTimes ?? 0);
  const remainingTimes = Number(
    item.remainingTimes ?? Math.max(totalTimes - usedTimes, 0),
  );

  return {
    createdAt: item.createdAt ?? "",
    benefits: (item.benefits ?? []).map((benefit) => ({
      ...benefit,
      shipmentGroup: benefit.shipmentGroup ?? null,
      sortOrder: Number(benefit.sortOrder ?? 0),
      totalQuantity: Number(benefit.totalQuantity ?? 0),
      usedQuantity: Number(benefit.usedQuantity ?? 0),
    })),
    expiresAt: item.expiresAt ?? "",
    frozenReason: item.frozenReason ?? null,
    id: item.id ?? "",
    lastUsedAt: item.lastUsedAt ?? null,
    nameSnapshot: item.nameSnapshot ?? item.templateName ?? "用户套餐",
    operationLogs: item.operationLogs ?? [],
    recentOrders: (item.recentOrders ?? []).map((order) => ({
      ...order,
      items: (order.items ?? []).map((orderItem) => ({
        ...orderItem,
        weightJin: Number(orderItem.weightJin ?? 0),
      })),
      totalWeightJin: Number(order.totalWeightJin ?? 0),
    })),
    remainingTimes,
    startsAt: item.startsAt ?? item.createdAt ?? "",
    status: (item.status ?? "ACTIVE") as PackagePanelItem["status"],
    store: item.store ?? {
      id: item.storeId ?? "",
      name: item.storeName ?? "",
    },
    template: item.template ?? {
      id: item.templateId ?? "",
      name: item.templateName ?? item.nameSnapshot ?? "套餐模板",
    },
    totalTimes,
    updatedAt: item.updatedAt ?? item.createdAt ?? "",
    usedTimes,
    usagePercent:
      item.usagePercent ??
      (totalTimes > 0 ? Math.min(100, (usedTimes / totalTimes) * 100) : 0),
    user: item.user ?? {
      avatarUrl: item.userAvatarUrl ?? null,
      id: item.userId ?? "",
      nickname: item.userNickname ?? null,
      phone: item.userPhone ?? null,
      status: item.userStatus ?? "ACTIVE",
    },
    weightLimitJin: Number(item.weightLimitJin ?? 0),
  };
}

export function normalizePackagePanelItems(items: SpringPackagePanelItem[]) {
  return items.map(normalizePackagePanelItem);
}
