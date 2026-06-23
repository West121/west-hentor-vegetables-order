import { describe, expect, it } from "vitest";

import {
  buildFranchiseeFormState,
  buildStoreFormState,
  hasUnsavedFranchiseeModalChanges,
  hasUnsavedStoreModalChanges,
} from "./store-modal-state";

const store = {
  addressDetail: "莲花小区 3 栋 602",
  city: "杭州",
  code: "lotus-garden",
  contactName: "王店长",
  contactPhone: "13800000000",
  customerServiceTel: "400-1000-001",
  cutoffTime: "18:00",
  district: "西湖区",
  franchiseEndsAt: "2027-06-18T00:00:00.000Z",
  franchiseeId: "franchisee-1",
  name: "莲花小区店",
  province: "浙江",
  status: "ACTIVE",
  type: "FRANCHISE",
} as const;

const franchisee = {
  contactName: "李总",
  contactPhone: "13900000000",
  contractEndsAt: "2027-12-31T00:00:00.000Z",
  name: "杭州西湖加盟商",
  remark: "重点加盟商",
  status: "ACTIVE",
} as const;

describe("store modal dirty state", () => {
  it("does not mark unchanged store and franchisee forms as dirty", () => {
    expect(
      hasUnsavedStoreModalChanges({
        current: buildStoreFormState(store),
        initial: buildStoreFormState(store),
      }),
    ).toBe(false);

    expect(
      hasUnsavedFranchiseeModalChanges({
        current: buildFranchiseeFormState(franchisee),
        initial: buildFranchiseeFormState(franchisee),
      }),
    ).toBe(false);
  });

  it("marks store and franchisee edits as dirty", () => {
    const storeInitial = buildStoreFormState(store);
    const franchiseeInitial = buildFranchiseeFormState(franchisee);

    expect(
      hasUnsavedStoreModalChanges({
        current: { ...storeInitial, cutoffTime: "17:30" },
        initial: storeInitial,
      }),
    ).toBe(true);

    expect(
      hasUnsavedStoreModalChanges({
        current: { ...storeInitial, franchiseeId: "franchisee-2" },
        initial: storeInitial,
      }),
    ).toBe(true);

    expect(
      hasUnsavedFranchiseeModalChanges({
        current: { ...franchiseeInitial, remark: "合同待续签" },
        initial: franchiseeInitial,
      }),
    ).toBe(true);
  });
});
