export type HomeDishLike = {
  id: string;
  name: string;
};

export type SelectedDishItem = {
  dishId: string;
  name: string;
  weightJin: number;
};

export type DishSelection = Record<string, number>;

export type ChangeDishSelectionInput = {
  delta: number;
  dishId: string;
  stepJin: number;
};

export type BuildHomeUrlInput = {
  apiBaseUrl: string;
  editingOrderId?: string;
  storeCode: string;
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
  packageInfo: null | ReservationPackageLike | undefined;
};

function normalizeWeight(value: number) {
  return Number(value.toFixed(2));
}

export function buildSelectedItems(
  dishes: HomeDishLike[],
  selected: DishSelection,
): SelectedDishItem[] {
  return dishes
    .map((dish) => ({
      dishId: dish.id,
      name: dish.name,
      weightJin: selected[dish.id] ?? 0,
    }))
    .filter((item) => item.weightJin > 0);
}

export function changeDishSelection(
  selected: DishSelection,
  input: ChangeDishSelectionInput,
): DishSelection {
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

export function buildHomeUrl({
  apiBaseUrl,
  editingOrderId,
  storeCode,
}: BuildHomeUrlInput) {
  const url = `${apiBaseUrl}/api/v1/home?storeCode=${storeCode}`;
  return editingOrderId
    ? `${url}&orderId=${encodeURIComponent(editingOrderId)}`
    : url;
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

export function getReservationGate({ packageInfo }: ReservationGateInput) {
  if (!packageInfo) {
    return {
      canReserve: false,
      emptyMessage:
        "当前没有可用套餐，暂不能下单。请在“我的-套餐”购买后再预订。",
      packageMeta: null,
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

  if (packageInfo.remainingTimes <= 0) {
    return {
      canReserve: false,
      emptyMessage: null,
      packageMeta: "套餐次数已用完",
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
