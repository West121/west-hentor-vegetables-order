import "server-only";

import { listAccessibleStores } from "@hentor/db";

import { fail } from "./api";

export async function getStoreAccessFailure(
  adminUserId: string,
  storeId: string,
) {
  const access = await listAccessibleStores(adminUserId);

  if (
    access.scope === "ALL" ||
    access.stores.some((store) => store.id === storeId)
  ) {
    return null;
  }

  return fail("STORE_FORBIDDEN", "无权访问该加盟门店", 403);
}

export async function getStoreAssignmentFailure(
  adminUserId: string,
  storeIds: string[],
) {
  const access = await listAccessibleStores(adminUserId);

  if (access.scope === "ALL") {
    return null;
  }

  if (storeIds.length === 0) {
    return fail("STORE_FORBIDDEN", "无权分配全部门店账号", 403);
  }

  const accessibleStoreIds = new Set(access.stores.map((store) => store.id));
  const hasForbiddenStore = storeIds.some(
    (storeId) => !accessibleStoreIds.has(storeId),
  );

  if (!hasForbiddenStore) {
    return null;
  }

  return fail("STORE_FORBIDDEN", "无权分配该加盟门店", 403);
}

export async function getAllStoresAccessFailure(adminUserId: string) {
  const access = await listAccessibleStores(adminUserId);

  if (access.scope === "ALL") {
    return null;
  }

  return fail("STORE_FORBIDDEN", "无权访问全部门店数据", 403);
}
