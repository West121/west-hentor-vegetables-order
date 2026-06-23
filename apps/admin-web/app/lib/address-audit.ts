export type AddressAuditSnapshotInput = {
  city?: string | null;
  detail: string;
  district?: string | null;
  id?: string;
  isDefault?: boolean;
  province?: string | null;
  receiverName?: string;
  receiverPhone?: string;
};

export function maskAddressPhone(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

export function formatAddressAuditSnapshot(address: AddressAuditSnapshotInput) {
  return [address.province, address.city, address.district, address.detail]
    .filter(Boolean)
    .join(" ");
}

export function addressAuditRequestParams(
  input: AddressAuditSnapshotInput & {
    addressId?: string;
    storeCode?: string | null;
  },
) {
  return {
    addressId: input.addressId,
    city: input.city ?? null,
    detail: input.detail,
    district: input.district ?? null,
    isDefault: input.isDefault ?? null,
    province: input.province ?? null,
    receiverName: input.receiverName ?? null,
    receiverPhone: input.receiverPhone
      ? maskAddressPhone(input.receiverPhone)
      : null,
    storeCode: input.storeCode ?? null,
  };
}

export function addressAuditResponseData(
  address: AddressAuditSnapshotInput & {
    id: string;
    receiverName: string;
    receiverPhone: string;
  },
) {
  return {
    address: {
      id: address.id,
      detail: address.detail,
      fullAddress: formatAddressAuditSnapshot(address),
      isDefault: address.isDefault,
      receiverName: address.receiverName,
      receiverPhone: maskAddressPhone(address.receiverPhone),
    },
    success: true,
  };
}
