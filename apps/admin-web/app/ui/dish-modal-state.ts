export type DishCategory = string;
export type DishStatus = "ON_SALE" | "OFF_SALE";

export type DishFormState = {
  category: DishCategory;
  description: string;
  imageKey: string;
  imageUrl: string;
  name: string;
  sortOrder: string;
  status: DishStatus;
  stepJin: string;
  stockJin: string;
};

export type DishFormItem = {
  category: DishCategory;
  description?: string | null;
  imageKey?: string | null;
  imageUrl?: string | null;
  name: string;
  sortOrder: number;
  status: DishStatus;
  stepJin: number;
  stockJin: number;
};

export type InventoryFormState = {
  changeJin: string;
  reason: string;
};

export function buildDishFormState(
  item?: DishFormItem | null,
): DishFormState {
  return {
    category: item?.category ?? "LEAFY",
    description: item?.description ?? "",
    imageKey: item?.imageKey ?? "",
    imageUrl: item?.imageUrl ?? "",
    name: item?.name ?? "",
    sortOrder: String(item?.sortOrder ?? 0),
    status: item?.status ?? "ON_SALE",
    stepJin: String(item?.stepJin ?? 0.5),
    stockJin: String(item?.stockJin ?? 20),
  };
}

export function buildInventoryFormState(): InventoryFormState {
  return {
    changeJin: "",
    reason: "",
  };
}

export function hasUnsavedDishModalChanges({
  current,
  initial,
}: {
  current: DishFormState;
  initial: DishFormState;
}) {
  return (
    current.category !== initial.category ||
    current.description !== initial.description ||
    current.imageKey !== initial.imageKey ||
    current.imageUrl !== initial.imageUrl ||
    current.name !== initial.name ||
    current.sortOrder !== initial.sortOrder ||
    current.status !== initial.status ||
    current.stepJin !== initial.stepJin ||
    current.stockJin !== initial.stockJin
  );
}

export function hasUnsavedInventoryModalChanges({
  current,
  initial,
}: {
  current: InventoryFormState;
  initial: InventoryFormState;
}) {
  return (
    current.changeJin !== initial.changeJin || current.reason !== initial.reason
  );
}
