export type StoreStatus = "ACTIVE" | "DISABLED";
export type StoreType = "DIRECT" | "FRANCHISE";
export type FranchiseeStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED";

export type StoreFormState = {
  address: string;
  city: string;
  code: string;
  contactName: string;
  contactPhone: string;
  customerServiceTel: string;
  cutoffTime: string;
  district: string;
  franchiseEndsAt: string;
  franchiseeId: string;
  name: string;
  province: string;
  status: StoreStatus;
  type: StoreType;
};

export type FranchiseeFormState = {
  contactName: string;
  contactPhone: string;
  contractEndsAt: string;
  name: string;
  remark: string;
  status: FranchiseeStatus;
};

export type StoreFormItem = {
  addressDetail?: string | null;
  city?: string | null;
  code: string;
  contactName: string;
  contactPhone: string;
  customerServiceTel?: string | null;
  cutoffTime: string;
  district?: string | null;
  franchiseEndsAt?: string | null;
  franchiseeId?: string | null;
  name: string;
  province?: string | null;
  status: StoreStatus;
  type: StoreType;
};

export type FranchiseeFormItem = {
  contactName: string;
  contactPhone: string;
  contractEndsAt?: string | null;
  name: string;
  remark?: string | null;
  status: FranchiseeStatus;
};

function dateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function buildStoreFormState(
  item?: StoreFormItem | null,
): StoreFormState {
  return {
    address: item?.addressDetail ?? "",
    city: item?.city ?? "",
    code: item?.code ?? "",
    contactName: item?.contactName ?? "",
    contactPhone: item?.contactPhone ?? "",
    customerServiceTel: item?.customerServiceTel ?? "",
    cutoffTime: item?.cutoffTime ?? "18:00",
    district: item?.district ?? "",
    franchiseEndsAt: dateInputValue(item?.franchiseEndsAt),
    franchiseeId: item?.franchiseeId ?? "",
    name: item?.name ?? "",
    province: item?.province ?? "",
    status: item?.status ?? "ACTIVE",
    type: item?.type ?? "FRANCHISE",
  };
}

export function buildFranchiseeFormState(
  item?: FranchiseeFormItem | null,
): FranchiseeFormState {
  return {
    contactName: item?.contactName ?? "",
    contactPhone: item?.contactPhone ?? "",
    contractEndsAt: dateInputValue(item?.contractEndsAt),
    name: item?.name ?? "",
    remark: item?.remark ?? "",
    status: item?.status ?? "ACTIVE",
  };
}

export function hasUnsavedStoreModalChanges({
  current,
  initial,
}: {
  current: StoreFormState;
  initial: StoreFormState;
}) {
  return Object.keys(initial).some((key) => {
    const field = key as keyof StoreFormState;
    return current[field] !== initial[field];
  });
}

export function hasUnsavedFranchiseeModalChanges({
  current,
  initial,
}: {
  current: FranchiseeFormState;
  initial: FranchiseeFormState;
}) {
  return Object.keys(initial).some((key) => {
    const field = key as keyof FranchiseeFormState;
    return current[field] !== initial[field];
  });
}
