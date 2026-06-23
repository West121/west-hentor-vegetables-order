import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_STORE_CODE = "lotus-garden";
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "Admin123456";

export function normalizeBaseUrl(value = DEFAULT_BASE_URL) {
  return value.replace(/\/+$/, "");
}

export function parseSetCookie(value) {
  return value?.split(";")[0] ?? "";
}

export function assertApiSuccess(payload, label = "API") {
  if (!payload?.success) {
    const code = payload?.error?.code ?? "UNKNOWN_ERROR";
    const message = payload?.error?.message ?? `${label} failed`;
    throw new Error(`${code}: ${message}`);
  }

  return payload.data;
}

function labelCode(label, suffix) {
  return `${label.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_${suffix}`;
}

export function assertApiErrorCode(payload, expectedCode, label = "API") {
  const code = payload?.error?.code;
  if (payload?.success !== false || code !== expectedCode) {
    throw new Error(
      `${labelCode(label, "ERROR_CODE_MISMATCH")}: expected ${expectedCode}, got ${
        code ?? "SUCCESS"
      }`,
    );
  }

  return payload.error;
}

export function assertListPayload(payload, label = "list") {
  if (!payload || !Array.isArray(payload.items)) {
    throw new Error(`${labelCode(label, "ITEMS_MISSING")}: response has no items array`);
  }

  return payload;
}

export function assertPaymentReserve(prepay, purchaseId) {
  if (prepay?.id !== purchaseId) {
    throw new Error(
      `PAYMENT_RESERVE_ID_MISMATCH: expected ${purchaseId}, got ${prepay?.id}`,
    );
  }

  if (prepay.status !== "PAYMENT_NOT_ENABLED") {
    throw new Error(`PAYMENT_RESERVE_STATUS_CHANGED: got ${prepay.status}`);
  }

  return prepay;
}

export function buildPackagePurchaseSmokeSummary({
  dbPurchase,
  prepay,
  purchaseOrder,
  purchaseReserve,
  template,
}) {
  return {
    amountFen: dbPurchase.amountFen,
    payChannel: purchaseOrder.payChannel,
    paymentEnabled: purchaseReserve.enabled,
    prepayStatus: prepay.status,
    purchaseOrderId: purchaseOrder.id,
    status: purchaseOrder.status,
    templateId: template.id,
  };
}

export function assertAdminSmokeBoundPackageTemplateCoreGuard(admin) {
  const guard = admin?.boundPackageTemplateCoreGuard;
  if (!guard) {
    throw new Error(
      "ADMIN_BOUND_TEMPLATE_CORE_GUARD_MISSING: admin smoke did not report bound template protection",
    );
  }

  if (
    guard.protected !== true ||
    guard.rejectedCode !== "PACKAGE_TEMPLATE_IN_USE" ||
    !guard.templateId ||
    !Number.isFinite(guard.userPackageCount) ||
    guard.userPackageCount <= 0
  ) {
    throw new Error(
      `ADMIN_BOUND_TEMPLATE_CORE_GUARD_UNPROTECTED: ${JSON.stringify(guard)}`,
    );
  }

  return guard;
}

export function assertAdminSmokeBusinessPermissionGuard(admin) {
  const guard = admin?.businessPermissionGuard;
  if (!guard) {
    throw new Error(
      "ADMIN_BUSINESS_PERMISSION_GUARD_MISSING: admin smoke did not report business permission protection",
    );
  }

  const denialFields = [
    "dishImageUploadDenied",
    "dishesReadDenied",
    "membersReadDenied",
    "ordersReadDenied",
    "packagesReadDenied",
    "tasksReadDenied",
  ];
  const hasMissingDenial = denialFields.some(
    (field) => guard[field] !== "PERMISSION_FORBIDDEN",
  );

  if (
    guard.protected !== true ||
    guard.cleaned !== true ||
    hasMissingDenial ||
    !guard.username
  ) {
    throw new Error(
      `ADMIN_BUSINESS_PERMISSION_GUARD_UNPROTECTED: ${JSON.stringify(guard)}`,
    );
  }

  return guard;
}

export function chooseReservableDish(dishes) {
  const dish = dishes.find((item) => Number(item.stockJin) > 0);
  if (!dish) {
    throw new Error("NO_STOCKED_DISH: seeded store has no stocked dish");
  }

  return dish;
}

export function choosePurchaseTemplate(templates) {
  const template = templates.find((item) => item?.id);
  if (!template) {
    throw new Error("NO_PURCHASE_TEMPLATE: seeded store has no active package template");
  }

  return template;
}

export function buildReservationPayload({
  addressId,
  dish,
  storeCode,
  userPackageId,
}) {
  return {
    addressId,
    items: [{ dishId: dish.id, weightJin: Number(dish.stepJin) }],
    storeCode,
    userPackageId,
    userVisibleRemark: "real-data-smoke",
  };
}

export function buildReservationUpdatePayload({
  addressId,
  dish,
  storeCode,
  userPackageId,
}) {
  const stepJin = Number(dish.stepJin);
  const stockJin = Number(dish.stockJin);
  const updatedWeightJin = Number((stepJin * 2).toFixed(2));

  if (stockJin < updatedWeightJin) {
    throw new Error(
      `NO_EDIT_STOCK_MARGIN: dish ${dish.id} needs ${updatedWeightJin}斤 stock`,
    );
  }

  return {
    addressId,
    items: [{ dishId: dish.id, weightJin: updatedWeightJin }],
    storeCode,
    userPackageId,
    userVisibleRemark: "real-data-smoke-edit",
  };
}

export function buildMiniappNoPackageReservationPayload({
  addressId,
  dish,
  storeCode,
  userPackageId,
}) {
  return {
    addressId,
    items: [{ dishId: dish.id, weightJin: Number(dish.stepJin) }],
    storeCode,
    userPackageId,
    userVisibleRemark: "real-data-smoke-no-package",
  };
}

export function buildMiniappFrozenPackageReservationPayload({
  addressId,
  dish,
  storeCode,
  userPackageId,
}) {
  return {
    addressId,
    items: [{ dishId: dish.id, weightJin: Number(dish.stepJin) }],
    storeCode,
    userPackageId,
    userVisibleRemark: "real-data-smoke-frozen-package",
  };
}

export function buildMiniappWxPhoneLoginPayload({ loginCode, phoneCode, storeCode }) {
  return {
    loginCode,
    phoneCode,
    storeCode,
  };
}

export async function startWechatStubServer({
  accessToken = "smoke-access-token",
  openid,
  phone,
  unionid,
}) {
  const requests = [];
  const server = createServer((request, response) => {
    void (async () => {
      const chunks = [];
      for await (const chunk of request) {
        chunks.push(Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks).toString("utf8");
      const url = new URL(request.url ?? "/", "http://127.0.0.1");

      requests.push({
        body,
        method: request.method,
        pathname: url.pathname,
        search: url.search,
      });

      response.setHeader("content-type", "application/json; charset=utf-8");

      if (url.pathname === "/sns/jscode2session") {
        response.end(
          JSON.stringify({
            openid,
            session_key: "smoke-session-key",
            unionid,
          }),
        );
        return;
      }

      if (url.pathname === "/cgi-bin/token") {
        response.end(
          JSON.stringify({
            access_token: accessToken,
            expires_in: 7200,
          }),
        );
        return;
      }

      if (url.pathname === "/wxa/business/getuserphonenumber") {
        response.end(
          JSON.stringify({
            errcode: 0,
            phone_info: {
              countryCode: "86",
              purePhoneNumber: phone,
            },
          }),
        );
        return;
      }

      response.statusCode = 404;
      response.end(JSON.stringify({ errmsg: `unexpected path: ${url.pathname}` }));
    })().catch((error) => {
      response.statusCode = 500;
      response.end(
        JSON.stringify({
          errmsg: error instanceof Error ? error.message : "stub failed",
        }),
      );
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("WECHAT_STUB_ADDRESS_UNAVAILABLE");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
    requests,
  };
}

export function buildManagedAdminServerCommand({ port, wechatApiBaseUrl }) {
  return {
    args: [
      "--filter",
      "@hentor/admin-web",
      "exec",
      "next",
      "start",
      "--port",
      String(port),
      "--hostname",
      "127.0.0.1",
    ],
    command: "pnpm",
    env: {
      WECHAT_API_BASE_URL: wechatApiBaseUrl,
    },
  };
}

export function assertWxPhoneLoginSmokeResult({
  db,
  expected,
  login,
  stubRequests,
}) {
  if (
    !login?.token ||
    login?.user?.phone !== expected.phone ||
    login?.store?.code !== expected.storeCode
  ) {
    throw new Error(`WX_PHONE_LOGIN_API_MISMATCH: ${JSON.stringify(login)}`);
  }

  if (
    db?.bindingSource !== "wechat_login" ||
    db?.bindingStatus !== "ACTIVE" ||
    db?.openid !== expected.openid ||
    db?.phone !== expected.phone ||
    db?.storeCode !== expected.storeCode ||
    db?.userId !== login.user.id ||
    db?.defaultStoreId !== login.store.id ||
    login.user.defaultStoreId !== login.store.id
  ) {
    throw new Error(`WX_PHONE_LOGIN_DB_MISMATCH: ${JSON.stringify(db)}`);
  }

  const paths = stubRequests.map((item) => item.pathname);
  for (const path of [
    "/sns/jscode2session",
    "/cgi-bin/token",
    "/wxa/business/getuserphonenumber",
  ]) {
    if (!paths.includes(path)) {
      throw new Error(`WX_PHONE_LOGIN_STUB_PATH_MISSING: ${path}`);
    }
  }

  return {
    bindingCreated: true,
    stubRequestCount: stubRequests.length,
    userId: login.user.id,
  };
}

export function buildSmokeAddressPayload({ storeCode }) {
  return {
    city: "杭州市",
    detail: "真实数据 smoke 602",
    district: "西湖区",
    isDefault: false,
    province: "浙江省",
    receiverName: "Smoke 测试",
    receiverPhone: "13800007521",
    storeCode,
  };
}

export function buildSmokeAddressUpdatePayload({ storeCode }) {
  return {
    city: "杭州市",
    detail: "真实数据 smoke 已编辑 602",
    district: "西湖区",
    isDefault: true,
    province: "浙江省",
    receiverName: "Smoke 编辑",
    receiverPhone: "13800007521",
    storeCode,
  };
}

export function buildPackagePurchasePayload({ storeCode, templateId }) {
  return {
    storeCode,
    templateId,
  };
}

export function buildMiniappAccountCancelPayload({ storeCode }) {
  return {
    reason: "real-data-smoke-account-cancel",
    storeCode,
  };
}

export function buildAdminStoreQueryUrl(baseUrl, params) {
  const url = new URL(baseUrl);
  url.searchParams.set("storeId", params.storeId);
  for (const [key, value] of Object.entries(params)) {
    if (key === "storeId" || value === undefined || value === null || value === "") {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export function buildAdminLoginPayload({ password, username }) {
  return {
    password,
    username,
  };
}

export function buildMiniappHideOrderUrl(baseUrl, { orderId, storeCode }) {
  return `${baseUrl}/api/v1/orders/${encodeURIComponent(
    orderId,
  )}/user-visible?storeCode=${encodeURIComponent(storeCode)}`;
}

export function buildAdminOrderPayload({
  addressId,
  dishId,
  internalRemark,
  storeId,
  userId,
  userPackageId,
  userVisibleRemark,
  weightJin,
}) {
  return {
    addressId,
    internalRemark,
    items: [{ dishId, weightJin }],
    storeId,
    userId,
    userPackageId,
    userVisibleRemark,
  };
}

export function buildAdminDishPayload({ imageKey, imageUrl, runId, storeId }) {
  return {
    category: "ROOT",
    description: "真实数据 smoke 临时菜品",
    imageKey,
    imageUrl,
    name: `Smoke 菜品 ${runId}`,
    sortOrder: 860,
    status: "ON_SALE",
    stepJin: 0.5,
    stockJin: 12.5,
    storeId,
  };
}

export function buildAdminDishUpdatePayload({ imageKey, imageUrl, runId, storeId }) {
  return {
    category: "ACTIVITY",
    description: "真实数据 smoke 临时菜品已编辑",
    imageKey,
    imageUrl,
    name: `Smoke 菜品已编辑 ${runId}`,
    sortOrder: 861,
    status: "OFF_SALE",
    stepJin: 1,
    stockJin: 3,
    storeId,
  };
}

export function buildAdminPackageTemplatePayload({ runId, storeId }) {
  return {
    name: `Smoke 套餐模板 ${runId}`,
    sortOrder: 880,
    storeId,
    totalTimes: 12,
    validDays: 45,
    weightLimitJin: 6.5,
  };
}

export function buildAdminPackageTemplateUpdatePayload({ runId, storeId }) {
  return {
    name: `Smoke 套餐模板已编辑 ${runId}`,
    sortOrder: 881,
    status: "DISABLED",
    storeId,
    totalTimes: 16,
    validDays: 60,
    weightLimitJin: 8,
  };
}

export function buildAdminBoundPackageTemplateCoreUpdatePayload({
  storeId,
  template,
}) {
  return {
    name: template?.name ?? "8斤周套餐",
    sortOrder: template?.sortOrder ?? 1,
    status: template?.status ?? "ACTIVE",
    storeId,
    totalTimes: (template?.totalTimes ?? 8) + 1,
    validDays: template?.validDays ?? 90,
    weightLimitJin: (template?.weightLimitJin ?? 8) + 1,
  };
}

const SMOKE_CONTRACT_ENDS_AT = "2099-12-31T15:59:59.000Z";
const SMOKE_TASK_STARTS_AT = "2026-01-01T00:00:00.000Z";

export function buildAdminFranchiseePayload({ runId }) {
  return {
    contactName: "Smoke 加盟商",
    contactPhone: "13800007531",
    contractEndsAt: SMOKE_CONTRACT_ENDS_AT,
    name: `Smoke 加盟商 ${runId}`,
    remark: "real-data-smoke-franchisee",
    status: "ACTIVE",
  };
}

export function buildAdminFranchiseeUpdatePayload() {
  return {
    contactName: "Smoke 加盟商已编辑",
    contactPhone: "13800007532",
    contractEndsAt: SMOKE_CONTRACT_ENDS_AT,
    name: "Smoke 加盟商已编辑",
    remark: "real-data-smoke-franchisee-edit",
    status: "SUSPENDED",
  };
}

export function buildAdminStorePayload({ franchiseeId, runId }) {
  return {
    address: "真实数据 smoke 路 88 号",
    city: "杭州市",
    code: `smoke-store-${runId}`,
    contactName: "Smoke 店长",
    contactPhone: "13800007533",
    customerServiceTel: "400-0752-100",
    cutoffTime: "18:00",
    district: "西湖区",
    franchiseEndsAt: SMOKE_CONTRACT_ENDS_AT,
    franchiseeId,
    name: `Smoke 加盟门店 ${runId}`,
    province: "浙江省",
    status: "ACTIVE",
    type: "FRANCHISE",
  };
}

export function buildAdminStoreUpdatePayload({ franchiseeId, runId }) {
  return {
    address: "真实数据 smoke 已编辑 99 号",
    city: "杭州市",
    code: `smoke-store-${runId}`,
    contactName: "Smoke 店长已编辑",
    contactPhone: "13800007534",
    customerServiceTel: "400-0752-200",
    cutoffTime: "17:30",
    district: "滨江区",
    franchiseEndsAt: SMOKE_CONTRACT_ENDS_AT,
    franchiseeId,
    name: `Smoke 加盟门店已编辑 ${runId}`,
    province: "浙江省",
    status: "DISABLED",
    type: "FRANCHISE",
  };
}

export function buildAdminTaskPayload({ dishId, runId, storeId }) {
  return {
    cutoffTime: "18:00",
    dishIds: [dishId],
    endsAt: SMOKE_CONTRACT_ENDS_AT,
    name: `Smoke 任务 ${runId}`,
    startsAt: SMOKE_TASK_STARTS_AT,
    status: "ACTIVE",
    storeId,
    tag: "限时预订",
  };
}

export function buildAdminTaskUpdatePayload({ dishId, runId, storeId }) {
  return {
    cutoffTime: "17:30",
    dishIds: [dishId],
    endsAt: SMOKE_CONTRACT_ENDS_AT,
    name: `Smoke 任务已编辑 ${runId}`,
    startsAt: SMOKE_TASK_STARTS_AT,
    status: "DISABLED",
    storeId,
    tag: "已停用",
  };
}

export function buildAdminTaskCopyPayload({ runId, storeId }) {
  return {
    name: `Smoke 任务复制 ${runId}`,
    storeId,
  };
}

export function buildAdminUserPayload({ roleId, runId, storeId }) {
  return {
    name: `Smoke 后台账号 ${runId}`,
    password: "SmokeAdmin123",
    phone: "13900007521",
    roleIds: [roleId],
    status: "ACTIVE",
    storeIds: [storeId],
    username: `smoke-admin-${runId}`,
  };
}

export function buildAdminUserUpdatePayload({ roleId, storeId }) {
  return {
    name: "Smoke 后台账号已编辑",
    phone: "13900007522",
    roleIds: [roleId],
    status: "DISABLED",
    storeIds: [storeId],
  };
}

export function buildAdminUserPasswordPayload() {
  return {
    newPassword: "SmokeAdmin456",
  };
}

export function buildAdminMemberDisablePayload({ storeId }) {
  return {
    disabledReason: "后台 smoke 禁用会员",
    remark: "real-data-smoke-member-disabled",
    status: "DISABLED",
    storeId,
  };
}

export function buildAdminMemberEnablePayload({ storeId }) {
  return {
    disabledReason: null,
    remark: "real-data-smoke-member-enabled",
    status: "ACTIVE",
    storeId,
  };
}

export function buildAdminUserPackageAdjustPayload({ storeId }) {
  return {
    expiresAt: SMOKE_CONTRACT_ENDS_AT,
    nextOrderDate: "2099-01-01T00:00:00.000Z",
    reason: "后台 smoke 调整用户套餐",
    storeId,
    totalTimes: 22,
    usedTimes: 3,
    weightLimitJin: 9.5,
  };
}

export function buildAdminSystemSettingsPayload({ storeId }) {
  return {
    aboutText: "真实数据 smoke 门店说明：用于验证后台系统设置写入与恢复。",
    cutoffTime: "17:45",
    customerServiceTel: "400-0752-300",
    privacyPolicyUrl: "https://example.com/hentor/privacy-smoke",
    storeId,
    userAgreementUrl: "https://example.com/hentor/agreement-smoke",
  };
}

function buildAdminSystemSettingsRestorePayload({ settings, storeId }) {
  return {
    aboutText: settings.aboutText ?? "",
    cutoffTime: settings.cutoffTime,
    customerServiceTel: settings.customerServiceTel ?? "",
    privacyPolicyUrl: settings.privacyPolicyUrl ?? "",
    storeId,
    userAgreementUrl: settings.userAgreementUrl ?? "",
  };
}

export function buildTinyPngUploadFormData() {
  const imageBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );
  const formData = new FormData();
  formData.set(
    "file",
    new File([imageBytes], "smoke-dish.png", { type: "image/png" }),
  );

  return formData;
}

export function assertAdminOrderStatus(order, expectedStatus) {
  if (order?.status !== expectedStatus) {
    throw new Error(
      `ADMIN_ORDER_STATUS_MISMATCH: expected ${expectedStatus}, got ${order?.status}`,
    );
  }

  return order;
}

export function assertTextIncludes(text, expectedText, label = "text") {
  if (!text.includes(expectedText)) {
    throw new Error(
      `${labelCode(label, "TEXT_MISSING")}: expected response to include ${expectedText}`,
    );
  }

  return true;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findFreePort() {
  const server = createNetServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  if (!address || typeof address === "string") {
    throw new Error("FREE_PORT_UNAVAILABLE");
  }

  return address.port;
}

function formatManagedServerOutput(output) {
  return output.join("").slice(-4000).trim();
}

async function waitForManagedAdminServer({ baseUrl, child, output }) {
  const deadline = Date.now() + 45_000;
  let lastError = "not attempted";

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `MANAGED_ADMIN_SERVER_EXITED: ${child.exitCode}\n${formatManagedServerOutput(
          output,
        )}`,
      );
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
      lastError = `HTTP_${response.status}: ${await response.text()}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(500);
  }

  throw new Error(
    `MANAGED_ADMIN_SERVER_TIMEOUT: ${lastError}\n${formatManagedServerOutput(
      output,
    )}`,
  );
}

export async function startManagedAdminServer({ port, wechatApiBaseUrl }) {
  const serverPort = port ?? (await findFreePort());
  const command = buildManagedAdminServerCommand({
    port: serverPort,
    wechatApiBaseUrl,
  });
  const output = [];
  const child = spawn(command.command, command.args, {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      ...command.env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => output.push(String(chunk)));
  child.stderr.on("data", (chunk) => output.push(String(chunk)));

  const baseUrl = `http://127.0.0.1:${serverPort}`;
  await waitForManagedAdminServer({ baseUrl, child, output });

  return {
    baseUrl,
    close: async () => {
      if (child.exitCode !== null) {
        return;
      }

      child.kill("SIGTERM");
      const exited = await Promise.race([
        new Promise((resolve) => child.once("exit", () => resolve("exit"))),
        delay(3000).then(() => "timeout"),
      ]);

      if (exited === "timeout" && child.exitCode === null) {
        child.kill("SIGKILL");
        await new Promise((resolve) => child.once("exit", resolve));
      }
    },
    output,
    port: serverPort,
  };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`HTTP_${response.status}: ${text}`);
  }

  return {
    headers: response.headers,
    payload,
  };
}

async function requestJsonAllowError(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  return {
    headers: response.headers,
    payload,
    status: response.status,
  };
}

async function requestText(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP_${response.status}: ${text}`);
  }

  return {
    headers: response.headers,
    text,
  };
}

async function requestBinary(url, options = {}) {
  const response = await fetch(url, options);
  const bytes = new Uint8Array(await response.arrayBuffer());

  if (!response.ok) {
    throw new Error(
      `HTTP_${response.status}: ${new TextDecoder().decode(bytes)}`,
    );
  }

  return {
    bytes,
    headers: response.headers,
  };
}

async function runDbEval(source) {
  const { stdout } = await execFileAsync(
    "pnpm",
    ["--filter", "@hentor/db", "exec", "tsx", "-e", source],
    {
      cwd: new URL("..", import.meta.url),
      env: process.env,
      maxBuffer: 1024 * 1024 * 4,
    },
  );

  const line = stdout
    .trim()
    .split("\n")
    .filter((item) => item.trim().startsWith("{"))
    .at(-1);

  if (!line) {
    throw new Error(`DB_EVAL_NO_JSON: ${stdout}`);
  }

  return JSON.parse(line);
}

async function createMiniSession({ storeCode, userId }) {
  return runDbEval(`
    import { createHmac } from "node:crypto";
    import { prisma } from "./src/index";
    void (async () => {
      const store = await prisma.store.findUniqueOrThrow({ where: { code: ${JSON.stringify(
        storeCode,
      )} } });
      const userId = ${JSON.stringify(userId ?? null)};
      const user = await prisma.user.findUniqueOrThrow({
        where: userId ? { id: userId } : { openid: "mock-openid-lotus-001" },
      });
      const secret = process.env.MINI_SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET ?? "dev-hentor-mini-session-secret-change-before-production";
      const session = { issuedAt: Date.now(), openid: user.openid, storeId: store.id, userId: user.id };
      const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
      const signature = createHmac("sha256", secret).update(payload).digest("base64url");
      console.log(JSON.stringify({ storeId: store.id, token: \`\${payload}.\${signature}\`, userId: user.id }));
      await prisma.$disconnect();
    })();
  `);
}

async function createAdminSmokeFixture({ storeId }) {
  const runId = randomUUID().replaceAll("-", "").slice(0, 12);
  return runDbEval(`
    import { prisma, Prisma } from "./src/index";
    void (async () => {
      const runId = ${JSON.stringify(runId)};
      const ids = {
        addressId: \`smoke-address-\${runId}\`,
        dishId: \`smoke-dish-\${runId}\`,
        openid: \`smoke-admin-openid-\${runId}\`,
        templateId: \`smoke-template-\${runId}\`,
        userId: \`smoke-user-\${runId}\`,
        userPackageId: \`smoke-user-package-\${runId}\`,
      };
      const store = await prisma.store.findUniqueOrThrow({
        where: { id: ${JSON.stringify(storeId)} },
        select: { cutoffTime: true, id: true },
      });
      await prisma.store.update({
        where: { id: store.id },
        data: { cutoffTime: "23:59" },
      });
      await prisma.user.create({
        data: {
          id: ids.userId,
          defaultStoreId: store.id,
          nickname: "后台 Smoke 会员",
          openid: ids.openid,
          phone: "13900007521",
        },
      });
      await prisma.memberStoreBinding.create({
        data: {
          isDefault: true,
          source: "real-data-smoke-admin",
          storeId: store.id,
          userId: ids.userId,
        },
      });
      await prisma.address.create({
        data: {
          id: ids.addressId,
          city: "北京市",
          detail: "后台 smoke 小区 1 栋 101",
          district: "朝阳区",
          isDefault: true,
          province: "北京市",
          receiverName: "后台 Smoke",
          receiverPhone: "13900007521",
          storeId: store.id,
          userId: ids.userId,
        },
      });
      await prisma.packageTemplate.create({
        data: {
          id: ids.templateId,
          name: "后台 Smoke 临时套餐",
          sortOrder: 999,
          storeId: store.id,
          totalTimes: 20,
          validDays: 90,
          weightLimitJin: new Prisma.Decimal("20.00"),
        },
      });
      await prisma.userPackage.create({
        data: {
          id: ids.userPackageId,
          expiresAt: new Date("2099-12-31T23:59:59+08:00"),
          nameSnapshot: "后台 Smoke 临时套餐",
          startsAt: new Date("2026-01-01T00:00:00+08:00"),
          status: "ACTIVE",
          storeId: store.id,
          templateId: ids.templateId,
          totalTimes: 20,
          usedTimes: 0,
          userId: ids.userId,
          weightLimitJin: new Prisma.Decimal("20.00"),
        },
      });
      await prisma.dish.create({
        data: {
          id: ids.dishId,
          category: "LEAFY",
          description: "后台真实数据 smoke 临时菜品",
          name: "Smoke 菠菜",
          sortOrder: 999,
          status: "ON_SALE",
          stepJin: new Prisma.Decimal("0.50"),
          stockJin: new Prisma.Decimal("50.00"),
          storeId: store.id,
        },
      });
      console.log(JSON.stringify({
        ...ids,
        originalCutoffTime: store.cutoffTime,
        runId,
        storeId: store.id,
      }));
      await prisma.$disconnect();
    })();
  `);
}

async function cleanupAdminSmokeFixture(fixture, orderIds = []) {
  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const fixture = ${JSON.stringify(fixture)};
      const orderIds = ${JSON.stringify(orderIds)};
      await prisma.$transaction(async (tx) => {
        await tx.adminOperationLog.deleteMany({
          where: {
            OR: [
              { resourceId: { in: [...orderIds, fixture.dishId, fixture.userPackageId, fixture.userId] } },
              { resourceId: fixture.templateId },
            ],
          },
        });
        await tx.orderChangeLog.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
        await tx.inventoryLog.deleteMany({ where: { dishId: fixture.dishId } });
        await tx.packageOperationLog.deleteMany({
          where: { userPackageId: fixture.userPackageId },
        });
        await tx.userPackage.deleteMany({ where: { id: fixture.userPackageId } });
        await tx.address.deleteMany({ where: { id: fixture.addressId } });
        await tx.memberStoreBinding.deleteMany({
          where: { userId: fixture.userId, storeId: fixture.storeId },
        });
        await tx.dish.deleteMany({ where: { id: fixture.dishId } });
        await tx.packageTemplate.deleteMany({ where: { id: fixture.templateId } });
        await tx.user.deleteMany({ where: { id: fixture.userId } });
        if (fixture.originalCutoffTime) {
          await tx.store.update({
            where: { id: fixture.storeId },
            data: { cutoffTime: fixture.originalCutoffTime },
          });
        }
      });
      console.log(JSON.stringify({ cleaned: true, orderCount: orderIds.length }));
      await prisma.$disconnect();
    })();
  `);
}

async function setMiniappSmokeCutoffWindow(storeCode) {
  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const store = await prisma.store.findUniqueOrThrow({
        where: { code: ${JSON.stringify(storeCode)} },
        select: { cutoffTime: true, id: true },
      });
      await prisma.store.update({
        where: { id: store.id },
        data: { cutoffTime: "24:00" },
      });
      console.log(JSON.stringify({
        originalCutoffTime: store.cutoffTime,
        storeId: store.id,
        temporaryCutoffTime: "24:00",
      }));
      await prisma.$disconnect();
    })();
  `);
}

async function restoreMiniappSmokeCutoffWindow(cutoffWindow) {
  if (!cutoffWindow?.storeId || !cutoffWindow?.originalCutoffTime) {
    return { restored: false };
  }

  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      await prisma.store.update({
        where: { id: ${JSON.stringify(cutoffWindow.storeId)} },
        data: { cutoffTime: ${JSON.stringify(cutoffWindow.originalCutoffTime)} },
      });
      console.log(JSON.stringify({
        restored: true,
        storeId: ${JSON.stringify(cutoffWindow.storeId)},
      }));
      await prisma.$disconnect();
    })();
  `);
}

async function withMiniappSmokeCutoffWindow(storeCode, callback) {
  const cutoffWindow = await setMiniappSmokeCutoffWindow(storeCode);
  let result = null;
  let thrown = null;
  let restoreResult = null;

  try {
    result = await callback();
  } catch (error) {
    thrown = error;
  } finally {
    restoreResult = await restoreMiniappSmokeCutoffWindow(cutoffWindow);
  }

  if (thrown) {
    throw thrown;
  }

  return {
    ...result,
    cutoffWindow: {
      originalCutoffTime: cutoffWindow.originalCutoffTime,
      restored: restoreResult?.restored === true,
      storeId: cutoffWindow.storeId,
      temporaryCutoffTime: cutoffWindow.temporaryCutoffTime,
    },
  };
}

async function inspectOrder(orderId) {
  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const order = await prisma.order.findUniqueOrThrow({
        where: { id: ${JSON.stringify(orderId)} },
        include: { items: true, userPackage: true },
      });
      const changeLogCount = await prisma.orderChangeLog.count({
        where: { orderId: ${JSON.stringify(orderId)} },
      });
      console.log(JSON.stringify({
        addressId: order.addressId,
        cancelReason: order.cancelReason,
        changeLogCount,
        itemCount: order.items.length,
        items: order.items.map((item) => ({
          dishId: item.dishId,
          weightJin: Number(item.weightJin),
        })),
        modifiedAt: order.modifiedAt?.toISOString() ?? null,
        orderStatus: order.status,
        packageUsedTimes: order.userPackage.usedTimes,
        totalWeightJin: Number(order.totalWeightJin),
      }));
      await prisma.$disconnect();
    })();
  `);
}

async function inspectPackagePurchase(purchaseOrderId) {
  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const purchase = await prisma.packagePurchaseOrder.findUniqueOrThrow({
        where: { id: ${JSON.stringify(purchaseOrderId)} },
      });
      console.log(JSON.stringify({
        amountFen: purchase.amountFen,
        payChannel: purchase.payChannel,
        status: purchase.status,
      }));
      await prisma.$disconnect();
    })();
  `);
}

async function expireMiniappUserPackage(userPackageId) {
  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const userPackage = await prisma.userPackage.update({
        where: { id: ${JSON.stringify(userPackageId)} },
        data: {
          expiresAt: new Date("2020-01-01T00:00:00.000Z"),
          status: "EXPIRED",
        },
        select: { expiresAt: true, id: true, status: true },
      });
      console.log(JSON.stringify({
        expiresAt: userPackage.expiresAt.toISOString(),
        id: userPackage.id,
        status: userPackage.status,
      }));
      await prisma.$disconnect();
    })();
  `);
}

async function countMiniappUserOrders({ storeId, userId }) {
  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const count = await prisma.order.count({
        where: {
          storeId: ${JSON.stringify(storeId)},
          userId: ${JSON.stringify(userId)},
        },
      });
      console.log(JSON.stringify({ count }));
      await prisma.$disconnect();
    })();
  `);
}

async function inspectWxPhoneSmokeUser({ openid, storeCode }) {
  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const store = await prisma.store.findUniqueOrThrow({
        where: { code: ${JSON.stringify(storeCode)} },
        select: { code: true, id: true },
      });
      const user = await prisma.user.findUniqueOrThrow({
        where: { openid: ${JSON.stringify(openid)} },
        select: {
          defaultStoreId: true,
          id: true,
          openid: true,
          phone: true,
        },
      });
      const binding = await prisma.memberStoreBinding.findUniqueOrThrow({
        where: {
          userId_storeId: {
            storeId: store.id,
            userId: user.id,
          },
        },
        select: {
          source: true,
          status: true,
        },
      });
      console.log(JSON.stringify({
        bindingSource: binding.source,
        bindingStatus: binding.status,
        defaultStoreId: user.defaultStoreId,
        openid: user.openid,
        phone: user.phone,
        storeCode: store.code,
        userId: user.id,
      }));
      await prisma.$disconnect();
    })();
  `);
}

async function cleanupWxPhoneSmokeUser({ openid }) {
  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const openid = ${JSON.stringify(openid)};
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { openid },
          select: { id: true },
        });
        if (!user) {
          return { deletedBindingCount: 0, deletedUserCount: 0 };
        }

        const bindings = await tx.memberStoreBinding.deleteMany({
          where: { userId: user.id },
        });
        const users = await tx.user.deleteMany({
          where: { id: user.id },
        });

        return {
          deletedBindingCount: bindings.count,
          deletedUserCount: users.count,
        };
      });
      console.log(JSON.stringify(result));
      await prisma.$disconnect();
    })();
  `);
}

async function inspectMiniappAccountState({ storeId, userId }) {
  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const [user, binding] = await Promise.all([
        prisma.user.findUniqueOrThrow({
          where: { id: ${JSON.stringify(userId)} },
          select: { disabledReason: true, id: true, status: true },
        }),
        prisma.memberStoreBinding.findUniqueOrThrow({
          where: {
            userId_storeId: {
              storeId: ${JSON.stringify(storeId)},
              userId: ${JSON.stringify(userId)},
            },
          },
          select: { status: true },
        }),
      ]);
      console.log(JSON.stringify({
        bindingStatus: binding.status,
        disabledReason: user.disabledReason,
        status: user.status,
        userId: user.id,
      }));
      await prisma.$disconnect();
    })();
  `);
}

async function restoreMiniappAccountState({ storeId, userId }) {
  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const result = await prisma.$transaction(async (tx) => {
        const [user, binding] = await Promise.all([
          tx.user.update({
            where: { id: ${JSON.stringify(userId)} },
            data: { disabledReason: null, status: "ACTIVE" },
            select: { disabledReason: true, id: true, status: true },
          }),
          tx.memberStoreBinding.update({
            where: {
              userId_storeId: {
                storeId: ${JSON.stringify(storeId)},
                userId: ${JSON.stringify(userId)},
              },
            },
            data: { status: "ACTIVE" },
            select: { status: true },
          }),
        ]);
        return {
          bindingStatus: binding.status,
          disabledReason: user.disabledReason,
          status: user.status,
          userId: user.id,
        };
      });
      console.log(JSON.stringify(result));
      await prisma.$disconnect();
    })();
  `);
}

async function cleanupPackagePurchase(purchaseOrderId) {
  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      await prisma.paymentOrder.deleteMany({
        where: { purchaseOrderId: ${JSON.stringify(purchaseOrderId)} },
      });
      const deleted = await prisma.packagePurchaseOrder.deleteMany({
        where: { id: ${JSON.stringify(purchaseOrderId)} },
      });
      console.log(JSON.stringify({ deleted: deleted.count }));
      await prisma.$disconnect();
    })();
  `);
}

async function cleanupAdminSmokeTasks(taskIds) {
  const ids = [...new Set(taskIds.filter(Boolean))];
  if (ids.length === 0) {
    return { deletedTaskCount: 0 };
  }

  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const taskIds = ${JSON.stringify(ids)};
      const result = await prisma.$transaction(async (tx) => {
        await tx.adminOperationLog.deleteMany({
          where: {
            resourceId: { in: taskIds },
          },
        });
        await tx.taskDish.deleteMany({ where: { taskId: { in: taskIds } } });
        const tasks = await tx.task.deleteMany({ where: { id: { in: taskIds } } });
        return { deletedTaskCount: tasks.count };
      });
      console.log(JSON.stringify(result));
      await prisma.$disconnect();
    })();
  `);
}

async function cleanupAdminPackageTemplate(templateId) {
  if (!templateId) {
    return { deletedTemplateCount: 0 };
  }

  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const templateId = ${JSON.stringify(templateId)};
      const result = await prisma.$transaction(async (tx) => {
        await tx.adminOperationLog.deleteMany({
          where: { resourceId: templateId },
        });
        const template = await tx.packageTemplate.deleteMany({
          where: { id: templateId },
        });
        return { deletedTemplateCount: template.count };
      });
      console.log(JSON.stringify(result));
      await prisma.$disconnect();
    })();
  `);
}

async function cleanupAdminDish(dishId) {
  if (!dishId) {
    return { deletedDishCount: 0 };
  }

  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const dishId = ${JSON.stringify(dishId)};
      const result = await prisma.$transaction(async (tx) => {
        await tx.adminOperationLog.deleteMany({
          where: { resourceId: dishId },
        });
        await tx.inventoryLog.deleteMany({ where: { dishId } });
        await tx.taskDish.deleteMany({ where: { dishId } });
        const dish = await tx.dish.deleteMany({ where: { id: dishId } });
        return { deletedDishCount: dish.count };
      });
      console.log(JSON.stringify(result));
      await prisma.$disconnect();
    })();
  `);
}

async function cleanupAdminSmokeUser(adminUserId) {
  if (!adminUserId) {
    return { deletedUserCount: 0 };
  }

  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const adminUserId = ${JSON.stringify(adminUserId)};
      const result = await prisma.$transaction(async (tx) => {
        const logs = await tx.adminOperationLog.deleteMany({
          where: {
            OR: [
              { operatorId: adminUserId },
              { resourceId: adminUserId },
            ],
          },
        });
        await tx.adminUserRole.deleteMany({ where: { adminUserId } });
        await tx.adminUserStore.deleteMany({ where: { adminUserId } });
        const user = await tx.adminUser.deleteMany({ where: { id: adminUserId } });
        return { deletedLogCount: logs.count, deletedUserCount: user.count };
      });
      console.log(JSON.stringify(result));
      await prisma.$disconnect();
    })();
  `);
}

async function createAdminPermissionSmokeAccount({ runId, storeId }) {
  const password = "SmokeNoPermission123";
  const roleCode = `smoke_no_permission_${runId}`;
  const username = `smoke-no-permission-${runId}`;

  return runDbEval(`
    import { hash } from "bcryptjs";
    import { prisma } from "./src/index";
    void (async () => {
      const passwordHash = await hash(${JSON.stringify(password)}, 10);
      const result = await prisma.$transaction(async (tx) => {
        const role = await tx.adminRole.create({
          data: {
            code: ${JSON.stringify(roleCode)},
            name: ${JSON.stringify(`Smoke 无业务权限 ${runId}`)},
          },
          select: { id: true },
        });
        const user = await tx.adminUser.create({
          data: {
            name: ${JSON.stringify(`Smoke 无业务权限账号 ${runId}`)},
            passwordHash,
            phone: "13900007523",
            status: "ACTIVE",
            username: ${JSON.stringify(username)},
          },
          select: { id: true, username: true },
        });
        await tx.adminUserRole.create({
          data: {
            adminUserId: user.id,
            roleId: role.id,
          },
        });
        await tx.adminUserStore.create({
          data: {
            adminUserId: user.id,
            storeId: ${JSON.stringify(storeId)},
          },
        });

        return {
          adminUserId: user.id,
          password: ${JSON.stringify(password)},
          roleId: role.id,
          storeId: ${JSON.stringify(storeId)},
          username: user.username,
        };
      });
      console.log(JSON.stringify(result));
      await prisma.$disconnect();
    })();
  `);
}

async function cleanupAdminPermissionSmokeAccount(account) {
  if (!account?.adminUserId && !account?.roleId) {
    return { deletedRoleCount: 0, deletedUserCount: 0 };
  }

  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const adminUserId = ${JSON.stringify(account?.adminUserId ?? null)};
      const roleId = ${JSON.stringify(account?.roleId ?? null)};
      const result = await prisma.$transaction(async (tx) => {
        const logs = adminUserId
          ? await tx.adminOperationLog.deleteMany({
              where: {
                OR: [
                  { operatorId: adminUserId },
                  { resourceId: adminUserId },
                ],
              },
            })
          : { count: 0 };
        if (adminUserId) {
          await tx.adminUserRole.deleteMany({ where: { adminUserId } });
          await tx.adminUserStore.deleteMany({ where: { adminUserId } });
        }
        if (roleId) {
          await tx.adminRolePermission.deleteMany({ where: { roleId } });
        }
        const user = adminUserId
          ? await tx.adminUser.deleteMany({ where: { id: adminUserId } })
          : { count: 0 };
        const role = roleId
          ? await tx.adminRole.deleteMany({ where: { id: roleId } })
          : { count: 0 };
        return {
          deletedLogCount: logs.count,
          deletedRoleCount: role.count,
          deletedUserCount: user.count,
        };
      });
      console.log(JSON.stringify(result));
      await prisma.$disconnect();
    })();
  `);
}

async function cleanupAdminStoreWorkflow({ franchiseeId, storeId }) {
  if (!franchiseeId && !storeId) {
    return { deletedFranchiseeCount: 0, deletedStoreCount: 0 };
  }

  return runDbEval(`
    import { prisma } from "./src/index";
    void (async () => {
      const franchiseeId = ${JSON.stringify(franchiseeId)};
      const storeId = ${JSON.stringify(storeId)};
      const result = await prisma.$transaction(async (tx) => {
        await tx.adminOperationLog.deleteMany({
          where: {
            OR: [
              storeId ? { storeId } : undefined,
              storeId ? { resourceId: storeId } : undefined,
              franchiseeId ? { resourceId: franchiseeId } : undefined,
            ].filter(Boolean),
          },
        });
        const store = storeId
          ? await tx.store.deleteMany({ where: { id: storeId } })
          : { count: 0 };
        const franchisee = franchiseeId
          ? await tx.franchisee.deleteMany({ where: { id: franchiseeId } })
          : { count: 0 };
        return {
          deletedFranchiseeCount: franchisee.count,
          deletedStoreCount: store.count,
        };
      });
      console.log(JSON.stringify(result));
      await prisma.$disconnect();
    })();
  `);
}

async function checkHealth(baseUrl) {
  const { payload } = await requestJson(`${baseUrl}/api/health`);
  assertApiSuccess(payload, "health");
  return { ok: true };
}

function assertArrayField(payload, field, label) {
  if (!Array.isArray(payload?.[field])) {
    throw new Error(`${labelCode(label, "MISSING")}: response has no ${field} array`);
  }
  return payload[field];
}

async function checkAdminCollection(baseUrl, cookie, path, label, options = {}) {
  const url = options.storeId
    ? buildAdminStoreQueryUrl(`${baseUrl}${path}`, {
        storeId: options.storeId,
        ...(options.params ?? {}),
      })
    : `${baseUrl}${path}`;
  const { payload } = await requestJson(url, { headers: { cookie } });
  const data = assertApiSuccess(payload, label);
  const items = options.arrayField
    ? assertArrayField(data, options.arrayField, label)
    : assertListPayload(data, label).items;
  return { data, itemCount: items.length };
}

async function checkAdminDishImageUpload(baseUrl, cookie) {
  const uploadResponse = await requestJson(
    `${baseUrl}/api/admin/uploads/dish-images`,
    {
      body: buildTinyPngUploadFormData(),
      headers: { cookie },
      method: "POST",
    },
  );
  const image = assertApiSuccess(
    uploadResponse.payload,
    "admin dish image upload",
  ).image;

  if (!image?.key?.startsWith("dishes/") || !image?.url) {
    throw new Error(`ADMIN_IMAGE_UPLOAD_MISMATCH: ${JSON.stringify(image)}`);
  }

  const downloaded = await requestBinary(image.url);
  const contentType = downloaded.headers.get("content-type") ?? "";
  if (!contentType.includes("image/png") || downloaded.bytes.length < 60) {
    throw new Error(
      `ADMIN_IMAGE_DOWNLOAD_MISMATCH: ${contentType} ${downloaded.bytes.length}`,
    );
  }

  return {
    key: image.key,
    size: downloaded.bytes.length,
    url: image.url,
  };
}

async function checkAdminDishWorkflow(baseUrl, cookie, { image, runId, storeId }) {
  let dishId = null;
  let result = null;
  let cleanupResult = null;

  try {
    const createPayload = buildAdminDishPayload({
      imageKey: image.key,
      imageUrl: image.url,
      runId,
      storeId,
    });
    const createResponse = await requestJson(`${baseUrl}/api/admin/dishes`, {
      body: JSON.stringify(createPayload),
      headers: {
        cookie,
        "content-type": "application/json",
      },
      method: "POST",
    });
    const created = assertApiSuccess(createResponse.payload, "admin dish create").dish;
    dishId = created.id;
    if (
      !dishId ||
      created.name !== createPayload.name ||
      created.status !== "ON_SALE" ||
      created.category !== createPayload.category ||
      created.imageKey !== createPayload.imageKey ||
      created.imageUrl !== createPayload.imageUrl ||
      created.stockJin !== createPayload.stockJin
    ) {
      throw new Error(`ADMIN_DISH_CREATE_MISMATCH: ${JSON.stringify(created)}`);
    }

    const detailResponse = await requestJson(
      buildAdminStoreQueryUrl(
        `${baseUrl}/api/admin/dishes/${encodeURIComponent(dishId)}`,
        { storeId },
      ),
      { headers: { cookie } },
    );
    const detail = assertApiSuccess(detailResponse.payload, "admin dish detail").dish;
    if (
      detail.id !== dishId ||
      detail.name !== createPayload.name ||
      detail.imageKey !== createPayload.imageKey ||
      !Array.isArray(detail.inventoryLogs)
    ) {
      throw new Error(`ADMIN_DISH_DETAIL_MISMATCH: ${JSON.stringify(detail)}`);
    }

    const updatePayload = buildAdminDishUpdatePayload({
      imageKey: image.key,
      imageUrl: image.url,
      runId,
      storeId,
    });
    const updateResponse = await requestJson(
      `${baseUrl}/api/admin/dishes/${encodeURIComponent(dishId)}`,
      {
        body: JSON.stringify(updatePayload),
        headers: {
          cookie,
          "content-type": "application/json",
        },
        method: "PUT",
      },
    );
    const updated = assertApiSuccess(updateResponse.payload, "admin dish update").dish;
    if (
      updated.id !== dishId ||
      updated.name !== updatePayload.name ||
      updated.status !== "OFF_SALE" ||
      updated.category !== updatePayload.category ||
      updated.stepJin !== updatePayload.stepJin ||
      updated.stockJin !== updatePayload.stockJin
    ) {
      throw new Error(`ADMIN_DISH_UPDATE_MISMATCH: ${JSON.stringify(updated)}`);
    }

    const listResponse = await requestJson(
      buildAdminStoreQueryUrl(`${baseUrl}/api/admin/dishes`, {
        query: updatePayload.name,
        status: "OFF_SALE",
        storeId,
      }),
      { headers: { cookie } },
    );
    const list = assertListPayload(
      assertApiSuccess(listResponse.payload, "admin dishes after workflow"),
      "admin dishes",
    );
    if (
      !list.items.some(
        (item) =>
          item.id === dishId &&
          item.name === updatePayload.name &&
          item.status === "OFF_SALE",
      )
    ) {
      throw new Error("ADMIN_DISH_LIST_MISSING: edited dish missing");
    }

    result = {
      dishId,
      dishStatus: updated.status,
      stockJin: updated.stockJin,
    };
  } finally {
    cleanupResult = await cleanupAdminDish(dishId);
  }

  if (dishId && cleanupResult?.deletedDishCount !== 1) {
    throw new Error(`ADMIN_DISH_CLEANUP_FAILED: ${JSON.stringify(cleanupResult)}`);
  }

  return {
    ...result,
    cleaned: true,
  };
}

async function checkAdminStoreWorkflow(baseUrl, cookie, { runId }) {
  let franchiseeId = null;
  let storeId = null;
  let result = null;
  let cleanupResult = null;

  try {
    const franchiseePayload = buildAdminFranchiseePayload({ runId });
    const createFranchiseeResponse = await requestJson(
      `${baseUrl}/api/admin/franchisees`,
      {
        body: JSON.stringify(franchiseePayload),
        headers: {
          cookie,
          "content-type": "application/json",
        },
        method: "POST",
      },
    );
    const createdFranchisee = assertApiSuccess(
      createFranchiseeResponse.payload,
      "admin franchisee create",
    ).franchisee;
    franchiseeId = createdFranchisee.id;
    if (
      !franchiseeId ||
      createdFranchisee.name !== franchiseePayload.name ||
      createdFranchisee.status !== "ACTIVE"
    ) {
      throw new Error(
        `ADMIN_FRANCHISEE_CREATE_MISMATCH: ${JSON.stringify(createdFranchisee)}`,
      );
    }

    const franchiseeDetailResponse = await requestJson(
      `${baseUrl}/api/admin/franchisees/${encodeURIComponent(franchiseeId)}`,
      { headers: { cookie } },
    );
    const franchiseeDetail = assertApiSuccess(
      franchiseeDetailResponse.payload,
      "admin franchisee detail",
    ).franchisee;
    if (
      franchiseeDetail.id !== franchiseeId ||
      franchiseeDetail.contactPhone !== franchiseePayload.contactPhone
    ) {
      throw new Error(
        `ADMIN_FRANCHISEE_DETAIL_MISMATCH: ${JSON.stringify(franchiseeDetail)}`,
      );
    }

    const franchiseeUpdatePayload = buildAdminFranchiseeUpdatePayload();
    const updateFranchiseeResponse = await requestJson(
      `${baseUrl}/api/admin/franchisees/${encodeURIComponent(franchiseeId)}`,
      {
        body: JSON.stringify(franchiseeUpdatePayload),
        headers: {
          cookie,
          "content-type": "application/json",
        },
        method: "PUT",
      },
    );
    const updatedFranchisee = assertApiSuccess(
      updateFranchiseeResponse.payload,
      "admin franchisee update",
    ).franchisee;
    if (
      updatedFranchisee.id !== franchiseeId ||
      updatedFranchisee.name !== franchiseeUpdatePayload.name ||
      updatedFranchisee.status !== "SUSPENDED"
    ) {
      throw new Error(
        `ADMIN_FRANCHISEE_UPDATE_MISMATCH: ${JSON.stringify(updatedFranchisee)}`,
      );
    }

    const storePayload = buildAdminStorePayload({ franchiseeId, runId });
    const createStoreResponse = await requestJson(`${baseUrl}/api/admin/stores`, {
      body: JSON.stringify(storePayload),
      headers: {
        cookie,
        "content-type": "application/json",
      },
      method: "POST",
    });
    const createdStore = assertApiSuccess(
      createStoreResponse.payload,
      "admin store create",
    ).store;
    storeId = createdStore.id;
    if (
      !storeId ||
      createdStore.name !== storePayload.name ||
      createdStore.status !== "ACTIVE" ||
      createdStore.type !== "FRANCHISE"
    ) {
      throw new Error(`ADMIN_STORE_CREATE_MISMATCH: ${JSON.stringify(createdStore)}`);
    }

    const storeDetailResponse = await requestJson(
      `${baseUrl}/api/admin/stores/${encodeURIComponent(storeId)}`,
      { headers: { cookie } },
    );
    const storeDetail = assertApiSuccess(
      storeDetailResponse.payload,
      "admin store detail",
    ).store;
    if (
      storeDetail.id !== storeId ||
      storeDetail.code !== storePayload.code ||
      storeDetail.franchiseeId !== franchiseeId
    ) {
      throw new Error(`ADMIN_STORE_DETAIL_MISMATCH: ${JSON.stringify(storeDetail)}`);
    }

    const storeUpdatePayload = buildAdminStoreUpdatePayload({ franchiseeId, runId });
    const updateStoreResponse = await requestJson(
      `${baseUrl}/api/admin/stores/${encodeURIComponent(storeId)}`,
      {
        body: JSON.stringify(storeUpdatePayload),
        headers: {
          cookie,
          "content-type": "application/json",
        },
        method: "PUT",
      },
    );
    const updatedStore = assertApiSuccess(
      updateStoreResponse.payload,
      "admin store update",
    ).store;
    if (
      updatedStore.id !== storeId ||
      updatedStore.name !== storeUpdatePayload.name ||
      updatedStore.status !== "DISABLED" ||
      updatedStore.type !== "FRANCHISE"
    ) {
      throw new Error(`ADMIN_STORE_UPDATE_MISMATCH: ${JSON.stringify(updatedStore)}`);
    }

    const updatedStoreDetailResponse = await requestJson(
      `${baseUrl}/api/admin/stores/${encodeURIComponent(storeId)}`,
      { headers: { cookie } },
    );
    const updatedStoreDetail = assertApiSuccess(
      updatedStoreDetailResponse.payload,
      "admin store detail after update",
    ).store;
    if (
      updatedStoreDetail.cutoffTime !== storeUpdatePayload.cutoffTime ||
      updatedStoreDetail.contactPhone !== storeUpdatePayload.contactPhone ||
      updatedStoreDetail.district !== storeUpdatePayload.district
    ) {
      throw new Error(
        `ADMIN_STORE_UPDATE_DETAIL_MISMATCH: ${JSON.stringify(updatedStoreDetail)}`,
      );
    }

    const storeListResponse = await requestJson(
      `${baseUrl}/api/admin/stores?query=${encodeURIComponent(storeUpdatePayload.code)}`,
      { headers: { cookie } },
    );
    const storeList = assertApiSuccess(
      storeListResponse.payload,
      "admin stores after update",
    );
    if (
      !storeList.stores?.some(
        (item) =>
          item.id === storeId &&
          item.code === storeUpdatePayload.code &&
          item.status === "DISABLED",
      )
    ) {
      throw new Error("ADMIN_STORE_LIST_MISSING: edited store was not listed");
    }

    result = {
      franchiseeId,
      franchiseeStatus: updatedFranchisee.status,
      storeCode: storeUpdatePayload.code,
      storeId,
      storeStatus: updatedStore.status,
      storeType: updatedStore.type,
    };
  } finally {
    cleanupResult = await cleanupAdminStoreWorkflow({ franchiseeId, storeId });
  }

  if (
    storeId &&
    (cleanupResult?.deletedStoreCount !== 1 ||
      cleanupResult?.deletedFranchiseeCount !== 1)
  ) {
    throw new Error(
      `ADMIN_STORE_WORKFLOW_CLEANUP_FAILED: ${JSON.stringify(cleanupResult)}`,
    );
  }

  return {
    ...result,
    cleaned: true,
  };
}

async function checkAdminPackageTemplateWorkflow(baseUrl, cookie, { runId, storeId }) {
  let templateId = null;
  let result = null;
  let cleanupResult = null;

  try {
    const createPayload = buildAdminPackageTemplatePayload({ runId, storeId });
    const createResponse = await requestJson(
      `${baseUrl}/api/admin/package-templates`,
      {
        body: JSON.stringify(createPayload),
        headers: {
          cookie,
          "content-type": "application/json",
        },
        method: "POST",
      },
    );
    const created = assertApiSuccess(
      createResponse.payload,
      "admin package template create",
    ).template;
    templateId = created.id;
    if (
      !templateId ||
      created.name !== createPayload.name ||
      created.status !== "ACTIVE" ||
      created.totalTimes !== createPayload.totalTimes ||
      created.weightLimitJin !== createPayload.weightLimitJin
    ) {
      throw new Error(
        `ADMIN_PACKAGE_TEMPLATE_CREATE_MISMATCH: ${JSON.stringify(created)}`,
      );
    }

    const detailResponse = await requestJson(
      buildAdminStoreQueryUrl(
        `${baseUrl}/api/admin/package-templates/${encodeURIComponent(templateId)}`,
        { storeId },
      ),
      { headers: { cookie } },
    );
    const detail = assertApiSuccess(
      detailResponse.payload,
      "admin package template detail",
    ).template;
    if (
      detail.id !== templateId ||
      detail.name !== createPayload.name ||
      detail.userPackageCount !== 0
    ) {
      throw new Error(
        `ADMIN_PACKAGE_TEMPLATE_DETAIL_MISMATCH: ${JSON.stringify(detail)}`,
      );
    }

    const updatePayload = buildAdminPackageTemplateUpdatePayload({ runId, storeId });
    const updateResponse = await requestJson(
      `${baseUrl}/api/admin/package-templates/${encodeURIComponent(templateId)}`,
      {
        body: JSON.stringify(updatePayload),
        headers: {
          cookie,
          "content-type": "application/json",
        },
        method: "PUT",
      },
    );
    const updated = assertApiSuccess(
      updateResponse.payload,
      "admin package template update",
    ).template;
    if (
      updated.id !== templateId ||
      updated.name !== updatePayload.name ||
      updated.status !== "DISABLED" ||
      updated.totalTimes !== updatePayload.totalTimes ||
      updated.validDays !== updatePayload.validDays ||
      updated.weightLimitJin !== updatePayload.weightLimitJin
    ) {
      throw new Error(
        `ADMIN_PACKAGE_TEMPLATE_UPDATE_MISMATCH: ${JSON.stringify(updated)}`,
      );
    }

    const listResponse = await requestJson(
      buildAdminStoreQueryUrl(`${baseUrl}/api/admin/package-templates`, {
        query: updatePayload.name,
        storeId,
      }),
      { headers: { cookie } },
    );
    const list = assertListPayload(
      assertApiSuccess(
        listResponse.payload,
        "admin package templates after workflow",
      ),
      "admin package templates",
    );
    if (
      !list.items.some(
        (item) =>
          item.id === templateId &&
          item.name === updatePayload.name &&
          item.status === "DISABLED",
      )
    ) {
      throw new Error(
        "ADMIN_PACKAGE_TEMPLATE_LIST_MISSING: edited package template missing",
      );
    }

    result = {
      templateId,
      templateStatus: updated.status,
      totalTimes: updated.totalTimes,
      weightLimitJin: updated.weightLimitJin,
    };
  } finally {
    cleanupResult = await cleanupAdminPackageTemplate(templateId);
  }

  if (templateId && cleanupResult?.deletedTemplateCount !== 1) {
    throw new Error(
      `ADMIN_PACKAGE_TEMPLATE_CLEANUP_FAILED: ${JSON.stringify(cleanupResult)}`,
    );
  }

  return {
    ...result,
    cleaned: true,
  };
}

async function checkAdminBoundPackageTemplateCoreGuard(baseUrl, cookie, storeId) {
  const listResponse = await requestJson(
    buildAdminStoreQueryUrl(`${baseUrl}/api/admin/package-templates`, {
      storeId,
    }),
    { headers: { cookie } },
  );
  const list = assertListPayload(
    assertApiSuccess(listResponse.payload, "admin bound package templates"),
    "admin package templates",
  );
  const template = list.items.find((item) => item.userPackageCount > 0);
  if (!template) {
    throw new Error("ADMIN_BOUND_PACKAGE_TEMPLATE_MISSING: seeded store has no bound template");
  }

  const payload = buildAdminBoundPackageTemplateCoreUpdatePayload({
    storeId,
    template,
  });
  const response = await fetch(
    `${baseUrl}/api/admin/package-templates/${encodeURIComponent(template.id)}`,
    {
      body: JSON.stringify(payload),
      headers: {
        cookie,
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );
  const failed = await response.json();
  if (
    response.status !== 400 ||
    failed?.success !== false ||
    failed?.error?.code !== "PACKAGE_TEMPLATE_IN_USE"
  ) {
    throw new Error(
      `ADMIN_BOUND_TEMPLATE_CORE_GUARD_MISMATCH: ${JSON.stringify(failed)}`,
    );
  }

  const detailResponse = await requestJson(
    buildAdminStoreQueryUrl(
      `${baseUrl}/api/admin/package-templates/${encodeURIComponent(template.id)}`,
      { storeId },
    ),
    { headers: { cookie } },
  );
  const detail = assertApiSuccess(
    detailResponse.payload,
    "admin bound package template detail",
  ).template;
  if (
    detail.totalTimes !== template.totalTimes ||
    detail.weightLimitJin !== template.weightLimitJin ||
    detail.validDays !== template.validDays
  ) {
    throw new Error(`ADMIN_BOUND_TEMPLATE_MUTATED: ${JSON.stringify(detail)}`);
  }

  return {
    protected: true,
    rejectedCode: failed.error.code,
    templateId: template.id,
    userPackageCount: template.userPackageCount,
  };
}

async function checkAdminTaskWorkflow(baseUrl, cookie, { dishId, runId, storeId }) {
  const taskIds = [];
  let result = null;
  let cleanupResult = null;

  try {
    const createPayload = buildAdminTaskPayload({ dishId, runId, storeId });
    const createResponse = await requestJson(`${baseUrl}/api/admin/tasks`, {
      body: JSON.stringify(createPayload),
      headers: {
        cookie,
        "content-type": "application/json",
      },
      method: "POST",
    });
    const created = assertApiSuccess(createResponse.payload, "admin task create").task;
    taskIds.push(created.id);
    if (
      !created.id ||
      created.name !== createPayload.name ||
      created.status !== "ACTIVE"
    ) {
      throw new Error(`ADMIN_TASK_CREATE_MISMATCH: ${JSON.stringify(created)}`);
    }

    const detailResponse = await requestJson(
      buildAdminStoreQueryUrl(
        `${baseUrl}/api/admin/tasks/${encodeURIComponent(created.id)}`,
        { storeId },
      ),
      { headers: { cookie } },
    );
    const detail = assertApiSuccess(detailResponse.payload, "admin task detail").task;
    if (
      detail.id !== created.id ||
      detail.dishCount !== 1 ||
      !detail.dishes?.some((dish) => dish.id === dishId)
    ) {
      throw new Error(`ADMIN_TASK_DETAIL_MISMATCH: ${JSON.stringify(detail)}`);
    }

    const updatePayload = buildAdminTaskUpdatePayload({ dishId, runId, storeId });
    const updateResponse = await requestJson(
      `${baseUrl}/api/admin/tasks/${encodeURIComponent(created.id)}`,
      {
        body: JSON.stringify(updatePayload),
        headers: {
          cookie,
          "content-type": "application/json",
        },
        method: "PUT",
      },
    );
    const updated = assertApiSuccess(updateResponse.payload, "admin task update").task;
    if (
      updated.id !== created.id ||
      updated.name !== updatePayload.name ||
      updated.status !== "DISABLED" ||
      updated.cutoffTime !== updatePayload.cutoffTime
    ) {
      throw new Error(`ADMIN_TASK_UPDATE_MISMATCH: ${JSON.stringify(updated)}`);
    }

    const copyPayload = buildAdminTaskCopyPayload({ runId, storeId });
    const copyResponse = await requestJson(
      `${baseUrl}/api/admin/tasks/${encodeURIComponent(created.id)}/copy`,
      {
        body: JSON.stringify(copyPayload),
        headers: {
          cookie,
          "content-type": "application/json",
        },
        method: "POST",
      },
    );
    const copied = assertApiSuccess(copyResponse.payload, "admin task copy").task;
    taskIds.push(copied.id);
    if (
      !copied.id ||
      copied.id === created.id ||
      copied.name !== copyPayload.name ||
      copied.status !== "DRAFT"
    ) {
      throw new Error(`ADMIN_TASK_COPY_MISMATCH: ${JSON.stringify(copied)}`);
    }

    const listResponse = await requestJson(
      buildAdminStoreQueryUrl(`${baseUrl}/api/admin/tasks`, {
        query: "Smoke 任务",
        storeId,
      }),
      { headers: { cookie } },
    );
    const list = assertListPayload(
      assertApiSuccess(listResponse.payload, "admin tasks after workflow"),
      "admin tasks",
    );
    if (
      !list.items.some((item) => item.id === created.id && item.status === "DISABLED") ||
      !list.items.some((item) => item.id === copied.id && item.status === "DRAFT")
    ) {
      throw new Error("ADMIN_TASK_LIST_MISSING: created or copied task missing");
    }

    result = {
      copiedTaskId: copied.id,
      copiedTaskStatus: copied.status,
      taskId: created.id,
      taskStatus: updated.status,
    };
  } finally {
    cleanupResult = await cleanupAdminSmokeTasks(taskIds);
  }

  if (taskIds.length > 0 && cleanupResult?.deletedTaskCount !== taskIds.length) {
    throw new Error(`ADMIN_TASK_CLEANUP_FAILED: ${JSON.stringify(cleanupResult)}`);
  }

  return {
    ...result,
    cleaned: true,
  };
}

function chooseAdminSmokeRole(roles) {
  const role =
    roles.find((item) => item?.id && item.code !== "super_admin") ??
    roles.find((item) => item?.id);
  if (!role) {
    throw new Error("ADMIN_ROLE_MISSING: admin roles list is empty");
  }

  return role;
}

async function checkAdminUserWorkflow(baseUrl, cookie, { roleId, runId, storeId }) {
  let adminUserId = null;
  let result = null;
  let cleanupResult = null;

  try {
    const createPayload = buildAdminUserPayload({ roleId, runId, storeId });
    const createResponse = await requestJson(`${baseUrl}/api/admin/admin-users`, {
      body: JSON.stringify(createPayload),
      headers: {
        cookie,
        "content-type": "application/json",
      },
      method: "POST",
    });
    const created = assertApiSuccess(
      createResponse.payload,
      "admin user create",
    ).adminUser;
    adminUserId = created.id;
    if (
      !adminUserId ||
      created.username !== createPayload.username ||
      created.status !== "ACTIVE"
    ) {
      throw new Error(`ADMIN_USER_CREATE_MISMATCH: ${JSON.stringify(created)}`);
    }

    const detailResponse = await requestJson(
      `${baseUrl}/api/admin/admin-users/${encodeURIComponent(adminUserId)}`,
      { headers: { cookie } },
    );
    const detail = assertApiSuccess(
      detailResponse.payload,
      "admin user detail",
    ).adminUser;
    if (
      detail.id !== adminUserId ||
      detail.username !== createPayload.username ||
      !detail.roleIds?.includes(roleId) ||
      !detail.storeIds?.includes(storeId)
    ) {
      throw new Error(`ADMIN_USER_DETAIL_MISMATCH: ${JSON.stringify(detail)}`);
    }

    const passwordPayload = buildAdminUserPasswordPayload();
    const passwordResponse = await requestJson(
      `${baseUrl}/api/admin/admin-users/${encodeURIComponent(adminUserId)}/password`,
      {
        body: JSON.stringify(passwordPayload),
        headers: {
          cookie,
          "content-type": "application/json",
        },
        method: "POST",
      },
    );
    const passwordReset = assertApiSuccess(
      passwordResponse.payload,
      "admin user password reset",
    ).adminUser;
    if (passwordReset.id !== adminUserId) {
      throw new Error(
        `ADMIN_USER_PASSWORD_RESET_MISMATCH: ${JSON.stringify(passwordReset)}`,
      );
    }

    const smokeLogin = await requestJson(`${baseUrl}/api/admin/auth/login`, {
      body: JSON.stringify({
        password: passwordPayload.newPassword,
        username: createPayload.username,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const smokeAdmin = assertApiSuccess(smokeLogin.payload, "smoke admin login");
    if (
      smokeAdmin.id !== adminUserId ||
      !smokeAdmin.stores?.some((store) => store.id === storeId)
    ) {
      throw new Error(`ADMIN_USER_LOGIN_MISMATCH: ${JSON.stringify(smokeAdmin)}`);
    }

    const updatePayload = buildAdminUserUpdatePayload({ roleId, storeId });
    const updateResponse = await requestJson(
      `${baseUrl}/api/admin/admin-users/${encodeURIComponent(adminUserId)}`,
      {
        body: JSON.stringify(updatePayload),
        headers: {
          cookie,
          "content-type": "application/json",
        },
        method: "PUT",
      },
    );
    const updated = assertApiSuccess(
      updateResponse.payload,
      "admin user update",
    ).adminUser;
    if (
      updated.id !== adminUserId ||
      updated.name !== updatePayload.name ||
      updated.phone !== updatePayload.phone ||
      updated.status !== "DISABLED"
    ) {
      throw new Error(`ADMIN_USER_UPDATE_MISMATCH: ${JSON.stringify(updated)}`);
    }

    const listResponse = await requestJson(
      `${baseUrl}/api/admin/admin-users?query=${encodeURIComponent(
        createPayload.username,
      )}`,
      { headers: { cookie } },
    );
    const list = assertListPayload(
      assertApiSuccess(listResponse.payload, "admin users after update"),
      "admin users",
    );
    if (
      !list.items.some(
        (item) =>
          item.id === adminUserId &&
          item.name === updatePayload.name &&
          item.status === "DISABLED",
      )
    ) {
      throw new Error("ADMIN_USER_LIST_MISSING: edited admin user was not listed");
    }

    result = {
      adminUserId,
      loginVerified: true,
      passwordReset: true,
      status: updated.status,
      username: createPayload.username,
    };
  } finally {
    cleanupResult = await cleanupAdminSmokeUser(adminUserId);
  }

  if (adminUserId && cleanupResult?.deletedUserCount !== 1) {
    throw new Error(
      `ADMIN_USER_CLEANUP_FAILED: ${JSON.stringify(cleanupResult)}`,
    );
  }

  return {
    ...result,
    cleaned: true,
  };
}

async function checkAdminBusinessPermissionGuard(baseUrl, { runId, storeId }) {
  let account = null;
  let result = null;
  let cleanupResult = null;

  try {
    account = await createAdminPermissionSmokeAccount({ runId, storeId });

    const login = await requestJson(`${baseUrl}/api/admin/auth/login`, {
      body: JSON.stringify({
        password: account.password,
        username: account.username,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const admin = assertApiSuccess(login.payload, "admin no permission login");
    const cookie = parseSetCookie(login.headers.get("set-cookie"));
    if (!cookie || admin.id !== account.adminUserId) {
      throw new Error(
        `ADMIN_PERMISSION_SMOKE_LOGIN_MISMATCH: ${JSON.stringify(admin)}`,
      );
    }

    async function expectPermissionDenied(path, label, options = {}) {
      const url = new URL(`${baseUrl}${path}`);
      if (options.storeScoped !== false) {
        url.searchParams.set("storeId", storeId);
      }
      const response = await requestJsonAllowError(
        url.toString(),
        {
          headers: { cookie },
          method: options.method ?? "GET",
        },
      );
      if (response.status !== 403) {
        throw new Error(
          `${labelCode(label, "STATUS_MISMATCH")}: got ${response.status}`,
        );
      }

      return assertApiErrorCode(
        response.payload,
        "PERMISSION_FORBIDDEN",
        label,
      );
    }

    const dishError = await expectPermissionDenied(
      "/api/admin/dishes",
      "admin permission dish read",
    );
    const dishImageUploadError = await expectPermissionDenied(
      "/api/admin/uploads/dish-images",
      "admin permission dish image upload",
      { method: "POST", storeScoped: false },
    );
    const memberError = await expectPermissionDenied(
      "/api/admin/members",
      "admin permission member read",
    );
    const orderError = await expectPermissionDenied(
      "/api/admin/orders",
      "admin permission order read",
    );
    const packageError = await expectPermissionDenied(
      "/api/admin/package-templates",
      "admin permission package read",
    );
    const taskError = await expectPermissionDenied(
      "/api/admin/tasks",
      "admin permission task read",
    );

    result = {
      dishImageUploadDenied: dishImageUploadError.code,
      dishesReadDenied: dishError.code,
      membersReadDenied: memberError.code,
      ordersReadDenied: orderError.code,
      packagesReadDenied: packageError.code,
      protected: true,
      tasksReadDenied: taskError.code,
      username: account.username,
    };
  } finally {
    cleanupResult = await cleanupAdminPermissionSmokeAccount(account);
  }

  if (
    account &&
    (cleanupResult?.deletedUserCount !== 1 || cleanupResult?.deletedRoleCount !== 1)
  ) {
    throw new Error(
      `ADMIN_PERMISSION_SMOKE_CLEANUP_FAILED: ${JSON.stringify(cleanupResult)}`,
    );
  }

  return {
    cleaned: true,
    ...result,
  };
}

async function createAdminOrder(baseUrl, cookie, fixture, suffix) {
  const orderResponse = await requestJson(`${baseUrl}/api/admin/orders`, {
    body: JSON.stringify(
      buildAdminOrderPayload({
        addressId: fixture.addressId,
        dishId: fixture.dishId,
        internalRemark: `后台 smoke ${suffix}`,
        storeId: fixture.storeId,
        userId: fixture.userId,
        userPackageId: fixture.userPackageId,
        userVisibleRemark: `后台 smoke 会员备注 ${suffix}`,
        weightJin: 1,
      }),
    ),
    headers: {
      cookie,
      "content-type": "application/json",
    },
    method: "POST",
  });
  return assertAdminOrderStatus(
    assertApiSuccess(orderResponse.payload, `admin create order ${suffix}`).order,
    "PENDING_SHIPMENT",
  );
}

async function checkAdminOrderWorkflow(baseUrl, cookie, fixture) {
  const orderIds = [];

  const voidOrderCandidate = await createAdminOrder(baseUrl, cookie, fixture, "void");
  orderIds.push(voidOrderCandidate.id);

  const detailResponse = await requestJson(
    buildAdminStoreQueryUrl(
      `${baseUrl}/api/admin/orders/${encodeURIComponent(voidOrderCandidate.id)}`,
      { storeId: fixture.storeId },
    ),
    { headers: { cookie } },
  );
  const detail = assertAdminOrderStatus(
    assertApiSuccess(detailResponse.payload, "admin order detail").order,
    "PENDING_SHIPMENT",
  );

  const remarkResponse = await requestJson(
    `${baseUrl}/api/admin/orders/${encodeURIComponent(voidOrderCandidate.id)}`,
    {
      body: JSON.stringify({
        internalRemark: "后台 smoke 已复核",
        storeId: fixture.storeId,
      }),
      headers: {
        cookie,
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );
  const remarked = assertApiSuccess(
    remarkResponse.payload,
    "admin order remark",
  ).order;
  if (remarked.internalRemark !== "后台 smoke 已复核") {
    throw new Error("ADMIN_ORDER_REMARK_MISMATCH: internal remark was not saved");
  }

  const exportResponse = await requestText(
    buildAdminStoreQueryUrl(`${baseUrl}/api/admin/orders/export`, {
      query: detail.orderNo,
      storeId: fixture.storeId,
    }),
    { headers: { cookie } },
  );
  assertTextIncludes(exportResponse.text, "订单号", "export");
  assertTextIncludes(exportResponse.text, detail.orderNo, "export");

  const labelResponse = await requestText(
    buildAdminStoreQueryUrl(`${baseUrl}/api/admin/orders/print-labels`, {
      orderIds: detail.id,
      storeId: fixture.storeId,
    }),
    { headers: { cookie } },
  );
  assertTextIncludes(labelResponse.text, detail.orderNo, "print label");

  const voidResponse = await requestJson(
    `${baseUrl}/api/admin/orders/${encodeURIComponent(detail.id)}/void`,
    {
      body: JSON.stringify({
        reason: "后台 smoke 作废",
        storeId: fixture.storeId,
      }),
      headers: {
        cookie,
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  assertAdminOrderStatus(
    assertApiSuccess(voidResponse.payload, "admin order void").order,
    "VOIDED",
  );

  const signedOrderCandidate = await createAdminOrder(baseUrl, cookie, fixture, "sign");
  orderIds.push(signedOrderCandidate.id);
  const shipResponse = await requestJson(
    `${baseUrl}/api/admin/orders/${encodeURIComponent(signedOrderCandidate.id)}/ship`,
    {
      body: JSON.stringify({
        logisticsNo: `SMOKE-SHIP-${fixture.runId}`,
        storeId: fixture.storeId,
      }),
      headers: {
        cookie,
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  assertAdminOrderStatus(
    assertApiSuccess(shipResponse.payload, "admin order ship").order,
    "SHIPPED",
  );

  const signResponse = await requestJson(
    `${baseUrl}/api/admin/orders/${encodeURIComponent(signedOrderCandidate.id)}/sign`,
    {
      body: JSON.stringify({ storeId: fixture.storeId }),
      headers: {
        cookie,
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  assertAdminOrderStatus(
    assertApiSuccess(signResponse.payload, "admin order sign").order,
    "SIGNED",
  );

  const batchOrderCandidate = await createAdminOrder(baseUrl, cookie, fixture, "batch");
  orderIds.push(batchOrderCandidate.id);
  const batchResponse = await requestJson(`${baseUrl}/api/admin/orders/batch-ship`, {
    body: JSON.stringify({
      shipments: [
        {
          logisticsNo: `SMOKE-BATCH-${fixture.runId}`,
          orderId: batchOrderCandidate.id,
        },
      ],
      storeId: fixture.storeId,
    }),
    headers: {
      cookie,
      "content-type": "application/json",
    },
    method: "POST",
  });
  const batchResult = assertApiSuccess(batchResponse.payload, "admin batch ship");
  if (batchResult.successCount !== 1 || batchResult.failureCount !== 0) {
    throw new Error(`ADMIN_BATCH_SHIP_MISMATCH: ${JSON.stringify(batchResult)}`);
  }

  const statsResponse = await requestJson(
    buildAdminStoreQueryUrl(`${baseUrl}/api/admin/stats/shipment`, {
      status: "SHIPPED",
      storeId: fixture.storeId,
    }),
    { headers: { cookie } },
  );
  const stats = assertApiSuccess(statsResponse.payload, "admin shipment stats");
  if (!stats.summary || typeof stats.summary.orderCount !== "number") {
    throw new Error("ADMIN_SHIPMENT_STATS_MISSING: summary missing");
  }

  return {
    batchOrderId: batchOrderCandidate.id,
    orderIds,
    signedOrderId: signedOrderCandidate.id,
    voidedOrderId: detail.id,
  };
}

async function checkAdminMemberWorkflow(baseUrl, cookie, fixture) {
  const detailResponse = await requestJson(
    buildAdminStoreQueryUrl(
      `${baseUrl}/api/admin/members/${encodeURIComponent(fixture.userId)}`,
      { storeId: fixture.storeId },
    ),
    { headers: { cookie } },
  );
  const detail = assertApiSuccess(detailResponse.payload, "admin member detail").member;
  if (detail.id !== fixture.userId || detail.bindingStatus !== "ACTIVE") {
    throw new Error(`ADMIN_MEMBER_DETAIL_MISMATCH: ${JSON.stringify(detail)}`);
  }

  const disablePayload = buildAdminMemberDisablePayload({
    storeId: fixture.storeId,
  });
  const disableResponse = await requestJson(
    `${baseUrl}/api/admin/members/${encodeURIComponent(fixture.userId)}`,
    {
      body: JSON.stringify(disablePayload),
      headers: {
        cookie,
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );
  const disabled = assertApiSuccess(
    disableResponse.payload,
    "admin member disable",
  ).member;
  if (
    disabled.id !== fixture.userId ||
    disabled.bindingStatus !== "DISABLED" ||
    disabled.disabledReason !== disablePayload.disabledReason ||
    disabled.remark !== disablePayload.remark
  ) {
    throw new Error(`ADMIN_MEMBER_DISABLE_MISMATCH: ${JSON.stringify(disabled)}`);
  }

  const disabledListResponse = await requestJson(
    buildAdminStoreQueryUrl(`${baseUrl}/api/admin/members`, {
      query: "13900007521",
      status: "DISABLED",
      storeId: fixture.storeId,
    }),
    { headers: { cookie } },
  );
  const disabledList = assertListPayload(
    assertApiSuccess(disabledListResponse.payload, "admin disabled members"),
    "admin disabled members",
  );
  if (
    !disabledList.items.some(
      (item) =>
        item.id === fixture.userId &&
        item.bindingStatus === "DISABLED" &&
        item.remark === disablePayload.remark,
    )
  ) {
    throw new Error("ADMIN_MEMBER_DISABLED_LIST_MISSING: disabled member missing");
  }

  const enablePayload = buildAdminMemberEnablePayload({
    storeId: fixture.storeId,
  });
  const enableResponse = await requestJson(
    `${baseUrl}/api/admin/members/${encodeURIComponent(fixture.userId)}`,
    {
      body: JSON.stringify(enablePayload),
      headers: {
        cookie,
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );
  const enabled = assertApiSuccess(
    enableResponse.payload,
    "admin member enable",
  ).member;
  if (
    enabled.id !== fixture.userId ||
    enabled.bindingStatus !== "ACTIVE" ||
    enabled.disabledReason !== null ||
    enabled.remark !== enablePayload.remark
  ) {
    throw new Error(`ADMIN_MEMBER_ENABLE_MISMATCH: ${JSON.stringify(enabled)}`);
  }

  const enabledDetailResponse = await requestJson(
    buildAdminStoreQueryUrl(
      `${baseUrl}/api/admin/members/${encodeURIComponent(fixture.userId)}`,
      { storeId: fixture.storeId },
    ),
    { headers: { cookie } },
  );
  const enabledDetail = assertApiSuccess(
    enabledDetailResponse.payload,
    "admin member detail after enable",
  ).member;
  if (
    enabledDetail.id !== fixture.userId ||
    enabledDetail.bindingStatus !== "ACTIVE" ||
    enabledDetail.disabledReason !== null ||
    enabledDetail.remark !== enablePayload.remark
  ) {
    throw new Error(
      `ADMIN_MEMBER_ENABLE_DETAIL_MISMATCH: ${JSON.stringify(enabledDetail)}`,
    );
  }

  return {
    bindingStatus: enabled.bindingStatus,
    disabledReasonCleared: enabled.disabledReason === null,
    memberId: fixture.userId,
    remark: enabled.remark,
  };
}

async function checkAdminUserPackageAdjustWorkflow(baseUrl, cookie, fixture) {
  const payload = buildAdminUserPackageAdjustPayload({
    storeId: fixture.storeId,
  });
  const adjustResponse = await requestJson(
    `${baseUrl}/api/admin/user-packages/${encodeURIComponent(fixture.userPackageId)}`,
    {
      body: JSON.stringify(payload),
      headers: {
        cookie,
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );
  const adjusted = assertApiSuccess(
    adjustResponse.payload,
    "admin user package adjust",
  ).userPackage;
  if (
    adjusted.id !== fixture.userPackageId ||
    adjusted.totalTimes !== payload.totalTimes ||
    adjusted.usedTimes !== payload.usedTimes ||
    adjusted.remainingTimes !== payload.totalTimes - payload.usedTimes ||
    Number(adjusted.weightLimitJin) !== payload.weightLimitJin ||
    new Date(adjusted.expiresAt).toISOString() !== payload.expiresAt ||
    new Date(adjusted.nextOrderDate).toISOString() !== payload.nextOrderDate
  ) {
    throw new Error(`ADMIN_USER_PACKAGE_ADJUST_MISMATCH: ${JSON.stringify(adjusted)}`);
  }

  const detailResponse = await requestJson(
    buildAdminStoreQueryUrl(
      `${baseUrl}/api/admin/user-packages/${encodeURIComponent(fixture.userPackageId)}`,
      { storeId: fixture.storeId },
    ),
    { headers: { cookie } },
  );
  const detail = assertApiSuccess(
    detailResponse.payload,
    "admin user package detail after adjust",
  ).userPackage;
  const operationLog = detail.operationLogs?.find(
    (item) => item.reason === payload.reason,
  );
  if (
    detail.id !== fixture.userPackageId ||
    detail.totalTimes !== payload.totalTimes ||
    detail.usedTimes !== payload.usedTimes ||
    detail.remainingTimes !== payload.totalTimes - payload.usedTimes ||
    Number(detail.weightLimitJin) !== payload.weightLimitJin ||
    !operationLog
  ) {
    throw new Error(
      `ADMIN_USER_PACKAGE_DETAIL_MISMATCH: ${JSON.stringify({
        detail,
        operationLogFound: Boolean(operationLog),
      })}`,
    );
  }

  const listResponse = await requestJson(
    buildAdminStoreQueryUrl(`${baseUrl}/api/admin/user-packages`, {
      query: "13900007521",
      storeId: fixture.storeId,
    }),
    { headers: { cookie } },
  );
  const list = assertListPayload(
    assertApiSuccess(listResponse.payload, "admin user packages after adjust"),
    "admin user packages",
  );
  if (
    !list.items.some(
      (item) =>
        item.id === fixture.userPackageId &&
        item.totalTimes === payload.totalTimes &&
        item.usedTimes === payload.usedTimes &&
        Number(item.weightLimitJin) === payload.weightLimitJin,
    )
  ) {
    throw new Error("ADMIN_USER_PACKAGE_LIST_MISSING: adjusted package missing");
  }

  return {
    operationLogged: true,
    remainingTimes: adjusted.remainingTimes,
    totalTimes: adjusted.totalTimes,
    usedTimes: adjusted.usedTimes,
    userPackageId: adjusted.id,
    weightLimitJin: Number(adjusted.weightLimitJin),
  };
}

async function patchAdminSystemSettings(baseUrl, cookie, payload, label) {
  const response = await requestJson(`${baseUrl}/api/admin/system-settings`, {
    body: JSON.stringify(payload),
    headers: {
      cookie,
      "content-type": "application/json",
    },
    method: "PUT",
  });

  return assertApiSuccess(response.payload, label).settings;
}

function assertSystemSettingsMatch(settings, payload, label) {
  const fields = [
    "aboutText",
    "cutoffTime",
    "customerServiceTel",
    "privacyPolicyUrl",
    "userAgreementUrl",
  ];
  const mismatch = fields.find((field) => settings?.[field] !== payload[field]);
  if (mismatch) {
    throw new Error(
      `ADMIN_SYSTEM_SETTINGS_${label}_MISMATCH: ${mismatch} expected ${payload[mismatch]}, got ${settings?.[mismatch]}`,
    );
  }
}

async function checkAdminSystemSettingsWorkflow(baseUrl, cookie, storeId) {
  const detailUrl = buildAdminStoreQueryUrl(`${baseUrl}/api/admin/system-settings`, {
    storeId,
  });
  const beforeResponse = await requestJson(detailUrl, { headers: { cookie } });
  const before = assertApiSuccess(
    beforeResponse.payload,
    "admin system settings before update",
  ).settings;
  if (!before.store?.id || !before.cutoffTime) {
    throw new Error("ADMIN_SETTINGS_MISSING: system settings response incomplete");
  }

  const updatePayload = buildAdminSystemSettingsPayload({ storeId });
  const restorePayload = buildAdminSystemSettingsRestorePayload({
    settings: before,
    storeId,
  });
  let updateApplied = false;
  let restored = false;

  try {
    const updated = await patchAdminSystemSettings(
      baseUrl,
      cookie,
      updatePayload,
      "admin system settings update",
    );
    updateApplied = true;
    assertSystemSettingsMatch(updated, updatePayload, "UPDATE");

    const afterResponse = await requestJson(detailUrl, { headers: { cookie } });
    const after = assertApiSuccess(
      afterResponse.payload,
      "admin system settings after update",
    ).settings;
    assertSystemSettingsMatch(after, updatePayload, "DETAIL");

    const logsResponse = await requestJson(
      buildAdminStoreQueryUrl(`${baseUrl}/api/admin/operation-logs`, {
        resource: "system_config",
        storeId,
        take: 20,
      }),
      { headers: { cookie } },
    );
    const logs = assertListPayload(
      assertApiSuccess(logsResponse.payload, "admin system settings logs"),
      "system settings logs",
    );
    const updateLog = logs.items.find(
      (item) =>
        item.action === "SYSTEM_SETTINGS_UPDATED" &&
        item.resourceId === storeId &&
        item.afterValue?.cutoffTime === updatePayload.cutoffTime,
    );
    if (!updateLog) {
      throw new Error("ADMIN_SYSTEM_SETTINGS_LOG_MISSING: update log missing");
    }

    const restoredSettings = await patchAdminSystemSettings(
      baseUrl,
      cookie,
      restorePayload,
      "admin system settings restore",
    );
    restored = true;
    assertSystemSettingsMatch(restoredSettings, restorePayload, "RESTORE");

    return {
      logVerified: true,
      restored,
      storeId,
      updatedCutoffTime: updated.cutoffTime,
    };
  } finally {
    if (updateApplied && !restored) {
      await patchAdminSystemSettings(
        baseUrl,
        cookie,
        restorePayload,
        "admin system settings emergency restore",
      );
    }
  }
}

async function checkAdminLogoutWorkflow(baseUrl) {
  const login = await requestJson(`${baseUrl}/api/admin/auth/login`, {
    body: JSON.stringify(
      buildAdminLoginPayload({
        password: process.env.SMOKE_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD,
        username: process.env.SMOKE_ADMIN_USERNAME ?? DEFAULT_ADMIN_USERNAME,
      }),
    ),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const admin = assertApiSuccess(login.payload, "admin logout login");
  const cookie = parseSetCookie(login.headers.get("set-cookie"));
  if (!cookie) {
    throw new Error("ADMIN_LOGOUT_COOKIE_MISSING: login did not set a session cookie");
  }

  const beforeSessionResponse = await requestJson(`${baseUrl}/api/admin/session`, {
    headers: { cookie },
  });
  const beforeSession = assertApiSuccess(
    beforeSessionResponse.payload,
    "admin logout session before",
  );
  if (beforeSession.username !== admin.username) {
    throw new Error(
      `ADMIN_LOGOUT_SESSION_BEFORE_MISMATCH: ${JSON.stringify(beforeSession)}`,
    );
  }

  const logout = await requestJson(`${baseUrl}/api/admin/auth/logout`, {
    headers: { cookie },
    method: "POST",
  });
  const logoutPayload = assertApiSuccess(logout.payload, "admin logout");
  if (logoutPayload.loggedOut !== true) {
    throw new Error(`ADMIN_LOGOUT_MISMATCH: ${JSON.stringify(logoutPayload)}`);
  }

  const clearedCookie = parseSetCookie(logout.headers.get("set-cookie"));
  if (!clearedCookie || !clearedCookie.endsWith("=")) {
    throw new Error(
      `ADMIN_LOGOUT_CLEAR_COOKIE_MISSING: ${logout.headers.get("set-cookie")}`,
    );
  }

  const afterSession = await fetch(`${baseUrl}/api/admin/session`, {
    headers: { cookie: clearedCookie },
  });
  const afterPayload = await afterSession.json();
  if (
    afterSession.status !== 401 ||
    afterPayload?.success !== false ||
    afterPayload?.error?.code !== "UNAUTHORIZED"
  ) {
    throw new Error(
      `ADMIN_LOGOUT_SESSION_AFTER_MISMATCH: ${JSON.stringify(afterPayload)}`,
    );
  }

  return {
    clearedCookie: true,
    sessionRejected: true,
    username: admin.username,
  };
}

async function checkAdmin(baseUrl, storeCode) {
  const login = await requestJson(`${baseUrl}/api/admin/auth/login`, {
    body: JSON.stringify(
      buildAdminLoginPayload({
        password: process.env.SMOKE_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD,
        username: process.env.SMOKE_ADMIN_USERNAME ?? DEFAULT_ADMIN_USERNAME,
      }),
    ),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const admin = assertApiSuccess(login.payload, "admin login");
  const cookie = parseSetCookie(login.headers.get("set-cookie"));
  if (!cookie) {
    throw new Error("ADMIN_COOKIE_MISSING: login did not set a session cookie");
  }

  const sessionResponse = await requestJson(`${baseUrl}/api/admin/session`, {
    headers: { cookie },
  });
  const session = assertApiSuccess(sessionResponse.payload, "admin session");
  if (session.username !== admin.username) {
    throw new Error("ADMIN_SESSION_MISMATCH: session username changed");
  }

  const logoutWorkflow = await checkAdminLogoutWorkflow(baseUrl);

  const store = admin.stores.find((item) => item.code === storeCode) ?? admin.stores[0];
  if (!store?.id) {
    throw new Error("ADMIN_STORE_MISSING: admin login returned no accessible store");
  }

  const ordersResponse = await requestJson(
    `${baseUrl}/api/admin/orders?storeId=${encodeURIComponent(
      store.id,
    )}`,
    { headers: { cookie } },
  );
  const orders = assertApiSuccess(ordersResponse.payload, "admin orders");

  const collections = {
    dishes: await checkAdminCollection(baseUrl, cookie, "/api/admin/dishes", "admin dishes", {
      storeId: store.id,
    }),
    franchisees: await checkAdminCollection(
      baseUrl,
      cookie,
      "/api/admin/franchisees",
      "admin franchisees",
    ),
    members: await checkAdminCollection(baseUrl, cookie, "/api/admin/members", "admin members", {
      storeId: store.id,
    }),
    operationLogs: await checkAdminCollection(
      baseUrl,
      cookie,
      "/api/admin/operation-logs",
      "admin operation logs",
      { params: { take: 5 }, storeId: store.id },
    ),
    packageTemplates: await checkAdminCollection(
      baseUrl,
      cookie,
      "/api/admin/package-templates",
      "admin package templates",
      { storeId: store.id },
    ),
    roles: await checkAdminCollection(baseUrl, cookie, "/api/admin/roles", "admin roles"),
    stores: await checkAdminCollection(baseUrl, cookie, "/api/admin/stores", "admin stores", {
      arrayField: "stores",
    }),
    tasks: await checkAdminCollection(baseUrl, cookie, "/api/admin/tasks", "admin tasks", {
      storeId: store.id,
    }),
    userPackages: await checkAdminCollection(
      baseUrl,
      cookie,
      "/api/admin/user-packages",
      "admin user packages",
      { storeId: store.id },
    ),
  };
  const role = chooseAdminSmokeRole(collections.roles.data.items);
  const packageTemplateWorkflow = await checkAdminPackageTemplateWorkflow(
    baseUrl,
    cookie,
    {
      runId: randomUUID().replaceAll("-", "").slice(0, 8),
      storeId: store.id,
    },
  );
  const boundPackageTemplateCoreGuard =
    await checkAdminBoundPackageTemplateCoreGuard(baseUrl, cookie, store.id);
  const taskDish = chooseReservableDish(collections.dishes.data.items);
  const taskWorkflow = await checkAdminTaskWorkflow(baseUrl, cookie, {
    dishId: taskDish.id,
    runId: randomUUID().replaceAll("-", "").slice(0, 8),
    storeId: store.id,
  });
  const storeWorkflow = await checkAdminStoreWorkflow(baseUrl, cookie, {
    runId: randomUUID().replaceAll("-", "").slice(0, 8),
  });
  const adminUserWorkflow = await checkAdminUserWorkflow(baseUrl, cookie, {
    roleId: role.id,
    runId: randomUUID().replaceAll("-", "").slice(0, 8),
    storeId: store.id,
  });
  const businessPermissionGuard = await checkAdminBusinessPermissionGuard(
    baseUrl,
    {
      runId: randomUUID().replaceAll("-", "").slice(0, 8),
      storeId: store.id,
    },
  );
  const imageUpload = await checkAdminDishImageUpload(baseUrl, cookie);
  const dishWorkflow = await checkAdminDishWorkflow(baseUrl, cookie, {
    image: imageUpload,
    runId: randomUUID().replaceAll("-", "").slice(0, 8),
    storeId: store.id,
  });

  const systemSettingsWorkflow = await checkAdminSystemSettingsWorkflow(
    baseUrl,
    cookie,
    store.id,
  );

  const fixture = await createAdminSmokeFixture({ storeId: store.id });
  let workflow = null;
  let frozenPackageMiniappGate = null;
  let memberWorkflow = null;
  let userPackageAdjustWorkflow = null;
  try {
    memberWorkflow = await checkAdminMemberWorkflow(baseUrl, cookie, fixture);
    userPackageAdjustWorkflow = await checkAdminUserPackageAdjustWorkflow(
      baseUrl,
      cookie,
      fixture,
    );

    const packageFreezeResponse = await requestJson(
      `${baseUrl}/api/admin/user-packages/${encodeURIComponent(fixture.userPackageId)}/freeze`,
      {
        body: JSON.stringify({
          reason: "后台 smoke 冻结",
          storeId: store.id,
        }),
        headers: {
          cookie,
          "content-type": "application/json",
        },
        method: "POST",
      },
    );
    const frozen = assertApiSuccess(
      packageFreezeResponse.payload,
      "admin package freeze",
    ).userPackage;
    if (frozen.status !== "FROZEN") {
      throw new Error(`ADMIN_PACKAGE_FREEZE_MISMATCH: got ${frozen.status}`);
    }
    frozenPackageMiniappGate = await checkMiniappFrozenPackageGate(
      baseUrl,
      storeCode,
      fixture,
    );

    const packageUnfreezeResponse = await requestJson(
      `${baseUrl}/api/admin/user-packages/${encodeURIComponent(fixture.userPackageId)}/unfreeze`,
      {
        body: JSON.stringify({
          reason: "后台 smoke 解冻",
          storeId: store.id,
        }),
        headers: {
          cookie,
          "content-type": "application/json",
        },
        method: "POST",
      },
    );
    const unfrozen = assertApiSuccess(
      packageUnfreezeResponse.payload,
      "admin package unfreeze",
    ).userPackage;
    if (unfrozen.status !== "ACTIVE") {
      throw new Error(`ADMIN_PACKAGE_UNFREEZE_MISMATCH: got ${unfrozen.status}`);
    }

    const inventoryResponse = await requestJson(
      `${baseUrl}/api/admin/dishes/${encodeURIComponent(fixture.dishId)}/inventory`,
      {
        body: JSON.stringify({
          changeJin: 2,
          reason: "后台 smoke 补货",
          storeId: store.id,
        }),
        headers: {
          cookie,
          "content-type": "application/json",
        },
        method: "POST",
      },
    );
    const inventoryDish = assertApiSuccess(
      inventoryResponse.payload,
      "admin dish inventory",
    ).dish;
    if (Number(inventoryDish.stockJin) <= 50) {
      throw new Error(`ADMIN_DISH_INVENTORY_MISMATCH: ${inventoryDish.stockJin}`);
    }

    workflow = await checkAdminOrderWorkflow(baseUrl, cookie, fixture);

    const logsResponse = await requestJson(
      buildAdminStoreQueryUrl(`${baseUrl}/api/admin/operation-logs`, {
        resource: "order",
        storeId: store.id,
        take: 20,
      }),
      { headers: { cookie } },
    );
    const logs = assertListPayload(
      assertApiSuccess(logsResponse.payload, "admin operation logs after workflow"),
      "operation logs",
    );
    if (!logs.items.some((item) => item.resourceId === workflow.voidedOrderId)) {
      throw new Error("ADMIN_OPERATION_LOG_MISSING: order workflow was not logged");
    }
  } finally {
    await cleanupAdminSmokeFixture(fixture, workflow?.orderIds ?? []);
  }

  return {
    adminUserWorkflow,
    boundPackageTemplateCoreGuard,
    businessPermissionGuard,
    collectionCounts: Object.fromEntries(
      Object.entries(collections).map(([key, value]) => [key, value.itemCount]),
    ),
    dishWorkflow,
    frozenPackageMiniappGate,
    imageUpload,
    lifecycleOrderCount: workflow?.orderIds.length ?? 0,
    logoutWorkflow,
    memberWorkflow,
    orderCount: orders.items.length,
    packageTemplateWorkflow,
    storeCount: admin.stores.length,
    storeWorkflow,
    storeId: store.id,
    systemSettingsWorkflow,
    taskWorkflow,
    userPackageAdjustWorkflow,
    username: admin.username,
  };
}

async function checkMiniappStore(baseUrl, authHeader, storeCode) {
  const settingsResponse = await requestJson(
    `${baseUrl}/api/v1/stores/settings?storeCode=${encodeURIComponent(storeCode)}`,
  );
  const settings = assertApiSuccess(settingsResponse.payload, "miniapp store settings");
  if (settings.store?.code !== storeCode) {
    throw new Error(`MINIAPP_STORE_SETTINGS_MISMATCH: got ${settings.store?.code}`);
  }

  const storesResponse = await requestJson(`${baseUrl}/api/v1/stores/current`, {
    headers: authHeader,
  });
  const stores = assertApiSuccess(storesResponse.payload, "miniapp stores");
  if (!stores.currentStore?.id) {
    throw new Error("MINIAPP_CURRENT_STORE_MISSING: no current store");
  }

  const switchResponse = await requestJson(`${baseUrl}/api/v1/stores/switch`, {
    body: JSON.stringify({ storeId: stores.currentStore.id }),
    headers: {
      ...authHeader,
      "content-type": "application/json",
    },
    method: "POST",
  });
  const switched = assertApiSuccess(switchResponse.payload, "miniapp store switch");
  if (switched.store?.id !== stores.currentStore.id || !switched.token) {
    throw new Error("MINIAPP_STORE_SWITCH_MISMATCH: switch response is incomplete");
  }

  return {
    currentStoreId: stores.currentStore.id,
    storeCount: stores.stores.length,
  };
}

async function checkMiniappAddresses(
  baseUrl,
  authHeader,
  storeCode,
  fallbackDefaultAddressId,
) {
  const storeQuery = `storeCode=${encodeURIComponent(storeCode)}`;
  const beforeResponse = await requestJson(`${baseUrl}/api/v1/addresses?${storeQuery}`, {
    headers: authHeader,
  });
  const before = assertListPayload(
    assertApiSuccess(beforeResponse.payload, "miniapp addresses"),
    "addresses",
  );
  const originalDefaultAddressId = before.defaultAddress?.id ?? fallbackDefaultAddressId;
  let createdAddressId = null;
  let updatedAddress = false;

  try {
    const createResponse = await requestJson(`${baseUrl}/api/v1/addresses`, {
      body: JSON.stringify(buildSmokeAddressPayload({ storeCode })),
      headers: {
        ...authHeader,
        "content-type": "application/json",
      },
      method: "POST",
    });
    const createdAddress = assertApiSuccess(
      createResponse.payload,
      "miniapp address create",
    ).address;
    createdAddressId = createdAddress.id;

    const defaultResponse = await requestJson(
      `${baseUrl}/api/v1/addresses/${encodeURIComponent(createdAddressId)}/default?${storeQuery}`,
      {
        headers: authHeader,
        method: "POST",
      },
    );
    const defaultedAddress = assertApiSuccess(
      defaultResponse.payload,
      "miniapp address default",
    ).address;
    if (defaultedAddress.id !== createdAddressId || defaultedAddress.isDefault !== true) {
      throw new Error("MINIAPP_ADDRESS_DEFAULT_MISMATCH: created address was not defaulted");
    }

    const updatePayload = buildSmokeAddressUpdatePayload({ storeCode });
    const updateResponse = await requestJson(
      `${baseUrl}/api/v1/addresses/${encodeURIComponent(createdAddressId)}`,
      {
        body: JSON.stringify(updatePayload),
        headers: {
          ...authHeader,
          "content-type": "application/json",
        },
        method: "PUT",
      },
    );
    const updatedAddressResult = assertApiSuccess(
      updateResponse.payload,
      "miniapp address update",
    ).address;
    if (
      updatedAddressResult.id !== createdAddressId ||
      updatedAddressResult.detail !== updatePayload.detail ||
      updatedAddressResult.receiverName !== updatePayload.receiverName ||
      updatedAddressResult.isDefault !== true
    ) {
      throw new Error(
        `MINIAPP_ADDRESS_UPDATE_MISMATCH: ${JSON.stringify(updatedAddressResult)}`,
      );
    }

    const updatedListResponse = await requestJson(
      `${baseUrl}/api/v1/addresses?${storeQuery}`,
      {
        headers: authHeader,
      },
    );
    const updatedList = assertListPayload(
      assertApiSuccess(updatedListResponse.payload, "miniapp addresses after update"),
      "addresses",
    );
    if (
      !updatedList.items.some(
        (item) =>
          item.id === createdAddressId &&
          item.detail === updatePayload.detail &&
          item.receiverName === updatePayload.receiverName,
      )
    ) {
      throw new Error("MINIAPP_ADDRESS_UPDATE_NOT_LISTED: edited address missing");
    }
    updatedAddress = true;
  } finally {
    if (originalDefaultAddressId && originalDefaultAddressId !== createdAddressId) {
      await requestJson(
        `${baseUrl}/api/v1/addresses/${encodeURIComponent(originalDefaultAddressId)}/default?${storeQuery}`,
        {
          headers: authHeader,
          method: "POST",
        },
      );
    }

    if (createdAddressId) {
      await requestJson(
        `${baseUrl}/api/v1/addresses/${encodeURIComponent(createdAddressId)}?${storeQuery}`,
        {
          headers: authHeader,
          method: "DELETE",
        },
      );
    }
  }

  const afterResponse = await requestJson(`${baseUrl}/api/v1/addresses?${storeQuery}`, {
    headers: authHeader,
  });
  const after = assertListPayload(
    assertApiSuccess(afterResponse.payload, "miniapp addresses after cleanup"),
    "addresses",
  );
  if (createdAddressId && after.items.some((item) => item.id === createdAddressId)) {
    throw new Error("MINIAPP_ADDRESS_CLEANUP_FAILED: smoke address still exists");
  }
  if (
    originalDefaultAddressId &&
    after.defaultAddress?.id &&
    after.defaultAddress.id !== originalDefaultAddressId
  ) {
    throw new Error("MINIAPP_ADDRESS_DEFAULT_NOT_RESTORED: default address changed");
  }

  return {
    addressCount: after.items.length,
    createdAddressId,
    defaultRestored: Boolean(originalDefaultAddressId),
    updatedAddress,
  };
}

async function checkMiniappPackagePurchase(baseUrl, authHeader, storeCode, packages) {
  if (
    packages.purchaseReserve?.enabled !== false ||
    packages.purchaseReserve.status !== "PAYMENT_NOT_ENABLED"
  ) {
    throw new Error(
      `PACKAGE_PURCHASE_RESERVE_CHANGED: ${JSON.stringify(packages.purchaseReserve)}`,
    );
  }

  const template = choosePurchaseTemplate(packages.purchaseReserve.templates ?? []);
  let purchaseOrder = null;

  try {
    const purchaseResponse = await requestJson(`${baseUrl}/api/v1/package-purchases`, {
      body: JSON.stringify(
        buildPackagePurchasePayload({
          storeCode,
          templateId: template.id,
        }),
      ),
      headers: {
        ...authHeader,
        "content-type": "application/json",
      },
      method: "POST",
    });
    purchaseOrder = assertApiSuccess(
      purchaseResponse.payload,
      "miniapp package purchase",
    ).purchaseOrder;

    if (
      purchaseOrder.status !== "PAYMENT_NOT_ENABLED" ||
      purchaseOrder.payChannel !== "WECHAT" ||
      purchaseOrder.templateId !== template.id
    ) {
      throw new Error(`PACKAGE_PURCHASE_MISMATCH: ${JSON.stringify(purchaseOrder)}`);
    }

    const prepayResponse = await requestJson(
      `${baseUrl}/api/v1/package-purchases/${encodeURIComponent(
        purchaseOrder.id,
      )}/wechat-prepay?storeCode=${encodeURIComponent(storeCode)}`,
      {
        headers: authHeader,
        method: "POST",
      },
    );
    const prepay = assertPaymentReserve(
      assertApiSuccess(prepayResponse.payload, "miniapp package prepay").prepay,
      purchaseOrder.id,
    );

    const dbPurchase = await inspectPackagePurchase(purchaseOrder.id);
    if (
      dbPurchase.status !== "PAYMENT_NOT_ENABLED" ||
      dbPurchase.payChannel !== "WECHAT"
    ) {
      throw new Error(`DB_PURCHASE_MISMATCH: ${JSON.stringify(dbPurchase)}`);
    }

    return buildPackagePurchaseSmokeSummary({
      dbPurchase,
      prepay,
      purchaseOrder,
      purchaseReserve: packages.purchaseReserve,
      template,
    });
  } finally {
    if (purchaseOrder?.id) {
      await cleanupPackagePurchase(purchaseOrder.id);
    }
  }
}

async function checkMiniappWxPhoneLoginWithStub(storeCode) {
  const runId = randomUUID().replaceAll("-", "").slice(0, 12);
  const openid = `smoke-wx-openid-${runId}`;
  const unionid = `smoke-wx-unionid-${runId}`;
  const phone = "13800007521";
  let stub = null;
  let server = null;

  try {
    stub = await startWechatStubServer({
      accessToken: `smoke-access-token-${runId}`,
      openid,
      phone,
      unionid,
    });
    server = await startManagedAdminServer({
      wechatApiBaseUrl: stub.baseUrl,
    });

    const loginResponse = await requestJson(`${server.baseUrl}/api/v1/auth/wx-phone`, {
      body: JSON.stringify(
        buildMiniappWxPhoneLoginPayload({
          loginCode: `smoke-login-code-${runId}`,
          phoneCode: `smoke-phone-code-${runId}`,
          storeCode,
        }),
      ),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
    const login = assertApiSuccess(
      loginResponse.payload,
      "miniapp wx phone login",
    );

    const profileResponse = await requestJson(
      `${server.baseUrl}/api/v1/me?storeCode=${encodeURIComponent(storeCode)}`,
      {
        headers: {
          authorization: `Bearer ${login.token}`,
        },
      },
    );
    const profile = assertApiSuccess(
      profileResponse.payload,
      "miniapp wx phone profile",
    );
    if (profile.member?.id !== login.user.id || profile.store?.code !== storeCode) {
      throw new Error(`WX_PHONE_LOGIN_PROFILE_MISMATCH: ${JSON.stringify(profile)}`);
    }

    const db = await inspectWxPhoneSmokeUser({ openid, storeCode });
    const result = assertWxPhoneLoginSmokeResult({
      db,
      expected: {
        openid,
        phone,
        storeCode,
      },
      login,
      stubRequests: stub.requests,
    });

    return {
      ...result,
      profileMemberId: profile.member.id,
      storeId: login.store.id,
    };
  } finally {
    try {
      const cleanupResult = await cleanupWxPhoneSmokeUser({ openid });
      if (
        cleanupResult.deletedUserCount > 1 ||
        cleanupResult.deletedBindingCount > 1
      ) {
        throw new Error(
          `WX_PHONE_LOGIN_CLEANUP_SCOPE_MISMATCH: ${JSON.stringify(
            cleanupResult,
          )}`,
        );
      }
    } finally {
      if (server) {
        await server.close();
      }
      if (stub) {
        await stub.close();
      }
    }
  }
}

async function checkMiniappAccountCancellation(baseUrl, storeCode, fixture) {
  const mini = await createMiniSession({
    storeCode,
    userId: fixture.userId,
  });
  const authHeader = { authorization: `Bearer ${mini.token}` };
  const cancelPayload = buildMiniappAccountCancelPayload({ storeCode });
  let cancelApplied = false;
  let restored = false;

  try {
    const cancelResponse = await requestJson(`${baseUrl}/api/v1/account`, {
      body: JSON.stringify(cancelPayload),
      headers: {
        ...authHeader,
        "content-type": "application/json",
      },
      method: "DELETE",
    });
    const account = assertApiSuccess(
      cancelResponse.payload,
      "miniapp account cancel",
    ).account;
    cancelApplied = true;

    if (
      account.userId !== fixture.userId ||
      account.storeId !== fixture.storeId ||
      account.status !== "DISABLED" ||
      account.bindingStatus !== "DISABLED" ||
      account.disabledReason !== cancelPayload.reason
    ) {
      throw new Error(`MINIAPP_ACCOUNT_CANCEL_MISMATCH: ${JSON.stringify(account)}`);
    }

    const dbAccount = await inspectMiniappAccountState({
      storeId: fixture.storeId,
      userId: fixture.userId,
    });
    if (
      dbAccount.status !== "DISABLED" ||
      dbAccount.bindingStatus !== "DISABLED" ||
      dbAccount.disabledReason !== cancelPayload.reason
    ) {
      throw new Error(`DB_ACCOUNT_CANCEL_MISMATCH: ${JSON.stringify(dbAccount)}`);
    }

    const blockedResponse = await fetch(`${baseUrl}/api/v1/package-purchases`, {
      body: JSON.stringify(
        buildPackagePurchasePayload({
          storeCode,
          templateId: fixture.templateId,
        }),
      ),
      headers: {
        ...authHeader,
        "content-type": "application/json",
      },
      method: "POST",
    });
    const blockedPayload = await blockedResponse.json();
    if (
      blockedResponse.ok ||
      blockedPayload?.success !== false ||
      blockedPayload?.error?.code !== "MEMBER_DISABLED"
    ) {
      throw new Error(
        `MINIAPP_ACCOUNT_CANCEL_LOCK_MISMATCH: ${JSON.stringify(blockedPayload)}`,
      );
    }

    const restoredAccount = await restoreMiniappAccountState({
      storeId: fixture.storeId,
      userId: fixture.userId,
    });
    restored = true;
    if (
      restoredAccount.status !== "ACTIVE" ||
      restoredAccount.bindingStatus !== "ACTIVE" ||
      restoredAccount.disabledReason !== null
    ) {
      throw new Error(
        `MINIAPP_ACCOUNT_RESTORE_MISMATCH: ${JSON.stringify(restoredAccount)}`,
      );
    }

    return {
      accountDisabled: true,
      businessLocked: true,
      restored,
      userId: fixture.userId,
    };
  } finally {
    if (cancelApplied && !restored) {
      await restoreMiniappAccountState({
        storeId: fixture.storeId,
        userId: fixture.userId,
      });
    }
  }
}

async function checkMiniappNoPackageGate(baseUrl, storeCode, fixture) {
  const expiredPackage = await expireMiniappUserPackage(fixture.userPackageId);
  if (expiredPackage.status !== "EXPIRED") {
    throw new Error(
      `MINIAPP_NO_PACKAGE_EXPIRE_MISMATCH: ${JSON.stringify(expiredPackage)}`,
    );
  }

  const mini = await createMiniSession({
    storeCode,
    userId: fixture.userId,
  });
  const authHeader = { authorization: `Bearer ${mini.token}` };

  const homeResponse = await requestJson(
    `${baseUrl}/api/v1/home?storeCode=${encodeURIComponent(storeCode)}`,
    { headers: authHeader },
  );
  const home = assertApiSuccess(homeResponse.payload, "miniapp no package home");
  if (home.package !== null) {
    throw new Error(`MINIAPP_NO_PACKAGE_HOME_MISMATCH: ${JSON.stringify(home.package)}`);
  }
  if (!Array.isArray(home.dishes) || home.dishes.length === 0) {
    throw new Error("MINIAPP_NO_PACKAGE_DISHES_MISSING: dishes should remain browsable");
  }

  const payload = buildMiniappNoPackageReservationPayload({
    addressId: fixture.addressId,
    dish: { id: fixture.dishId, stepJin: 0.5 },
    storeCode,
    userPackageId: fixture.userPackageId,
  });
  const response = await fetch(`${baseUrl}/api/v1/reservations`, {
    body: JSON.stringify(payload),
    headers: {
      ...authHeader,
      "content-type": "application/json",
    },
    method: "POST",
  });
  const failedReservation = await response.json();
  if (
    response.status !== 409 ||
    failedReservation?.success !== false ||
    failedReservation?.error?.code !== "PACKAGE_UNAVAILABLE"
  ) {
    throw new Error(
      `MINIAPP_NO_PACKAGE_GATE_MISMATCH: ${JSON.stringify(failedReservation)}`,
    );
  }

  const orderCount = await countMiniappUserOrders({
    storeId: fixture.storeId,
    userId: fixture.userId,
  });
  if (orderCount.count !== 0) {
    throw new Error(`MINIAPP_NO_PACKAGE_ORDER_CREATED: ${orderCount.count}`);
  }

  return {
    dishesBrowsable: true,
    orderCreated: false,
    packageVisible: false,
    rejectedCode: failedReservation.error.code,
    userId: fixture.userId,
  };
}

async function checkMiniappFrozenPackageGate(baseUrl, storeCode, fixture) {
  const mini = await createMiniSession({
    storeCode,
    userId: fixture.userId,
  });
  const authHeader = { authorization: `Bearer ${mini.token}` };

  const homeResponse = await requestJson(
    `${baseUrl}/api/v1/home?storeCode=${encodeURIComponent(storeCode)}`,
    { headers: authHeader },
  );
  const home = assertApiSuccess(homeResponse.payload, "miniapp frozen package home");
  if (home.package?.status !== "FROZEN") {
    throw new Error(`MINIAPP_FROZEN_PACKAGE_HOME_MISMATCH: ${JSON.stringify(home.package)}`);
  }
  if (!Array.isArray(home.dishes) || home.dishes.length === 0) {
    throw new Error("MINIAPP_FROZEN_PACKAGE_DISHES_MISSING: dishes should remain browsable");
  }

  const payload = buildMiniappFrozenPackageReservationPayload({
    addressId: fixture.addressId,
    dish: { id: fixture.dishId, stepJin: 0.5 },
    storeCode,
    userPackageId: fixture.userPackageId,
  });
  const response = await fetch(`${baseUrl}/api/v1/reservations`, {
    body: JSON.stringify(payload),
    headers: {
      ...authHeader,
      "content-type": "application/json",
    },
    method: "POST",
  });
  const failedReservation = await response.json();
  if (
    response.status !== 409 ||
    failedReservation?.success !== false ||
    failedReservation?.error?.code !== "PACKAGE_UNAVAILABLE"
  ) {
    throw new Error(
      `MINIAPP_FROZEN_PACKAGE_GATE_MISMATCH: ${JSON.stringify(
        failedReservation,
      )}`,
    );
  }

  const orderCount = await countMiniappUserOrders({
    storeId: fixture.storeId,
    userId: fixture.userId,
  });
  if (orderCount.count !== 0) {
    throw new Error(`MINIAPP_FROZEN_PACKAGE_ORDER_CREATED: ${orderCount.count}`);
  }

  return {
    dishesBrowsable: true,
    orderCreated: false,
    packageStatus: home.package.status,
    rejectedCode: failedReservation.error.code,
    userId: fixture.userId,
  };
}

async function checkMiniapp(baseUrl, storeCode) {
  const mini = await createMiniSession({ storeCode });
  const authHeader = { authorization: `Bearer ${mini.token}` };

  const homeResponse = await requestJson(
    `${baseUrl}/api/v1/home?storeCode=${encodeURIComponent(storeCode)}`,
    { headers: authHeader },
  );
  const home = assertApiSuccess(homeResponse.payload, "miniapp home");
  if (!home.package) {
    throw new Error("MINIAPP_PACKAGE_MISSING: seeded user has no active package");
  }
  if (!home.defaultAddress) {
    throw new Error("MINIAPP_ADDRESS_MISSING: seeded user has no default address");
  }

  const store = await checkMiniappStore(baseUrl, authHeader, storeCode);

  const profileResponse = await requestJson(
    `${baseUrl}/api/v1/me?storeCode=${encodeURIComponent(storeCode)}`,
    { headers: authHeader },
  );
  const profile = assertApiSuccess(profileResponse.payload, "miniapp profile");
  if (!profile.member?.id || profile.store?.code !== storeCode) {
    throw new Error("MINIAPP_PROFILE_MISMATCH: profile member or store is missing");
  }

  const packagesResponse = await requestJson(
    `${baseUrl}/api/v1/packages?storeCode=${encodeURIComponent(storeCode)}`,
    { headers: authHeader },
  );
  const packages = assertListPayload(
    assertApiSuccess(packagesResponse.payload, "miniapp packages"),
    "packages",
  );

  const addresses = await checkMiniappAddresses(
    baseUrl,
    authHeader,
    storeCode,
    home.defaultAddress.id,
  );
  const purchase = await checkMiniappPackagePurchase(
    baseUrl,
    authHeader,
    storeCode,
    packages,
  );
  const wxPhoneLogin = await checkMiniappWxPhoneLoginWithStub(storeCode);

  const dish = chooseReservableDish(home.dishes);
  const reservationPayload = buildReservationPayload({
    addressId: home.defaultAddress.id,
    dish,
    storeCode,
    userPackageId: home.package.id,
  });

  const reservationResponse = await requestJson(`${baseUrl}/api/v1/reservations`, {
    body: JSON.stringify(reservationPayload),
    headers: {
      ...authHeader,
      "content-type": "application/json",
    },
    method: "POST",
  });
  const reservation = assertApiSuccess(
    reservationResponse.payload,
    "miniapp reservation",
  ).reservation;
  const createdDbOrder = await inspectOrder(reservation.id);

  const updatePayload = buildReservationUpdatePayload({
    addressId: home.defaultAddress.id,
    dish,
    storeCode,
    userPackageId: home.package.id,
  });
  const updateResponse = await requestJson(
    `${baseUrl}/api/v1/orders/${encodeURIComponent(reservation.id)}`,
    {
      body: JSON.stringify(updatePayload),
      headers: {
        ...authHeader,
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );
  const updatedReservation = assertApiSuccess(
    updateResponse.payload,
    "miniapp reservation update",
  ).reservation;
  const updatedWeight = updatePayload.items[0]?.weightJin;
  if (
    updatedReservation.id !== reservation.id ||
    updatedReservation.totalWeightJin !== updatedWeight
  ) {
    throw new Error(
      `MINIAPP_RESERVATION_UPDATE_MISMATCH: ${JSON.stringify(updatedReservation)}`,
    );
  }

  const updatedDbOrder = await inspectOrder(reservation.id);
  if (
    !updatedDbOrder.modifiedAt ||
    updatedDbOrder.addressId !== updatePayload.addressId ||
    updatedDbOrder.changeLogCount < 1 ||
    updatedDbOrder.totalWeightJin !== updatedWeight ||
    updatedDbOrder.packageUsedTimes !== createdDbOrder.packageUsedTimes
  ) {
    throw new Error(`DB_ORDER_UPDATE_MISMATCH: ${JSON.stringify(updatedDbOrder)}`);
  }

  const cancelResponse = await requestJson(
    `${baseUrl}/api/v1/orders/${reservation.id}/cancel`,
    {
      body: JSON.stringify({
        reason: "real-data-smoke-cancel",
        storeCode,
      }),
      headers: {
        ...authHeader,
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  const canceled = assertApiSuccess(cancelResponse.payload, "miniapp cancel").order;
  if (canceled.status !== "CANCELED") {
    throw new Error(`MINIAPP_CANCEL_FAILED: got ${canceled.status}`);
  }

  const dbOrder = await inspectOrder(reservation.id);
  if (
    dbOrder.orderStatus !== "CANCELED" ||
    dbOrder.cancelReason !== "real-data-smoke-cancel"
  ) {
    throw new Error(`DB_ORDER_MISMATCH: ${JSON.stringify(dbOrder)}`);
  }

  const ordersResponse = await requestJson(
    `${baseUrl}/api/v1/orders?storeCode=${encodeURIComponent(storeCode)}`,
    { headers: authHeader },
  );
  const orders = assertListPayload(
    assertApiSuccess(ordersResponse.payload, "miniapp orders"),
    "orders",
  );
  if (!orders.items.some((item) => item.id === reservation.id && item.status === "CANCELED")) {
    throw new Error("MINIAPP_ORDERS_LIST_MISSING_CANCELED_ORDER: canceled order not listed");
  }

  const hideResponse = await requestJson(
    buildMiniappHideOrderUrl(baseUrl, {
      orderId: reservation.id,
      storeCode,
    }),
    {
      headers: authHeader,
      method: "DELETE",
    },
  );
  const hiddenOrder = assertApiSuccess(hideResponse.payload, "miniapp hide order").order;
  if (hiddenOrder.id !== reservation.id || !hiddenOrder.deletedByUserAt) {
    throw new Error(`MINIAPP_HIDE_ORDER_MISMATCH: ${JSON.stringify(hiddenOrder)}`);
  }

  const visibleOrdersResponse = await requestJson(
    `${baseUrl}/api/v1/orders?storeCode=${encodeURIComponent(storeCode)}`,
    { headers: authHeader },
  );
  const visibleOrders = assertListPayload(
    assertApiSuccess(visibleOrdersResponse.payload, "miniapp orders after hide"),
    "orders",
  );
  if (visibleOrders.items.some((item) => item.id === reservation.id)) {
    throw new Error("MINIAPP_HIDDEN_ORDER_STILL_LISTED: hidden order is visible");
  }

  const accountFixture = await createAdminSmokeFixture({ storeId: mini.storeId });
  let accountCancellation = null;
  try {
    accountCancellation = await checkMiniappAccountCancellation(
      baseUrl,
      storeCode,
      accountFixture,
    );
  } finally {
    await cleanupAdminSmokeFixture(accountFixture);
  }

  const noPackageFixture = await createAdminSmokeFixture({ storeId: mini.storeId });
  let noPackageGate = null;
  try {
    noPackageGate = await checkMiniappNoPackageGate(
      baseUrl,
      storeCode,
      noPackageFixture,
    );
  } finally {
    await cleanupAdminSmokeFixture(noPackageFixture);
  }

  return {
    accountCancellation,
    addressCount: addresses.addressCount,
    addressUpdated: addresses.updatedAddress,
    canceledOrderId: reservation.id,
    dishId: dish.id,
    itemCount: dbOrder.itemCount,
    orderHidden: true,
    modifiedOrderId: updatedReservation.id,
    noPackageGate,
    packagePurchase: purchase,
    packageTemplateId: purchase.templateId,
    profileMemberId: profile.member.id,
    storeId: mini.storeId,
    storeSwitchCount: store.storeCount,
    wxPhoneLogin,
  };
}

export async function runRealDataSmoke(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? process.env.SMOKE_BASE_URL);
  const storeCode = options.storeCode ?? process.env.SMOKE_STORE_CODE ?? DEFAULT_STORE_CODE;

  const health = await checkHealth(baseUrl);
  const admin = await checkAdmin(baseUrl, storeCode);
  assertAdminSmokeBoundPackageTemplateCoreGuard(admin);
  assertAdminSmokeBusinessPermissionGuard(admin);
  const miniapp = await withMiniappSmokeCutoffWindow(storeCode, () =>
    checkMiniapp(baseUrl, storeCode),
  );

  return {
    admin,
    baseUrl,
    health,
    miniapp,
    storeCode,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runRealDataSmoke();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
