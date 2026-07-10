export type HomeDishLike = {
  category?: string;
  id: string;
  imageUrl?: string | null;
  name: string;
  remainingWeightJin?: number;
  stockJin?: number;
  totalWeightJin?: number;
  usedWeightJin?: number;
};

export type SelectedDishItem = {
  dishId: string;
  name: string;
  weightJin: number;
};

export type ReservationConfirmInput = {
  addressDetail: string;
  items: SelectedDishItem[];
  totalWeightJin: number;
};

export type ReservationEditConfirmInput = {
  addressDetail: string;
  currentItems: SelectedDishItem[];
  orderNo: string;
  originalItems: SelectedDishItem[];
  totalWeightJin: number;
};

export type DishSelection = Record<string, number>;

export type ChangeDishSelectionInput = {
  delta: number;
  dishId: string;
  isAvailable?: boolean;
  stepJin: number;
};

export type BuildHomeUrlInput = {
  apiBaseUrl: string;
  editingOrderId?: string;
  storeCode: string;
};

export type BuildReservationRequestOptionsInput = {
  addressId: string;
  apiBaseUrl: string;
  benefitSelections?: Array<{
    quantity: number;
    userPackageBenefitId: string;
  }>;
  editingOrderId?: string;
  items: SelectedDishItem[];
  storeCode: string;
  userPackageId: string;
};

export type EditingOrderResolutionInput = {
  currentOrder: null | {
    id: string;
  };
};

export type ReservationPackageLike = {
  frozenReason?: string | null;
  remainingTimes: number;
  status?: string;
};

export type ReservationGateInput = {
  hasCurrentOrder?: boolean;
  hasActiveTask?: boolean;
  isPastCutoff?: boolean;
  memberInfo?: {
    bindingStatus?: string | null;
    disabledReason?: string | null;
    status?: string | null;
  } | null;
  packageInfo: null | ReservationPackageLike | undefined;
};

export type ReservationAddressInput = {
  currentOrder?: {
    address?: {
      city?: string | null;
      detail?: string | null;
      district?: string | null;
      fullAddress?: string | null;
      province?: string | null;
    } | null;
    addressId?: string | null;
  } | null;
  defaultAddress?: {
    city?: string | null;
    detail?: string | null;
    district?: string | null;
    fullAddress?: string | null;
    id?: string | null;
    province?: string | null;
  } | null;
  selectedAddress?: {
    city?: string | null;
    detail?: string | null;
    district?: string | null;
    fullAddress?: string | null;
    id?: string | null;
    province?: string | null;
  } | null;
};

export type ReservationAddressResult = {
  detail: string;
  id: string | null;
  source: "currentOrder" | "default" | "missing" | "selected";
};

export type ReservationSummaryMetaInput = {
  isOverLimit: boolean;
  packageMeta?: string | null;
  selectedCount: number;
};

export type UnderPackageLimitConfirmInput = {
  mode: "create" | "edit";
  totalWeightJin: number;
  weightLimitJin: number;
};

export type UnderPackageLimitConfirm = {
  cancelText: string;
  confirmText: string;
  content: string;
  title: string;
};

export type ReservationConfirmViewInput = {
  addressDetail: string;
  benefits?: Array<{
    kind?: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
  cutoffTime?: string | null;
  currentItems: SelectedDishItem[];
  mode: "create" | "edit";
  originalItems?: SelectedDishItem[];
  receiverName?: string | null;
  receiverPhone?: string | null;
  totalWeightJin: number;
  weightLimitJin: number;
};

export type ReservationConfirmViewRow = {
  label: string;
  tag: string;
  tone: "danger" | "muted" | "positive" | "warning";
};

export type ReservationConfirmView = {
  addressDetail: string;
  addressMeta: string;
  benefits: Array<{
    kind?: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
  detailTitle: string;
  main: string;
  meta: string;
  noticeMeta: string;
  noticeTitle: string;
  primaryText: string;
  progressPercent: number;
  rows: ReservationConfirmViewRow[];
  secondaryText: string;
  stateLabel: string;
  summaryLabel: string;
  title: string;
};

export type PackageCardMetaInput = {
  currentOrderNo?: string | null;
  packageMeta?: string | null;
  remainingTimes: number;
  weightLimitJin: number;
};

export type PackageUsageMetaInput = {
  remainingTimes: number;
  totalTimes?: number | null;
  usedTimes?: number | null;
};

export type PackageUsageProgressInput = PackageUsageMetaInput;

export type PackageBenefitLike = {
  id: string;
  kind: string;
  name: string;
  remainingQuantity: number;
  unit: string;
};

export type BenefitSelection = Record<string, number>;

export type ChangeBenefitSelectionInput = {
  benefitId: string;
  delta: number;
  maxQuantity: number;
  step?: number;
};

export type SelectedPackageBenefit = {
  id: string;
  kind: string;
  name: string;
  quantity: number;
  unit: string;
};

export type DishFallbackImageKey =
  | "cabbage"
  | "cucumber"
  | "greens"
  | "lettuce"
  | "spinach"
  | "tomato";

export const DEFAULT_HOME_DISH_COLUMNS = 3;

function normalizeWeight(value: number) {
  return Number(value.toFixed(2));
}

function formatJin(value: number) {
  const normalized = normalizeWeight(value);
  return Number.isInteger(normalized)
    ? String(normalized)
    : String(normalized).replace(/0+$/, "").replace(/\.$/, "");
}

function formatSignedJin(value: number) {
  const normalized = normalizeWeight(value);
  return `${normalized > 0 ? "+" : ""}${formatJin(normalized)}斤`;
}

function formatAddressDisplay(
  address:
    | {
        city?: string | null;
        detail?: string | null;
        district?: string | null;
        fullAddress?: string | null;
        province?: string | null;
      }
    | null
    | undefined,
  fallback: string,
) {
  const explicit = address?.fullAddress?.trim();
  if (explicit) {
    return explicit;
  }

  const fullAddress = [
    address?.province,
    address?.city,
    address?.district,
    address?.detail,
  ]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");

  return fullAddress || fallback;
}

function sumWeight(items: SelectedDishItem[]) {
  return normalizeWeight(
    items.reduce((total, item) => total + item.weightJin, 0),
  );
}

export function maskPhone(phone?: string | null) {
  const normalized = phone?.trim();
  if (!normalized) {
    return "";
  }

  return normalized.length >= 7
    ? `${normalized.slice(0, 3)}****${normalized.slice(-4)}`
    : normalized;
}

export function isPastCutoff(cutoffTime: string | null | undefined, now = new Date()) {
  const matched = cutoffTime?.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!matched) {
    return false;
  }

  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= hour * 60 + minute;
}

export function buildSelectedItems(
  dishes: HomeDishLike[],
  selected: DishSelection,
  fallbackItems: SelectedDishItem[] = [],
): SelectedDishItem[] {
  const dishById = new Map(dishes.map((dish) => [dish.id, dish]));
  const fallbackById = new Map(
    fallbackItems.map((item) => [item.dishId, item]),
  );

  return Object.entries(selected)
    .map(([dishId, weightJin]) => {
      const dish = dishById.get(dishId);
      const fallback = fallbackById.get(dishId);
      if (!dish && !fallback) {
        return null;
      }

      return {
        dishId,
        name: dish?.name ?? fallback!.name,
        weightJin,
      };
    })
    .filter((item): item is SelectedDishItem => item !== null)
    .filter((item) => item.weightJin > 0);
}

export function getDisplayDishes<T extends HomeDishLike>(dishes: T[]): T[] {
  return dishes;
}

export function getUnavailableSelectedItems(
  dishes: HomeDishLike[],
  selected: DishSelection,
  fallbackItems: SelectedDishItem[] = [],
): SelectedDishItem[] {
  const availableDishIds = new Set(dishes.map((dish) => dish.id));
  return buildSelectedItems(dishes, selected, fallbackItems).filter(
    (item) => !availableDishIds.has(item.dishId),
  );
}

export function getHomeDishColumns(value?: number | string | null) {
  const columns =
    typeof value === "number" ? value : Number(String(value ?? "").trim());

  return columns === 2 || columns === 3 || columns === 4
    ? columns
    : DEFAULT_HOME_DISH_COLUMNS;
}

export function getDishFallbackImageKey(name: string): DishFallbackImageKey {
  const value = name.trim();
  if (value.includes("菠菜")) {
    return "spinach";
  }
  if (value.includes("生菜")) {
    return "lettuce";
  }
  if (value.includes("小白菜") || value.includes("白菜")) {
    return "cabbage";
  }
  if (value.includes("番茄") || value.includes("西红柿")) {
    return "tomato";
  }
  if (value.includes("黄瓜")) {
    return "cucumber";
  }

  return "greens";
}

export function getDishDisplayImage(
  dish: Pick<HomeDishLike, "imageUrl" | "name">,
  fallbackImages: Record<DishFallbackImageKey, string>,
) {
  const imageUrl = dish.imageUrl?.trim();
  return imageUrl || fallbackImages[getDishFallbackImageKey(dish.name)];
}

export function changeDishSelection(
  selected: DishSelection,
  input: ChangeDishSelectionInput,
): DishSelection {
  if (input.isAvailable === false && input.delta > 0) {
    return selected;
  }

  const rawNext = Math.max((selected[input.dishId] ?? 0) + input.delta, 0);
  const stepped =
    input.stepJin > 0
      ? Math.round(rawNext / input.stepJin) * input.stepJin
      : rawNext;

  return {
    ...selected,
    [input.dishId]: normalizeWeight(stepped),
  };
}

export function getPackageBenefitDisplays<T extends PackageBenefitLike>(
  benefits: T[],
): T[] {
  return benefits;
}

export function getSelectablePackageBenefits<T extends PackageBenefitLike>(
  benefits: T[],
): T[] {
  return benefits.filter((benefit) => benefit.remainingQuantity > 0);
}

export function changeBenefitSelection(
  selected: BenefitSelection,
  input: ChangeBenefitSelectionInput,
): BenefitSelection {
  const step = input.step && input.step > 0 ? input.step : 1;
  const maxQuantity = Math.max(input.maxQuantity, 0);
  const rawNext = Math.max((selected[input.benefitId] ?? 0) + input.delta, 0);
  const stepped = Math.round(rawNext / step) * step;
  const next = normalizeWeight(Math.min(stepped, maxQuantity));

  return {
    ...selected,
    [input.benefitId]: next,
  };
}

export function buildSelectedBenefits<T extends PackageBenefitLike>(
  benefits: T[],
  selected: BenefitSelection,
): SelectedPackageBenefit[] {
  return benefits
    .map((benefit) => {
      const quantity = selected[benefit.id] ?? 0;
      const availableQuantity = Math.max(benefit.remainingQuantity, 0);
      return {
        id: benefit.id,
        kind: benefit.kind,
        name: benefit.name,
        quantity: normalizeWeight(Math.min(quantity, availableQuantity)),
        unit: benefit.unit,
      };
    })
    .filter((benefit) => benefit.quantity > 0);
}

export function buildHomeUrl({
  apiBaseUrl,
  editingOrderId,
  storeCode,
}: BuildHomeUrlInput) {
  const url = `${apiBaseUrl}/api/v1/home?storeCode=${encodeURIComponent(storeCode)}`;
  return editingOrderId
    ? `${url}&orderId=${encodeURIComponent(editingOrderId)}`
    : url;
}

export function buildReservationRequestOptions({
  addressId,
  apiBaseUrl,
  benefitSelections = [],
  editingOrderId,
  items,
  storeCode,
  userPackageId,
}: BuildReservationRequestOptionsInput) {
  const data = {
    addressId,
    items: items.map((item) => ({
      dishId: item.dishId,
      weightJin: item.weightJin,
    })),
    storeCode,
    userPackageId,
  };

  if (benefitSelections.length || editingOrderId) {
    Object.assign(data, { benefitSelections });
  }

  if (editingOrderId) {
    return {
      data,
      method: "PUT" as const,
      url: `${apiBaseUrl}/api/v1/orders/${encodeURIComponent(editingOrderId)}`,
    };
  }

  return {
    data,
    method: "POST" as const,
    url: `${apiBaseUrl}/api/v1/reservations`,
  };
}

export function buildReservationConfirmContent({
  addressDetail,
  items,
  totalWeightJin,
}: ReservationConfirmInput) {
  const itemText = items
    .map((item) => `${item.name} ${item.weightJin}斤`)
    .join(" / ");

  return `${itemText}\n合计 ${totalWeightJin}斤\n配送至：${addressDetail}`;
}

function formatReservationItems(items: SelectedDishItem[]) {
  return items.map((item) => `${item.name} ${item.weightJin}斤`).join(" / ");
}

export function buildReservationConfirmRows({
  currentItems,
}: Pick<
  ReservationConfirmViewInput,
  "currentItems"
>): ReservationConfirmViewRow[] {
  return currentItems.map((item) => ({
    label: item.name,
    tag: `${formatJin(item.weightJin)}斤`,
    tone: "positive" as const,
  }));
}

export function getReservationConfirmView({
  addressDetail,
  benefits = [],
  cutoffTime,
  currentItems,
  mode,
  receiverName,
  receiverPhone,
  totalWeightJin,
  weightLimitJin,
}: ReservationConfirmViewInput): ReservationConfirmView {
  const rows = buildReservationConfirmRows({
    currentItems,
  });
  const maskedPhone = maskPhone(receiverPhone);
  const receiverText = [receiverName?.trim(), maskedPhone]
    .filter(Boolean)
    .join(" ");
  const deliveryText = cutoffTime
    ? `明日${cutoffTime}前配送`
    : "明日配送";

  return {
    addressDetail,
    addressMeta: receiverText ? `${receiverText} · ${deliveryText}` : deliveryText,
    benefits,
    detailTitle: "已选菜品",
    main: `${currentItems.length}样菜 · ${formatJin(totalWeightJin)}斤`,
    meta: `合计${formatJin(totalWeightJin)}斤，套餐单次最多${formatJin(
      weightLimitJin,
    )}斤`,
    noticeMeta:
      mode === "edit"
        ? "保存后同步更新订单；超过截单时间不可修改。"
        : "提交后生成今日预订；超过截单时间不可修改。",
    noticeTitle: mode === "edit" ? "保存后覆盖原预订" : "提交后生成预订",
    primaryText: mode === "edit" ? "确认修改" : "确认提交",
    progressPercent:
      weightLimitJin > 0
        ? Math.min(100, Math.max(0, (totalWeightJin / weightLimitJin) * 100))
        : 0,
    rows,
    secondaryText: "继续调整",
    stateLabel: mode === "edit" ? "待保存" : "待提交",
    summaryLabel: "预订确认",
    title: "提交与修改确认",
  };
}

export function buildReservationEditConfirmContent({
  addressDetail,
  currentItems,
  orderNo,
  totalWeightJin,
}: ReservationEditConfirmInput) {
  return `原订单：${orderNo}\n已选菜品：${formatReservationItems(
    currentItems,
  )}\n合计 ${totalWeightJin}斤\n配送至：${addressDetail}`;
}

export function getEditingOrderResolution(
  editingOrderId: string | undefined,
  input: EditingOrderResolutionInput,
) {
  if (!editingOrderId) {
    return { shouldClearEditingOrder: false };
  }

  if (input.currentOrder?.id === editingOrderId) {
    return { shouldClearEditingOrder: false };
  }

  return {
    shouldClearEditingOrder: true,
    toastTitle: "该订单已不可修改",
  };
}

export function getReservationGate({
  hasActiveTask = true,
  hasCurrentOrder,
  isPastCutoff,
  memberInfo,
  packageInfo,
}: ReservationGateInput) {
  if (
    memberInfo?.status === "DISABLED" ||
    memberInfo?.bindingStatus === "DISABLED"
  ) {
    const reason = memberInfo.disabledReason?.trim();
    return {
      canReserve: false,
      emptyMessage: null,
      packageMeta: reason ? `账号已停用：${reason}` : "账号已停用，暂不能预订",
      submitDisabled: true,
    };
  }

  if (memberInfo === null) {
    return {
      canReserve: false,
      emptyMessage: "登录后查看套餐并提交订单",
      packageMeta: null,
      submitDisabled: true,
    };
  }

  if (!packageInfo) {
    return {
      canReserve: false,
      emptyMessage: "请在“我的-套餐”购买后再预订",
      packageMeta: null,
      submitDisabled: true,
    };
  }

  if (!hasActiveTask) {
    return {
      canReserve: false,
      emptyMessage: null,
      packageMeta: "今日暂无可预订任务",
      submitDisabled: true,
    };
  }

  if (packageInfo.status === "FROZEN") {
    const reason = packageInfo.frozenReason?.trim();
    return {
      canReserve: false,
      emptyMessage: null,
      packageMeta: reason ? `套餐已冻结：${reason}` : "套餐已冻结，暂不能预订",
      submitDisabled: true,
    };
  }

  if (packageInfo.status && packageInfo.status !== "ACTIVE") {
    return {
      canReserve: false,
      emptyMessage: null,
      packageMeta: "套餐当前不可用",
      submitDisabled: true,
    };
  }

  if (packageInfo.remainingTimes <= 0 && !hasCurrentOrder) {
    return {
      canReserve: false,
      emptyMessage: null,
      packageMeta: "套餐次数已用完",
      submitDisabled: true,
    };
  }

  if (isPastCutoff) {
    return {
      canReserve: false,
      emptyMessage: null,
      hideSubmitButton: true,
      packageMeta: "今日已截单，明天再来预订",
      submitDisabled: true,
    };
  }

  return {
    canReserve: true,
    emptyMessage: null,
    packageMeta: null,
    submitDisabled: false,
  };
}

export function getReservationAddress({
  currentOrder,
  defaultAddress,
  selectedAddress,
}: ReservationAddressInput): ReservationAddressResult {
  if (selectedAddress?.id) {
    return {
      detail: formatAddressDisplay(selectedAddress, "配送地址"),
      id: selectedAddress.id,
      source: "selected" as const,
    };
  }

  if (currentOrder?.addressId) {
    return {
      detail: formatAddressDisplay(currentOrder.address, "原预订地址"),
      id: currentOrder.addressId,
      source: "currentOrder" as const,
    };
  }

  if (defaultAddress?.id) {
    return {
      detail: formatAddressDisplay(defaultAddress, "默认地址"),
      id: defaultAddress.id,
      source: "default" as const,
    };
  }

  return {
    detail: "请先添加配送地址",
    id: null,
    source: "missing" as const,
  };
}

export function getReservationAddressTitle(address: ReservationAddressResult) {
  const label =
    address.source === "selected"
      ? "配送地址"
      : address.source === "default"
      ? "默认地址"
      : address.source === "currentOrder"
        ? "预订地址"
        : "配送地址";

  return `${label}：${address.detail}`;
}

export function getReservationSummaryMeta({
  isOverLimit,
  packageMeta,
  selectedCount,
}: ReservationSummaryMetaInput) {
  if (isOverLimit) {
    return "超过套餐额度，请减少菜品";
  }

  if (packageMeta) {
    return packageMeta;
  }

  return selectedCount > 0
    ? "确认后提交预订，截单前可修改"
    : "请选择菜品后提交预订";
}

export function getUnderPackageLimitConfirm({
  mode,
  totalWeightJin,
  weightLimitJin,
}: UnderPackageLimitConfirmInput): UnderPackageLimitConfirm | null {
  if (
    weightLimitJin <= 0 ||
    totalWeightJin <= 0 ||
    totalWeightJin >= weightLimitJin
  ) {
    return null;
  }

  const action = mode === "edit" ? "修改" : "提交";

  return {
    cancelText: "再来一单",
    confirmText: `确认${action}`,
    content: `套餐本次可选 ${formatJin(weightLimitJin)}斤，当前已选 ${formatJin(
      totalWeightJin,
    )}斤，还没选满。确认${action}吗？`,
    title: "未选满套餐额度",
  };
}

export function getPackageCardMeta({
  currentOrderNo,
  packageMeta,
  remainingTimes,
  weightLimitJin,
}: PackageCardMetaInput) {
  if (packageMeta) {
    return packageMeta;
  }

  if (currentOrderNo) {
    return `正在修改 ${currentOrderNo} · 每次最多 ${weightLimitJin}斤`;
  }

  return `每次最多 ${weightLimitJin}斤 · 本周剩余 ${remainingTimes} 次`;
}

export function getPackageUsageMeta({
  remainingTimes,
  totalTimes,
  usedTimes,
}: PackageUsageMetaInput) {
  const resolvedTotal = totalTimes ?? remainingTimes + (usedTimes ?? 0);
  const resolvedUsed = usedTimes ?? Math.max(resolvedTotal - remainingTimes, 0);

  return `已使用 ${resolvedUsed} 次 · 剩余 ${remainingTimes} 次`;
}

export function getPackageUsageProgressPercent({
  remainingTimes,
  totalTimes,
  usedTimes,
}: PackageUsageProgressInput) {
  const resolvedTotal = totalTimes ?? remainingTimes + (usedTimes ?? 0);
  const resolvedUsed = usedTimes ?? Math.max(resolvedTotal - remainingTimes, 0);

  if (resolvedTotal <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (resolvedUsed / resolvedTotal) * 100));
}

export function getPackageCardCutoffBadge(cutoffTime?: string | null) {
  const normalized = cutoffTime?.trim();
  return normalized ? `${normalized} 截单` : "截单时间待定";
}
