export type MemberBindingStatus = "ACTIVE" | "DISABLED";

export type MemberFormState = {
  defaultAddress: {
    city: string;
    detail: string;
    district: string;
    id: string | null;
    province: string;
    receiverName: string;
    receiverPhone: string;
  };
  disabledReason: string;
  nickname: string;
  remark: string;
  status: MemberBindingStatus;
};

export type MemberFormItem = {
  bindingStatus: MemberBindingStatus;
  defaultAddress?: {
    city?: string | null;
    detail: string;
    district?: string | null;
    id: string;
    province?: string | null;
    receiverName: string;
    receiverPhone: string;
  } | null;
  disabledReason?: string | null;
  nickname?: string | null;
  phone?: string | null;
  remark?: string | null;
};

export function buildMemberFormState(member: MemberFormItem): MemberFormState {
  return {
    defaultAddress: {
      city: member.defaultAddress?.city ?? "",
      detail: member.defaultAddress?.detail ?? "",
      district: member.defaultAddress?.district ?? "",
      id: member.defaultAddress?.id ?? null,
      province: member.defaultAddress?.province ?? "",
      receiverName:
        member.defaultAddress?.receiverName ?? member.nickname ?? "",
      receiverPhone: member.defaultAddress?.receiverPhone ?? member.phone ?? "",
    },
    disabledReason: member.disabledReason ?? "",
    nickname: member.nickname ?? "",
    remark: member.remark ?? "",
    status: member.bindingStatus,
  };
}

export function hasUnsavedMemberModalChanges({
  current,
  initial,
}: {
  current: MemberFormState;
  initial: MemberFormState;
}) {
  return (
    current.defaultAddress.city !== initial.defaultAddress.city ||
    current.defaultAddress.detail !== initial.defaultAddress.detail ||
    current.defaultAddress.district !== initial.defaultAddress.district ||
    current.defaultAddress.province !== initial.defaultAddress.province ||
    current.defaultAddress.receiverName !==
      initial.defaultAddress.receiverName ||
    current.defaultAddress.receiverPhone !==
      initial.defaultAddress.receiverPhone ||
    current.disabledReason !== initial.disabledReason ||
    current.nickname !== initial.nickname ||
    current.remark !== initial.remark ||
    current.status !== initial.status
  );
}
