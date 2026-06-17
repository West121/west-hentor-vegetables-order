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
