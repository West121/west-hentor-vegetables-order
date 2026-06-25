import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "http://127.0.0.1:8080";
const DEFAULT_STORE_CODE = "lotus-garden";
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "Admin123456";

export function normalizeBaseUrl(value = DEFAULT_BASE_URL) {
  return value.replace(/\/+$/, "");
}

export function assertApiSuccess(payload, label = "API") {
  if (!payload?.success) {
    const code = payload?.error?.code ?? "UNKNOWN_ERROR";
    const message = payload?.error?.message ?? `${label} failed`;
    throw new Error(`${label}: ${code}: ${message}`);
  }

  return payload.data;
}

export function assertApiErrorCode(payload, expectedCode, label = "API") {
  const code = payload?.error?.code;
  if (payload?.success !== false || code !== expectedCode) {
    throw new Error(`${label}: expected ${expectedCode}, got ${code ?? "SUCCESS"}`);
  }

  return payload.error;
}

export function getListItems(payload, aliases) {
  for (const alias of aliases) {
    const items = payload?.[alias];
    if (Array.isArray(items)) {
      return items;
    }
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  throw new Error(`LIST_ITEMS_MISSING: expected one of ${aliases.join(", ")}, items`);
}

export function assertSpringPagePayload(payload, aliases, label = "list") {
  const items = getListItems(payload, aliases);
  const pagination = payload?.pagination ?? {
    page: payload?.page,
    pageSize: payload?.pageSize,
    total: payload?.total,
    totalPages: payload?.totalPages,
  };

  for (const field of ["page", "pageSize", "total", "totalPages"]) {
    if (!Number.isFinite(Number(pagination?.[field]))) {
      throw new Error(`${label}: pagination.${field} missing`);
    }
  }

  if (Number(pagination.page) < 1 || Number(pagination.pageSize) < 1) {
    throw new Error(`${label}: pagination page and pageSize must be positive`);
  }

  if (Number(pagination.total) < items.length) {
    throw new Error(`${label}: pagination total is smaller than item count`);
  }

  return { items, pagination };
}

export function assertNonEmptyArray(value, label = "array") {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label}: expected non-empty array`);
  }

  return value;
}

export function assertSystemSettingsShape(settings, label = "system settings") {
  if (!settings?.store?.id) {
    throw new Error(`${label}: store missing`);
  }
  if (!Array.isArray(settings.deliveryProvinces) || !Array.isArray(settings.deliveryCities)) {
    throw new Error(`${label}: delivery ranges must be arrays`);
  }

  return settings;
}

export function assertOrderDetailShape(order, label = "order detail") {
  if (!order?.id || !order?.orderNo || !order?.status) {
    throw new Error(`${label}: core order fields missing`);
  }
  if (!Array.isArray(order.items)) {
    throw new Error(`${label}: items must be an array`);
  }
  if (!Array.isArray(order.shipments)) {
    throw new Error(`${label}: shipments must be an array`);
  }
  if (!order.user?.id || !order.userPackage?.id) {
    throw new Error(`${label}: user or package reference missing`);
  }

  return order;
}

export function assertMiniHomeShape(home, label = "miniapp home") {
  if (!home?.store?.id || !home?.member?.id) {
    throw new Error(`${label}: store or member missing`);
  }
  if (!Array.isArray(home.dishes)) {
    throw new Error(`${label}: dishes must be an array`);
  }
  for (const dish of home.dishes) {
    if (!dish?.id || !dish?.name || Number(dish.stepJin) <= 0) {
      throw new Error(`${label}: dish contract broken`);
    }
  }

  return home;
}

export function assertUploadImageShape(upload, label = "dish image upload") {
  const image = upload?.image;
  if (!image?.key || !image?.url || !image?.mimeType) {
    throw new Error(`${label}: image key, url or mimeType missing`);
  }
  if (!image.mimeType.startsWith("image/")) {
    throw new Error(`${label}: invalid image mime type ${image.mimeType}`);
  }

  return image;
}

export function chooseOperationalStore(stores) {
  const store = stores.find((item) => item?.code === DEFAULT_STORE_CODE) ?? stores[0];
  if (!store?.id) {
    throw new Error("SPRING_SMOKE_STORE_MISSING");
  }

  return store;
}

export function chooseActivePackage(packages) {
  const userPackage = packages.find((item) => {
    const totalTimes = Number(item?.totalTimes ?? 0);
    const usedTimes = Number(item?.usedTimes ?? 0);
    return item?.status === "ACTIVE" && totalTimes > usedTimes && item?.userId;
  });

  if (!userPackage?.id) {
    throw new Error("SPRING_SMOKE_ACTIVE_PACKAGE_MISSING");
  }

  return userPackage;
}

export function chooseReservableDish(dishes) {
  const dish = dishes.find((item) => {
    const stockJin = Number(item?.stockJin ?? 0);
    const stepJin = Number(item?.stepJin ?? 0);
    return item?.status === "ON_SALE" && stockJin >= stepJin && stepJin > 0;
  });

  if (!dish?.id) {
    throw new Error("SPRING_SMOKE_DISH_MISSING");
  }

  return dish;
}

export function buildTinyPngUploadFormData() {
  const imageBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );
  const formData = new FormData();
  formData.set(
    "file",
    new Blob([imageBytes], { type: "image/png" }),
    "spring-smoke-dish.png",
  );

  return formData;
}

function buildOrderPayload({
  addressId,
  dish,
  internalRemark = "Spring API smoke, will void",
  storeId,
  userId,
  userPackageId,
}) {
  return {
    addressId,
    internalRemark,
    items: [{ dishId: dish.id, weightJin: Number(dish.stepJin) }],
    storeId,
    userId,
    userPackageId,
    userVisibleRemark: "spring-api-smoke",
  };
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  return { payload, response };
}

async function api(baseUrl, path, init = {}) {
  return requestJson(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...(init.headers ?? {}),
    },
  });
}

async function adminLogin(baseUrl, { password, username }) {
  const { payload } = await api(baseUrl, "/api/spring/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ password, username }),
  });
  return assertApiSuccess(payload, "admin login");
}

async function miniLogin(baseUrl, { phone, storeCode }) {
  const { payload } = await api(baseUrl, "/api/spring/v1/auth/dev-login", {
    method: "POST",
    body: JSON.stringify({ phone, storeCode }),
  });
  return assertApiSuccess(payload, "miniapp dev-login");
}

export async function runSpringApiSmoke(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? process.env.SPRING_SMOKE_BASE_URL ?? DEFAULT_BASE_URL);
  const storeCode = options.storeCode ?? process.env.SPRING_SMOKE_STORE_CODE ?? DEFAULT_STORE_CODE;

  const healthResponse = await api(baseUrl, "/api/spring/health");
  const health = assertApiSuccess(healthResponse.payload, "spring health");
  for (const key of ["database", "session", "storage"]) {
    if (health?.[key]?.ok !== true) {
      throw new Error(`SPRING_HEALTH_${key.toUpperCase()}_FAILED`);
    }
  }

  const admin = await adminLogin(baseUrl, {
    password: options.adminPassword ?? process.env.SPRING_SMOKE_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD,
    username: options.adminUsername ?? process.env.SPRING_SMOKE_ADMIN_USERNAME ?? DEFAULT_ADMIN_USERNAME,
  });
  const adminHeaders = { authorization: `Bearer ${admin.token}` };

  const storesData = assertApiSuccess(
    (await api(baseUrl, "/api/spring/admin/stores?page=1&pageSize=50", { headers: adminHeaders })).payload,
    "admin stores",
  );
  const stores = assertSpringPagePayload(storesData, ["stores"], "admin stores").items;
  const store = chooseOperationalStore(stores);

  const [
    membersData,
    packagesData,
    dishesData,
    tasksData,
    logsData,
    statsData,
    rolesData,
    permissionsData,
    adminUsersData,
    packageTemplatesData,
    franchiseesData,
    systemSettingsData,
  ] = await Promise.all([
    api(baseUrl, `/api/spring/admin/members?storeId=${encodeURIComponent(store.id)}&page=1&pageSize=20`, { headers: adminHeaders }),
    api(baseUrl, `/api/spring/admin/user-packages?storeId=${encodeURIComponent(store.id)}&page=1&pageSize=20`, { headers: adminHeaders }),
    api(baseUrl, `/api/spring/admin/dishes?storeId=${encodeURIComponent(store.id)}&page=1&pageSize=20`, { headers: adminHeaders }),
    api(baseUrl, `/api/spring/admin/tasks?storeId=${encodeURIComponent(store.id)}&page=1&pageSize=5`, { headers: adminHeaders }),
    api(baseUrl, "/api/spring/admin/operation-logs?page=1&pageSize=5", { headers: adminHeaders }),
    api(baseUrl, `/api/spring/admin/stats/shipment?storeId=${encodeURIComponent(store.id)}`, { headers: adminHeaders }),
    api(baseUrl, "/api/spring/admin/roles?page=1&pageSize=20", { headers: adminHeaders }),
    api(baseUrl, "/api/spring/admin/roles/permissions", { headers: adminHeaders }),
    api(baseUrl, "/api/spring/admin/admin-users?page=1&pageSize=20", { headers: adminHeaders }),
    api(baseUrl, `/api/spring/admin/package-templates?storeId=${encodeURIComponent(store.id)}&page=1&pageSize=20`, { headers: adminHeaders }),
    api(baseUrl, "/api/spring/admin/franchisees?page=1&pageSize=20", { headers: adminHeaders }),
    api(baseUrl, `/api/spring/admin/system-settings?storeId=${encodeURIComponent(store.id)}`, { headers: adminHeaders }),
  ]);

  const members = assertSpringPagePayload(
    assertApiSuccess(membersData.payload, "admin members"),
    ["members"],
    "admin members",
  ).items;
  const userPackages = assertSpringPagePayload(
    assertApiSuccess(packagesData.payload, "admin user packages"),
    ["packages"],
    "admin user packages",
  ).items;
  const dishes = assertSpringPagePayload(
    assertApiSuccess(dishesData.payload, "admin dishes"),
    ["dishes"],
    "admin dishes",
  ).items;
  const tasks = assertSpringPagePayload(
    assertApiSuccess(tasksData.payload, "admin tasks"),
    ["tasks"],
    "admin tasks",
  ).items;
  const logs = assertSpringPagePayload(
    assertApiSuccess(logsData.payload, "admin operation logs"),
    ["logs"],
    "admin operation logs",
  ).items;
  const stats = assertApiSuccess(statsData.payload, "admin shipment stats");
  const roles = assertSpringPagePayload(
    assertApiSuccess(rolesData.payload, "admin roles"),
    ["items"],
    "admin roles",
  ).items;
  const permissions = assertNonEmptyArray(
    assertApiSuccess(permissionsData.payload, "admin role permissions").items,
    "admin role permissions",
  );
  const adminUsers = assertSpringPagePayload(
    assertApiSuccess(adminUsersData.payload, "admin users"),
    ["items"],
    "admin users",
  ).items;
  const packageTemplates = assertSpringPagePayload(
    assertApiSuccess(packageTemplatesData.payload, "admin package templates"),
    ["items"],
    "admin package templates",
  ).items;
  const franchisees = assertSpringPagePayload(
    assertApiSuccess(franchiseesData.payload, "admin franchisees"),
    ["items"],
    "admin franchisees",
  ).items;
  const systemSettings = assertSystemSettingsShape(
    assertApiSuccess(systemSettingsData.payload, "admin system settings").settings,
    "admin system settings",
  );
  const userPackage = chooseActivePackage(userPackages);
  const dish = chooseReservableDish(dishes);

  const memberDetailPayload = assertApiSuccess(
    (await api(
      baseUrl,
      `/api/spring/admin/members/${encodeURIComponent(userPackage.userId)}?storeId=${encodeURIComponent(store.id)}`,
      { headers: adminHeaders },
    )).payload,
    "admin member detail",
  );
  const member = memberDetailPayload.member;
  const address = member?.defaultAddress ?? member?.addresses?.[0];
  if (!address?.id) {
    throw new Error("SPRING_SMOKE_MEMBER_ADDRESS_MISSING");
  }

  const upload = assertApiSuccess(
    (await api(baseUrl, "/api/spring/admin/uploads/dish-images", {
      body: buildTinyPngUploadFormData(),
      headers: adminHeaders,
      method: "POST",
    })).payload,
    "admin dish image upload",
  );

  const uploadedImage = assertUploadImageShape(upload, "admin dish image upload");
  const uploadUrl = uploadedImage.url;
  if (!uploadUrl) {
    throw new Error("SPRING_SMOKE_UPLOAD_URL_MISSING");
  }
  const uploadedObject = await fetch(uploadUrl);
  if (!uploadedObject.ok) {
    throw new Error(`SPRING_SMOKE_UPLOAD_OBJECT_UNREADABLE: ${uploadedObject.status}`);
  }

  const invalidOrder = await api(baseUrl, "/api/spring/admin/orders", {
    body: JSON.stringify({ storeId: store.id }),
    headers: adminHeaders,
    method: "POST",
  });
  assertApiErrorCode(invalidOrder.payload, "INVALID_PARAMS", "admin invalid order");

  const createdOrder = assertApiSuccess(
    (await api(baseUrl, "/api/spring/admin/orders", {
      body: JSON.stringify(
        buildOrderPayload({
          addressId: address.id,
          dish,
          storeId: store.id,
          userId: userPackage.userId,
          userPackageId: userPackage.id,
        }),
      ),
      headers: adminHeaders,
      method: "POST",
    })).payload,
    "admin order create",
  ).order;
  if (createdOrder?.status !== "PENDING_SHIPMENT") {
    throw new Error(`SPRING_SMOKE_ORDER_CREATE_STATUS: ${createdOrder?.status}`);
  }

  const orderDetail = assertOrderDetailShape(assertApiSuccess(
    (await api(
      baseUrl,
      `/api/spring/admin/orders/${encodeURIComponent(createdOrder.id)}?storeId=${encodeURIComponent(store.id)}`,
      { headers: adminHeaders },
    )).payload,
    "admin order detail",
  ).order);

  const voidedOrder = assertApiSuccess(
    (await api(baseUrl, `/api/spring/admin/orders/${encodeURIComponent(createdOrder.id)}/void`, {
      body: JSON.stringify({ reason: "spring-api-smoke rollback", storeId: store.id }),
      headers: adminHeaders,
      method: "POST",
    })).payload,
    "admin order void",
  ).order;
  if (voidedOrder?.status !== "VOIDED") {
    throw new Error(`SPRING_SMOKE_ORDER_VOID_STATUS: ${voidedOrder?.status}`);
  }

  const mini = await miniLogin(baseUrl, { phone: member.phone, storeCode });
  const miniHeaders = { authorization: `Bearer ${mini.token}` };
  const [homeData, addressesData, ordersData, meData] = await Promise.all([
    api(baseUrl, `/api/spring/v1/home?storeCode=${encodeURIComponent(storeCode)}`, { headers: miniHeaders }),
    api(baseUrl, `/api/spring/v1/addresses?storeCode=${encodeURIComponent(storeCode)}`, { headers: miniHeaders }),
    api(baseUrl, `/api/spring/v1/orders?storeCode=${encodeURIComponent(storeCode)}`, { headers: miniHeaders }),
    api(baseUrl, `/api/spring/v1/me?storeCode=${encodeURIComponent(storeCode)}`, { headers: miniHeaders }),
  ]);

  const home = assertMiniHomeShape(assertApiSuccess(homeData.payload, "miniapp home"));
  const addresses = assertApiSuccess(addressesData.payload, "miniapp addresses");
  const orders = assertApiSuccess(ordersData.payload, "miniapp orders");
  const me = assertApiSuccess(meData.payload, "miniapp me");
  if (!Array.isArray(addresses.items) || !Array.isArray(orders.items)) {
    throw new Error("SPRING_SMOKE_MINIAPP_LIST_SHAPE_BROKEN");
  }

  return {
    admin: {
      dishCount: dishes.length,
      imageKey: upload.image.key,
      logCount: logs.length,
      memberId: member.id,
      orderId: createdOrder.id,
      orderNo: orderDetail.orderNo,
      packageId: userPackage.id,
      packageTemplateCount: packageTemplates.length,
      permissionCount: permissions.length,
      roleCount: roles.length,
      shipmentStatsOrderCount: stats.summary?.orderCount ?? 0,
      storeId: store.id,
      homeDishColumns: systemSettings.homeDishColumns,
      adminUserCount: adminUsers.length,
      franchiseeCount: franchisees.length,
      taskCount: tasks.length,
    },
    baseUrl,
    health: {
      database: health.database.ok,
      session: health.session.ok,
      storage: health.storage.ok,
    },
    miniapp: {
      addressCount: addresses.items?.length ?? 0,
      dishCount: home.dishes?.length ?? 0,
      memberId: home.member?.id ?? me.member?.id,
      orderCount: orders.items?.length ?? 0,
      storeId: home.store?.id,
    },
    storeCode,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runSpringApiSmoke();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
