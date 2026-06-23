export type PackagePurchaseActionInput = {
  enabled: boolean;
  purchaseStatus: string;
  templateId?: string | null;
};

export type PackagesUrlInput = {
  apiBaseUrl: string;
  storeCode: string;
};

export type PackagePrepayUrlInput = {
  apiBaseUrl: string;
  purchaseOrderId: string;
  storeCode: string;
};

export type MiniappPackageCardState = {
  nameSnapshot: string;
  remainingTimes: number;
  status: string;
  totalTimes: number;
  usedTimes: number;
  weightLimitJin: number;
};

export function getPackagePurchaseAction({
  enabled,
  purchaseStatus,
  templateId,
}: PackagePurchaseActionInput) {
  if (!templateId) {
    return {
      canReserveIntent: false,
      disabled: true,
      label: "不可购买",
      meta: "暂无可购买套餐",
    };
  }

  if (!enabled && purchaseStatus === "PAYMENT_NOT_ENABLED") {
    return {
      canReserveIntent: true,
      disabled: false,
      label: "预留购买",
      meta: "微信支付暂未开放，点击后仅记录购买意向",
    };
  }

  return {
    canReserveIntent: true,
    disabled: false,
    label: "购买",
    meta: "微信支付入口已预留",
  };
}

export function getPackagePurchaseToast(status?: string) {
  return status === "PAYMENT_NOT_ENABLED"
    ? "已记录购买意向，微信支付暂未开放"
    : "购买入口已预留";
}

export function buildPackagesUrl({ apiBaseUrl, storeCode }: PackagesUrlInput) {
  return `${apiBaseUrl}/api/v1/packages?storeCode=${encodeURIComponent(storeCode)}`;
}

export function buildPackagePrepayUrl({
  apiBaseUrl,
  purchaseOrderId,
  storeCode,
}: PackagePrepayUrlInput) {
  return `${apiBaseUrl}/api/v1/package-purchases/${encodeURIComponent(
    purchaseOrderId,
  )}/wechat-prepay?storeCode=${encodeURIComponent(storeCode)}`;
}

export function getCurrentPackageItem<T extends MiniappPackageCardState>(
  items: T[] = [],
) {
  return (
    items.find(
      (item) => item.status === "ACTIVE" && item.remainingTimes > 0,
    ) ??
    items.find((item) => item.status === "ACTIVE") ??
    items[0] ??
    null
  );
}

export function getPackageHeroView(packageInfo?: MiniappPackageCardState | null) {
  if (!packageInfo) {
    return {
      cycleMeta: "暂无套餐用量",
      cycleProgressPercent: 0,
      nextOrderLabel: "购买套餐后可预订",
      remainingTimesLabel: "0次剩余",
      statusLabel: "未开通",
      statusMeta: "购买入口已预留",
      subtitle: "购买后可按套餐额度预订蔬菜",
      title: "家庭蔬菜套餐",
      weightBenefitLabel: "套餐额度",
      weightBenefitMeta: "按套餐规则使用",
    };
  }

  const statusLabelMap: Record<string, string> = {
    ACTIVE: "已开通",
    EXPIRED: "不可用",
    FROZEN: "已冻结",
    USED_UP: "已用完",
  };
  return {
    cycleMeta: `已用 ${packageInfo.usedTimes}/${packageInfo.totalTimes} 次 · 剩余 ${packageInfo.remainingTimes} 次`,
    cycleProgressPercent:
      packageInfo.totalTimes > 0
        ? Math.min(
            100,
            Math.max(0, (packageInfo.usedTimes / packageInfo.totalTimes) * 100),
          )
        : 0,
    nextOrderLabel: "按添加时间先后使用",
    remainingTimesLabel: `${packageInfo.remainingTimes}次剩余`,
    statusLabel: statusLabelMap[packageInfo.status] ?? packageInfo.status,
    statusMeta: `剩余 ${packageInfo.remainingTimes} 次`,
    subtitle: `${formatMiniappJin(packageInfo.weightLimitJin)}斤/次 · 每周配送 · 支持截单前修改`,
    title: packageInfo.nameSnapshot || "家庭蔬菜套餐",
    weightBenefitLabel: `${formatMiniappJin(packageInfo.weightLimitJin)}斤额度`,
    weightBenefitMeta: `每次最多选 ${formatMiniappJin(packageInfo.weightLimitJin)}斤`,
  };
}

export function formatMiniappJin(value: number) {
  const rounded = Number(value.toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
