type MemberState = {
  bindingStatus?: string | null;
  disabledReason?: string | null;
  status?: string | null;
};

type PackageUsageState = {
  nameSnapshot?: string | null;
  remainingTimes: number;
  totalTimes: number;
  usedTimes: number;
  weightLimitJin: number;
};

type TodayOrderState = {
  items?: unknown[];
  totalWeightJin: number;
};

export function getMemberLockNotice(member?: MemberState | null) {
  if (member?.bindingStatus !== "DISABLED" && member?.status !== "DISABLED") {
    return null;
  }

  return {
    actionText: "联系客服",
    message: member.disabledReason?.trim() || "请联系客服恢复服务",
    title: "账号服务已暂停",
  };
}

export function getPackageUsageStats(
  packageInfo?: PackageUsageState | null,
  reservedWeightJin = 0,
) {
  if (!packageInfo) {
    return {
      meta: "购买套餐入口已预留，微信支付暂未开放",
      remainingLabel: "0 次",
      remainingWeightLabel: "0斤",
      progressPercent: 0,
      title: "暂无套餐",
      usedLabel: "0 次",
    };
  }

  const remainingWeightJin = Math.max(0, packageInfo.weightLimitJin - reservedWeightJin);
  return {
    meta: `本周剩余 ${packageInfo.remainingTimes} 次 · 按添加时间先后使用`,
    remainingLabel: `${packageInfo.remainingTimes} 次`,
    remainingWeightLabel: `${formatJin(remainingWeightJin)}斤`,
    progressPercent: Math.min(
      100,
      Math.max(
        0,
        packageInfo.weightLimitJin > 0
          ? (remainingWeightJin / packageInfo.weightLimitJin) * 100
          : 0,
      ),
    ),
    title: packageInfo.nameSnapshot ?? `${formatJin(packageInfo.weightLimitJin)}斤周套餐`,
    usedLabel: `${packageInfo.usedTimes} 次`,
  };
}

export function getTodayOrderMeta(
  order?: TodayOrderState | null,
) {
  if (!order) {
    return "从首页选择菜品后提交预订";
  }

  const itemCount = order.items?.length ?? 0;
  const itemText = itemCount > 0 ? `${itemCount}样菜` : "已选菜品";

  return `${itemText} · ${formatJin(order.totalWeightJin)}斤`;
}

export function getOrderStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    CANCELED: "已取消",
    PENDING_SHIPMENT: "待发货",
    SHIPPED: "已发货",
    SIGNED: "已签收",
    VOIDED: "已作废",
  };

  return status ? (labels[status] ?? status) : "未知状态";
}

function formatJin(value: number) {
  const rounded = Number(value.toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
