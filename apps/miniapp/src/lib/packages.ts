import { formatMiniDateTimeMinute } from "./datetime";

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
  usageDetails?: MiniappPackageUsageState[];
  usedTimes: number;
  weightLimitJin: number;
};

export type MiniappPackageUsageState = {
  benefits?: Array<{
    id: string;
    nameSnapshot: string;
    quantity?: number | null;
    unitSnapshot?: string | null;
  }>;
  createdAt?: string | null;
  id: string;
  items?: Array<{
    dishNameSnapshot: string;
    id: string;
    weightJin?: number | null;
  }>;
  orderNo?: string | null;
  status: string;
  totalWeightJin?: number | null;
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

export function getFirstPackageItem<T extends MiniappPackageCardState>(
  items: T[] = [],
) {
  return items[0] ?? null;
}

export function getPackageSlidePosition(currentIndex: number, total: number) {
  if (total <= 0) {
    return "";
  }

  const safeIndex = Math.min(Math.max(currentIndex, 0), total - 1);
  return `${safeIndex + 1} / ${total}`;
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

export function formatPackageUsageDate(value?: string | null) {
  return formatMiniDateTimeMinute(value);
}

export function getPackageUsageStatusLabel(status: string) {
  const statusLabels: Record<string, string> = {
    CANCELED: "已取消",
    PENDING_SHIPMENT: "待配送",
    SHIPPED: "配送中",
    SIGNED: "已签收",
    VOIDED: "已作废",
  };

  return statusLabels[status] ?? status;
}

export function getPackageUsageWeightLabel(value?: number | null) {
  const weight = Number(value ?? 0);
  return weight > 0 ? `${formatMiniappJin(weight)}斤` : "附加权益";
}

export function getPackageUsageDetailText(usage: MiniappPackageUsageState) {
  const dishTexts =
    usage.items?.map((item) => {
      const weight = Number(item.weightJin ?? 0);
      return `${item.dishNameSnapshot} ${formatMiniappJin(weight)}斤`;
    }) ?? [];
  const benefitTexts =
    usage.benefits?.map((benefit) => {
      const quantity = Number(benefit.quantity ?? 0);
      return `${benefit.nameSnapshot} ${formatMiniappJin(quantity)}${benefit.unitSnapshot ?? ""}`;
    }) ?? [];
  const details = [...dishTexts, ...benefitTexts].filter(Boolean);

  return details.length > 0 ? details.join("、") : "暂无菜品明细";
}
