type StoreOption = {
  id: string;
  name: string;
};

export type PackagePanelItem = {
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
    id: string;
    orderNo: string;
    status: string;
    totalWeightJin: number;
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
    expiresAt: item.expiresAt ?? "",
    frozenReason: item.frozenReason ?? null,
    id: item.id ?? "",
    lastUsedAt: item.lastUsedAt ?? null,
    nameSnapshot: item.nameSnapshot ?? item.templateName ?? "用户套餐",
    operationLogs: item.operationLogs ?? [],
    recentOrders: item.recentOrders ?? [],
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
