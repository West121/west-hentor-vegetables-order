export type OrderModalMode = "create" | "detail" | "edit";

export type OrderFormShipment = {
  logisticsNo: string;
  packageName: string;
  packageType: string;
};

export type OrderFormState = {
  createItems: Record<string, string>;
  createUserId: string;
  internalRemark: string;
  logisticsNo: string;
  shipments: OrderFormShipment[];
  userVisibleRemark: string;
  voidReason: string;
};

export type OrderFormMemberOption = {
  id: string;
};

export type OrderFormItem = {
  benefitItems?: Array<{
    kind: string;
    nameSnapshot: string;
  }>;
  internalRemark?: string | null;
  logisticsNo?: string | null;
  shipments?: Array<{
    logisticsNo?: string | null;
    packageName: string;
    packageType?: string | null;
  }>;
  userVisibleRemark?: string | null;
};

export function buildOrderFormState(
  item: OrderFormItem | null,
  memberOptions: OrderFormMemberOption[] = [],
): OrderFormState {
  const shipments =
    item?.shipments && item.shipments.length > 0
      ? item.shipments.map((shipment) => ({
          logisticsNo: shipment.logisticsNo ?? "",
          packageName: shipment.packageName,
          packageType: shipment.packageType ?? "EXTRA",
        }))
      : item?.logisticsNo
        ? [
            {
              logisticsNo: item.logisticsNo,
              packageName: "蔬菜包裹",
              packageType: "VEGETABLE",
            },
          ]
        : item?.benefitItems && item.benefitItems.length > 0
          ? [
              {
                logisticsNo: "",
                packageName: "蔬菜包裹",
                packageType: "VEGETABLE",
              },
              ...item.benefitItems.map((benefit) => ({
                logisticsNo: "",
                packageName: `${benefit.nameSnapshot}包裹`,
                packageType: benefit.kind,
              })),
            ]
          : [];

  return {
    createItems: {},
    createUserId: memberOptions[0]?.id ?? "",
    internalRemark: item?.internalRemark ?? "",
    logisticsNo: item?.logisticsNo ?? "",
    shipments,
    userVisibleRemark: item?.userVisibleRemark ?? "",
    voidReason: "",
  };
}

function normalizedCreateItems(items: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(items)
      .map(([dishId, value]) => [dishId, Number(value || 0)] as const)
      .filter(([, weight]) => weight > 0)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function normalizedShipments(shipments: OrderFormShipment[]) {
  return shipments
    .map((shipment) => ({
      logisticsNo: shipment.logisticsNo.trim(),
      packageName: shipment.packageName.trim(),
      packageType: shipment.packageType.trim(),
    }))
    .sort((left, right) =>
      `${left.packageType}:${left.packageName}`.localeCompare(
        `${right.packageType}:${right.packageName}`,
      ),
    );
}

export function hasUnsavedOrderModalChanges({
  current,
  initial,
  mode,
}: {
  current: OrderFormState;
  initial: OrderFormState;
  mode: OrderModalMode;
}) {
  if (mode === "detail") {
    return false;
  }

  if (mode === "create") {
    return (
      current.createUserId !== initial.createUserId ||
      current.internalRemark !== initial.internalRemark ||
      current.userVisibleRemark !== initial.userVisibleRemark ||
      JSON.stringify(normalizedCreateItems(current.createItems)) !==
        JSON.stringify(normalizedCreateItems(initial.createItems))
    );
  }

  return (
    current.internalRemark !== initial.internalRemark ||
    current.logisticsNo !== initial.logisticsNo ||
    JSON.stringify(normalizedShipments(current.shipments)) !==
      JSON.stringify(normalizedShipments(initial.shipments)) ||
    current.userVisibleRemark !== initial.userVisibleRemark ||
    current.voidReason.trim().length > 0
  );
}
