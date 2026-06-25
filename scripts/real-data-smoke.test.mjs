import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assertApiSuccess,
  assertAdminOrderStatus,
  assertApiErrorCode,
  assertAdminSmokeBusinessPermissionGuard,
  assertAdminSmokeBoundPackageTemplateCoreGuard,
  assertListPayload,
  assertPaymentReserve,
  assertTextIncludes,
  buildAdminBoundPackageTemplateCoreUpdatePayload,
  buildAdminDishPayload,
  buildAdminDishUpdatePayload,
  buildAdminFranchiseePayload,
  buildAdminFranchiseeUpdatePayload,
  buildAdminLoginPayload,
  buildAdminOrderPayload,
  buildAdminPackageTemplatePayload,
  buildAdminPackageTemplateUpdatePayload,
  buildAdminStoreQueryUrl,
  buildAdminStorePayload,
  buildAdminStoreUpdatePayload,
  buildAdminTaskCopyPayload,
  buildAdminTaskPayload,
  buildAdminTaskUpdatePayload,
  buildAdminUserPasswordPayload,
  buildAdminUserPayload,
  buildAdminUserUpdatePayload,
  buildMiniappHideOrderUrl,
  buildMiniappAccountCancelPayload,
  buildMiniappFrozenPackageReservationPayload,
  buildMiniappNoPackageReservationPayload,
  buildPackagePurchaseSmokeSummary,
  buildTinyPngUploadFormData,
  buildAdminMemberDisablePayload,
  buildAdminMemberEnablePayload,
  buildPackagePurchasePayload,
  buildReservationPayload,
  buildReservationUpdatePayload,
  buildSmokeAddressPayload,
  buildSmokeAddressUpdatePayload,
  chooseReservableDish,
  choosePurchaseTemplate,
  normalizeBaseUrl,
  parseSetCookie,
} from "./real-data-smoke.mjs";

test("runRealDataSmoke keeps miniapp reservation smoke independent from store cutoff", () => {
  const source = readFileSync(
    new URL("./real-data-smoke.mjs", import.meta.url),
    "utf8",
  );
  const runBody = source.slice(source.indexOf("export async function runRealDataSmoke"));

  assert.match(runBody, /withMiniappSmokeCutoffWindow\(/);
  assert.ok(
    runBody.indexOf("withMiniappSmokeCutoffWindow(") <
      runBody.indexOf("checkMiniapp(baseUrl, storeCode)"),
    "miniapp smoke should be executed inside the temporary cutoff window",
  );
});

test("normalizeBaseUrl trims trailing slashes", () => {
  assert.equal(
    normalizeBaseUrl("http://127.0.0.1:3000///"),
    "http://127.0.0.1:3000",
  );
});

test("parseSetCookie extracts the first cookie pair", () => {
  assert.equal(
    parseSetCookie("hentor_admin_session=abc.123; Path=/; HttpOnly"),
    "hentor_admin_session=abc.123",
  );
  assert.equal(parseSetCookie(null), "");
});

test("assertApiSuccess returns data and rejects failed API envelopes", () => {
  assert.deepEqual(assertApiSuccess({ success: true, data: { ok: true } }), {
    ok: true,
  });
  assert.throws(
    () =>
      assertApiSuccess({
        success: false,
        error: { code: "BROKEN", message: "接口失败" },
      }),
    /BROKEN: 接口失败/,
  );
});

test("assertApiErrorCode verifies failed API envelopes", () => {
  assert.deepEqual(
    assertApiErrorCode(
      {
        success: false,
        error: { code: "PERMISSION_FORBIDDEN", message: "无权执行该操作" },
      },
      "PERMISSION_FORBIDDEN",
      "admin permission smoke",
    ),
    { code: "PERMISSION_FORBIDDEN", message: "无权执行该操作" },
  );

  assert.throws(
    () =>
      assertApiErrorCode(
        { success: true, data: { ok: true } },
        "PERMISSION_FORBIDDEN",
        "admin permission smoke",
      ),
    /ADMIN_PERMISSION_SMOKE_ERROR_CODE_MISMATCH/,
  );

  assert.throws(
    () =>
      assertApiErrorCode(
        {
          success: false,
          error: { code: "STORE_FORBIDDEN", message: "无权访问该加盟门店" },
        },
        "PERMISSION_FORBIDDEN",
        "admin permission smoke",
      ),
    /ADMIN_PERMISSION_SMOKE_ERROR_CODE_MISMATCH/,
  );
});

test("chooseReservableDish picks a stocked dish and builds reservation payload", () => {
  const dish = chooseReservableDish([
    { id: "sold-out", stockJin: 0, stepJin: 0.5 },
    { id: "spinach", stockJin: 10, stepJin: 0.5 },
  ]);

  assert.equal(dish.id, "spinach");
  assert.deepEqual(
    buildReservationPayload({
      addressId: "address-1",
      dish,
      storeCode: "lotus-garden",
      userPackageId: "package-1",
    }),
    {
      addressId: "address-1",
      items: [{ dishId: "spinach", weightJin: 0.5 }],
      storeCode: "lotus-garden",
      userPackageId: "package-1",
      userVisibleRemark: "real-data-smoke",
    },
  );
});

test("buildReservationUpdatePayload doubles one dish step for edit smoke coverage", () => {
  assert.deepEqual(
    buildReservationUpdatePayload({
      addressId: "address-1",
      dish: { id: "spinach", stockJin: 10, stepJin: 0.5 },
      storeCode: "lotus-garden",
      userPackageId: "package-1",
    }),
    {
      addressId: "address-1",
      items: [{ dishId: "spinach", weightJin: 1 }],
      storeCode: "lotus-garden",
      userPackageId: "package-1",
      userVisibleRemark: "real-data-smoke-edit",
    },
  );

  assert.throws(
    () =>
      buildReservationUpdatePayload({
        addressId: "address-1",
        dish: { id: "spinach", stockJin: 0.5, stepJin: 0.5 },
        storeCode: "lotus-garden",
        userPackageId: "package-1",
      }),
    /NO_EDIT_STOCK_MARGIN/,
  );
});

test("assertListPayload returns list payloads and rejects malformed responses", () => {
  assert.deepEqual(
    assertListPayload({ items: [{ id: "item-1" }], summary: { all: 1 } }, "orders"),
    { items: [{ id: "item-1" }], summary: { all: 1 } },
  );
  assert.throws(
    () => assertListPayload({ summary: { all: 1 } }, "orders"),
    /ORDERS_ITEMS_MISSING/,
  );
});

test("choosePurchaseTemplate picks a purchasable template", () => {
  const template = choosePurchaseTemplate([
    { id: "template-1", name: "8斤周套餐" },
  ]);

  assert.equal(template.id, "template-1");
  assert.throws(() => choosePurchaseTemplate([]), /NO_PURCHASE_TEMPLATE/);
});

test("build smoke address and package purchase payloads", () => {
  assert.deepEqual(
    buildSmokeAddressPayload({
      storeCode: "lotus-garden",
    }),
    {
      city: "杭州市",
      detail: "真实数据 smoke 602",
      district: "西湖区",
      isDefault: false,
      province: "浙江省",
      receiverName: "Smoke 测试",
      receiverPhone: "13800007521",
      storeCode: "lotus-garden",
    },
  );
  assert.deepEqual(
    buildSmokeAddressUpdatePayload({
      storeCode: "lotus-garden",
    }),
    {
      city: "杭州市",
      detail: "真实数据 smoke 已编辑 602",
      district: "西湖区",
      isDefault: true,
      province: "浙江省",
      receiverName: "Smoke 编辑",
      receiverPhone: "13800007521",
      storeCode: "lotus-garden",
    },
  );
  assert.deepEqual(
    buildPackagePurchasePayload({
      storeCode: "lotus-garden",
      templateId: "template-1",
    }),
    {
      storeCode: "lotus-garden",
      templateId: "template-1",
    },
  );
});

test("assertPaymentReserve keeps WeChat payment explicitly reserved", () => {
  assert.deepEqual(
    assertPaymentReserve(
      { id: "purchase-1", status: "PAYMENT_NOT_ENABLED" },
      "purchase-1",
    ),
    { id: "purchase-1", status: "PAYMENT_NOT_ENABLED" },
  );
  assert.throws(
    () => assertPaymentReserve({ id: "purchase-1", status: "PENDING" }, "purchase-1"),
    /PAYMENT_RESERVE_STATUS_CHANGED/,
  );
  assert.throws(
    () =>
      assertPaymentReserve(
        { id: "other-purchase", status: "PAYMENT_NOT_ENABLED" },
        "purchase-1",
      ),
    /PAYMENT_RESERVE_ID_MISMATCH/,
  );
});

test("buildPackagePurchaseSmokeSummary exposes payment reserve evidence", () => {
  assert.deepEqual(
    buildPackagePurchaseSmokeSummary({
      dbPurchase: {
        amountFen: 3990,
        payChannel: "WECHAT",
        status: "PAYMENT_NOT_ENABLED",
      },
      prepay: {
        id: "purchase-1",
        status: "PAYMENT_NOT_ENABLED",
      },
      purchaseOrder: {
        id: "purchase-1",
        payChannel: "WECHAT",
        status: "PAYMENT_NOT_ENABLED",
      },
      purchaseReserve: {
        enabled: false,
      },
      template: {
        id: "template-1",
      },
    }),
    {
      amountFen: 3990,
      payChannel: "WECHAT",
      paymentEnabled: false,
      prepayStatus: "PAYMENT_NOT_ENABLED",
      purchaseOrderId: "purchase-1",
      status: "PAYMENT_NOT_ENABLED",
      templateId: "template-1",
    },
  );
});

test("buildAdminStoreQueryUrl appends store and filter query parameters", () => {
  assert.equal(
    buildAdminStoreQueryUrl("http://127.0.0.1:3000/api/admin/orders", {
      query: "张建国",
      status: "PENDING_SHIPMENT",
      storeId: "store-1",
    }),
    "http://127.0.0.1:3000/api/admin/orders?storeId=store-1&query=%E5%BC%A0%E5%BB%BA%E5%9B%BD&status=PENDING_SHIPMENT",
  );
});

test("buildMiniappHideOrderUrl encodes order and store identifiers", () => {
  assert.equal(
    buildMiniappHideOrderUrl("http://127.0.0.1:3000", {
      orderId: "order id/1",
      storeCode: "lotus/garden",
    }),
    "http://127.0.0.1:3000/api/v1/orders/order%20id%2F1/user-visible?storeCode=lotus%2Fgarden",
  );
});

test("buildMiniappAccountCancelPayload creates a reversible account smoke payload", () => {
  assert.deepEqual(
    buildMiniappAccountCancelPayload({
      storeCode: "lotus-garden",
    }),
    {
      reason: "real-data-smoke-account-cancel",
      storeCode: "lotus-garden",
    },
  );
});

test("buildMiniappNoPackageReservationPayload builds a forced no-package reservation attempt", () => {
  assert.deepEqual(
    buildMiniappNoPackageReservationPayload({
      addressId: "address-1",
      dish: { id: "spinach", stepJin: 0.5 },
      storeCode: "lotus-garden",
      userPackageId: "expired-package-1",
    }),
    {
      addressId: "address-1",
      items: [{ dishId: "spinach", weightJin: 0.5 }],
      storeCode: "lotus-garden",
      userPackageId: "expired-package-1",
      userVisibleRemark: "real-data-smoke-no-package",
    },
  );
});

test("buildMiniappFrozenPackageReservationPayload builds a forced frozen-package reservation attempt", () => {
  assert.deepEqual(
    buildMiniappFrozenPackageReservationPayload({
      addressId: "address-1",
      dish: { id: "spinach", stepJin: 0.5 },
      storeCode: "lotus-garden",
      userPackageId: "frozen-package-1",
    }),
    {
      addressId: "address-1",
      items: [{ dishId: "spinach", weightJin: 0.5 }],
      storeCode: "lotus-garden",
      userPackageId: "frozen-package-1",
      userVisibleRemark: "real-data-smoke-frozen-package",
    },
  );
});

test("buildMiniappWxPhoneLoginPayload creates the real miniapp login payload", async () => {
  const smoke = await import("./real-data-smoke.mjs");

  assert.equal(typeof smoke.buildMiniappWxPhoneLoginPayload, "function");
  assert.deepEqual(
    smoke.buildMiniappWxPhoneLoginPayload({
      loginCode: "smoke-login-code",
      phoneCode: "smoke-phone-code",
      storeCode: "lotus-garden",
    }),
    {
      loginCode: "smoke-login-code",
      phoneCode: "smoke-phone-code",
      storeCode: "lotus-garden",
    },
  );
});

test("startWechatStubServer serves the endpoints needed by wx-phone login", async () => {
  const smoke = await import("./real-data-smoke.mjs");

  assert.equal(typeof smoke.startWechatStubServer, "function");
  const stub = await smoke.startWechatStubServer({
    accessToken: "stub-access-token",
    openid: "smoke-wx-openid",
    phone: "13800007521",
    unionid: "smoke-wx-unionid",
  });

  try {
    const session = await fetch(`${stub.baseUrl}/sns/jscode2session`).then((res) =>
      res.json(),
    );
    assert.deepEqual(session, {
      openid: "smoke-wx-openid",
      session_key: "smoke-session-key",
      unionid: "smoke-wx-unionid",
    });

    const token = await fetch(`${stub.baseUrl}/cgi-bin/token`).then((res) =>
      res.json(),
    );
    assert.deepEqual(token, {
      access_token: "stub-access-token",
      expires_in: 7200,
    });

    const phone = await fetch(
      `${stub.baseUrl}/wxa/business/getuserphonenumber?access_token=stub-access-token`,
      {
        body: JSON.stringify({ code: "smoke-phone-code" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    ).then((res) => res.json());
    assert.deepEqual(phone, {
      errcode: 0,
      phone_info: {
        countryCode: "86",
        purePhoneNumber: "13800007521",
      },
    });

    assert.deepEqual(
      stub.requests.map((item) => item.pathname),
      [
        "/sns/jscode2session",
        "/cgi-bin/token",
        "/wxa/business/getuserphonenumber",
      ],
    );
  } finally {
    await stub.close();
  }
});

test("buildManagedAdminServerCommand runs a production server with WeChat stub env", async () => {
  const smoke = await import("./real-data-smoke.mjs");

  assert.equal(typeof smoke.buildManagedAdminServerCommand, "function");
  assert.deepEqual(
    smoke.buildManagedAdminServerCommand({
      port: 3019,
      wechatApiBaseUrl: "http://127.0.0.1:18080",
    }),
    {
      args: [
        "--filter",
        "@hentor/admin-web",
        "exec",
        "next",
        "start",
        "--port",
        "3019",
        "--hostname",
        "127.0.0.1",
      ],
      command: "pnpm",
      env: {
        WECHAT_API_BASE_URL: "http://127.0.0.1:18080",
      },
    },
  );
});

test("assertWxPhoneLoginSmokeResult verifies API, DB and WeChat stub evidence", async () => {
  const smoke = await import("./real-data-smoke.mjs");

  assert.equal(typeof smoke.assertWxPhoneLoginSmokeResult, "function");
  assert.deepEqual(
    smoke.assertWxPhoneLoginSmokeResult({
      db: {
        bindingSource: "wechat_login",
        bindingStatus: "ACTIVE",
        defaultStoreId: "store-1",
        openid: "smoke-openid",
        phone: "13800007521",
        storeCode: "lotus-garden",
        userId: "user-1",
      },
      expected: {
        openid: "smoke-openid",
        phone: "13800007521",
        storeCode: "lotus-garden",
      },
      login: {
        store: { code: "lotus-garden", id: "store-1" },
        token: "mini-token",
        user: {
          defaultStoreId: "store-1",
          id: "user-1",
          phone: "13800007521",
        },
      },
      stubRequests: [
        { pathname: "/sns/jscode2session" },
        { pathname: "/cgi-bin/token" },
        { pathname: "/wxa/business/getuserphonenumber" },
      ],
    }),
    {
      bindingCreated: true,
      stubRequestCount: 3,
      userId: "user-1",
    },
  );

  assert.throws(
    () =>
      smoke.assertWxPhoneLoginSmokeResult({
        db: {
          bindingSource: "manual",
          bindingStatus: "ACTIVE",
          defaultStoreId: "store-1",
          openid: "smoke-openid",
          phone: "13800007521",
          storeCode: "lotus-garden",
          userId: "user-1",
        },
        expected: {
          openid: "smoke-openid",
          phone: "13800007521",
          storeCode: "lotus-garden",
        },
        login: {
          store: { code: "lotus-garden", id: "store-1" },
          token: "mini-token",
          user: {
            defaultStoreId: "store-1",
            id: "user-1",
            phone: "13800007521",
          },
        },
        stubRequests: [
          { pathname: "/sns/jscode2session" },
          { pathname: "/cgi-bin/token" },
          { pathname: "/wxa/business/getuserphonenumber" },
        ],
      }),
    /WX_PHONE_LOGIN_DB_MISMATCH/,
  );
});

test("buildAdminLoginPayload creates admin login credentials for auth smoke", () => {
  assert.deepEqual(
    buildAdminLoginPayload({
      password: "Admin123456",
      username: "admin",
    }),
    {
      password: "Admin123456",
      username: "admin",
    },
  );
});

test("buildAdminOrderPayload creates a minimal backend order payload", () => {
  assert.deepEqual(
    buildAdminOrderPayload({
      addressId: "address-1",
      dishId: "dish-1",
      internalRemark: "后台 smoke",
      storeId: "store-1",
      userId: "user-1",
      userPackageId: "package-1",
      userVisibleRemark: "配送前电话确认",
      weightJin: 1.5,
    }),
    {
      addressId: "address-1",
      internalRemark: "后台 smoke",
      items: [{ dishId: "dish-1", weightJin: 1.5 }],
      storeId: "store-1",
      userId: "user-1",
      userPackageId: "package-1",
      userVisibleRemark: "配送前电话确认",
    },
  );
});

test("build admin dish payloads for dish management smoke", () => {
  assert.deepEqual(
    buildAdminDishPayload({
      imageKey: "dishes/smoke.png",
      imageUrl: "http://127.0.0.1:9000/hentor-public/dishes/smoke.png",
      runId: "abc12345",
      storeId: "store-1",
    }),
    {
      category: "ROOT",
      description: "真实数据 smoke 临时菜品",
      imageKey: "dishes/smoke.png",
      imageUrl: "http://127.0.0.1:9000/hentor-public/dishes/smoke.png",
      name: "Smoke 菜品 abc12345",
      sortOrder: 860,
      status: "ON_SALE",
      stepJin: 0.5,
      stockJin: 12.5,
      storeId: "store-1",
    },
  );

  assert.deepEqual(
    buildAdminDishUpdatePayload({
      imageKey: "dishes/smoke.png",
      imageUrl: "http://127.0.0.1:9000/hentor-public/dishes/smoke.png",
      runId: "abc12345",
      storeId: "store-1",
    }),
    {
      category: "ACTIVITY",
      description: "真实数据 smoke 临时菜品已编辑",
      imageKey: "dishes/smoke.png",
      imageUrl: "http://127.0.0.1:9000/hentor-public/dishes/smoke.png",
      name: "Smoke 菜品已编辑 abc12345",
      sortOrder: 861,
      status: "OFF_SALE",
      stepJin: 1,
      stockJin: 3,
      storeId: "store-1",
    },
  );
});

test("build admin franchisee and store payloads for multi-store smoke", () => {
  assert.deepEqual(buildAdminFranchiseePayload({ runId: "abc12345" }), {
    contactName: "Smoke 加盟商",
    contactPhone: "13800007531",
    contractEndsAt: "2099-12-31T15:59:59.000Z",
    name: "Smoke 加盟商 abc12345",
    remark: "real-data-smoke-franchisee",
    status: "ACTIVE",
  });

  assert.deepEqual(buildAdminFranchiseeUpdatePayload(), {
    contactName: "Smoke 加盟商已编辑",
    contactPhone: "13800007532",
    contractEndsAt: "2099-12-31T15:59:59.000Z",
    name: "Smoke 加盟商已编辑",
    remark: "real-data-smoke-franchisee-edit",
    status: "SUSPENDED",
  });

  assert.deepEqual(
    buildAdminStorePayload({
      franchiseeId: "franchisee-1",
      runId: "abc12345",
    }),
    {
      address: "真实数据 smoke 路 88 号",
      city: "杭州市",
      code: "smoke-store-abc12345",
      contactName: "Smoke 店长",
      contactPhone: "13800007533",
      customerServiceTel: "400-0752-100",
      cutoffTime: "18:00",
      district: "西湖区",
      franchiseEndsAt: "2099-12-31T15:59:59.000Z",
      franchiseeId: "franchisee-1",
      name: "Smoke 加盟门店 abc12345",
      province: "浙江省",
      status: "ACTIVE",
      type: "FRANCHISE",
    },
  );

  assert.deepEqual(
    buildAdminStoreUpdatePayload({
      franchiseeId: "franchisee-1",
      runId: "abc12345",
    }),
    {
      address: "真实数据 smoke 已编辑 99 号",
      city: "杭州市",
      code: "smoke-store-abc12345",
      contactName: "Smoke 店长已编辑",
      contactPhone: "13800007534",
      customerServiceTel: "400-0752-200",
      cutoffTime: "17:30",
      district: "滨江区",
      franchiseEndsAt: "2099-12-31T15:59:59.000Z",
      franchiseeId: "franchisee-1",
      name: "Smoke 加盟门店已编辑 abc12345",
      province: "浙江省",
      status: "DISABLED",
      type: "FRANCHISE",
    },
  );
});

test("build admin task payloads for task management smoke", () => {
  assert.deepEqual(
    buildAdminTaskPayload({
      dishId: "dish-1",
      runId: "abc12345",
      storeId: "store-1",
    }),
    {
      cutoffTime: "18:00",
      dishIds: ["dish-1"],
      endsAt: "2099-12-31T15:59:59.000Z",
      name: "Smoke 任务 abc12345",
      startsAt: "2026-01-01T00:00:00.000Z",
      status: "ACTIVE",
      storeId: "store-1",
      tag: "限时预订",
    },
  );

  assert.deepEqual(
    buildAdminTaskUpdatePayload({
      dishId: "dish-1",
      runId: "abc12345",
      storeId: "store-1",
    }),
    {
      cutoffTime: "17:30",
      dishIds: ["dish-1"],
      endsAt: "2099-12-31T15:59:59.000Z",
      name: "Smoke 任务已编辑 abc12345",
      startsAt: "2026-01-01T00:00:00.000Z",
      status: "DISABLED",
      storeId: "store-1",
      tag: "已停用",
    },
  );

  assert.deepEqual(
    buildAdminTaskCopyPayload({
      runId: "abc12345",
      storeId: "store-1",
    }),
    {
      name: "Smoke 任务复制 abc12345",
      storeId: "store-1",
    },
  );
});

test("build admin package template payloads for package management smoke", () => {
  assert.deepEqual(
    buildAdminPackageTemplatePayload({
      runId: "abc12345",
      storeId: "store-1",
    }),
    {
      name: "Smoke 套餐模板 abc12345",
      sortOrder: 880,
      storeId: "store-1",
      totalTimes: 12,
      validDays: 45,
      weightLimitJin: 6.5,
    },
  );

  assert.deepEqual(
    buildAdminPackageTemplateUpdatePayload({
      runId: "abc12345",
      storeId: "store-1",
    }),
    {
      name: "Smoke 套餐模板已编辑 abc12345",
      sortOrder: 881,
      status: "DISABLED",
      storeId: "store-1",
      totalTimes: 16,
      validDays: 60,
      weightLimitJin: 8,
    },
  );

  assert.deepEqual(
    buildAdminBoundPackageTemplateCoreUpdatePayload({
      storeId: "store-1",
    }),
    {
      name: "8斤周套餐",
      sortOrder: 1,
      status: "ACTIVE",
      storeId: "store-1",
      totalTimes: 9,
      validDays: 90,
      weightLimitJin: 9,
    },
  );
});

test("assertAdminSmokeBoundPackageTemplateCoreGuard requires real guard evidence", () => {
  assert.deepEqual(
    assertAdminSmokeBoundPackageTemplateCoreGuard({
      boundPackageTemplateCoreGuard: {
        protected: true,
        rejectedCode: "PACKAGE_TEMPLATE_IN_USE",
        templateId: "template-1",
        userPackageCount: 2,
      },
    }),
    {
      protected: true,
      rejectedCode: "PACKAGE_TEMPLATE_IN_USE",
      templateId: "template-1",
      userPackageCount: 2,
    },
  );

  assert.throws(
    () => assertAdminSmokeBoundPackageTemplateCoreGuard({}),
    /ADMIN_BOUND_TEMPLATE_CORE_GUARD_MISSING/,
  );

  assert.throws(
    () =>
      assertAdminSmokeBoundPackageTemplateCoreGuard({
        boundPackageTemplateCoreGuard: {
          protected: false,
          rejectedCode: "OK",
          templateId: "template-1",
          userPackageCount: 2,
        },
      }),
    /ADMIN_BOUND_TEMPLATE_CORE_GUARD_UNPROTECTED/,
  );
});

test("assertAdminSmokeBusinessPermissionGuard requires all business route denials", () => {
  assert.deepEqual(
    assertAdminSmokeBusinessPermissionGuard({
      businessPermissionGuard: {
        cleaned: true,
        dishImageUploadDenied: "PERMISSION_FORBIDDEN",
        dishesReadDenied: "PERMISSION_FORBIDDEN",
        membersReadDenied: "PERMISSION_FORBIDDEN",
        ordersReadDenied: "PERMISSION_FORBIDDEN",
        packagesReadDenied: "PERMISSION_FORBIDDEN",
        protected: true,
        tasksReadDenied: "PERMISSION_FORBIDDEN",
        username: "smoke-no-permission",
      },
    }),
    {
      cleaned: true,
      dishImageUploadDenied: "PERMISSION_FORBIDDEN",
      dishesReadDenied: "PERMISSION_FORBIDDEN",
      membersReadDenied: "PERMISSION_FORBIDDEN",
      ordersReadDenied: "PERMISSION_FORBIDDEN",
      packagesReadDenied: "PERMISSION_FORBIDDEN",
      protected: true,
      tasksReadDenied: "PERMISSION_FORBIDDEN",
      username: "smoke-no-permission",
    },
  );

  assert.throws(
    () => assertAdminSmokeBusinessPermissionGuard({}),
    /ADMIN_BUSINESS_PERMISSION_GUARD_MISSING/,
  );

  assert.throws(
    () =>
      assertAdminSmokeBusinessPermissionGuard({
        businessPermissionGuard: {
          cleaned: true,
          dishImageUploadDenied: "PERMISSION_FORBIDDEN",
          dishesReadDenied: "PERMISSION_FORBIDDEN",
          membersReadDenied: "PERMISSION_FORBIDDEN",
          ordersReadDenied: "PERMISSION_FORBIDDEN",
          packagesReadDenied: "OK",
          protected: true,
          tasksReadDenied: "PERMISSION_FORBIDDEN",
          username: "smoke-no-permission",
        },
      }),
    /ADMIN_BUSINESS_PERMISSION_GUARD_UNPROTECTED/,
  );

  assert.throws(
    () =>
      assertAdminSmokeBusinessPermissionGuard({
        businessPermissionGuard: {
          cleaned: true,
          dishesReadDenied: "PERMISSION_FORBIDDEN",
          membersReadDenied: "PERMISSION_FORBIDDEN",
          ordersReadDenied: "PERMISSION_FORBIDDEN",
          packagesReadDenied: "PERMISSION_FORBIDDEN",
          protected: true,
          tasksReadDenied: "PERMISSION_FORBIDDEN",
          username: "smoke-no-permission",
        },
      }),
    /ADMIN_BUSINESS_PERMISSION_GUARD_UNPROTECTED/,
  );
});

test("build admin user payloads for system management smoke", () => {
  assert.deepEqual(
    buildAdminUserPayload({
      roleId: "role-1",
      runId: "abc12345",
      storeId: "store-1",
    }),
    {
      name: "Smoke 后台账号 abc12345",
      password: "SmokeAdmin123",
      phone: "13900007521",
      roleIds: ["role-1"],
      status: "ACTIVE",
      storeIds: ["store-1"],
      username: "smoke-admin-abc12345",
    },
  );

  assert.deepEqual(
    buildAdminUserUpdatePayload({
      roleId: "role-1",
      storeId: "store-1",
    }),
    {
      name: "Smoke 后台账号已编辑",
      phone: "13900007522",
      roleIds: ["role-1"],
      status: "DISABLED",
      storeIds: ["store-1"],
    },
  );

  assert.deepEqual(buildAdminUserPasswordPayload(), {
    newPassword: "SmokeAdmin456",
  });
});

test("build admin member status payloads for member management smoke", () => {
  assert.deepEqual(
    buildAdminMemberDisablePayload({
      storeId: "store-1",
    }),
    {
      disabledReason: "后台 smoke 禁用会员",
      remark: "real-data-smoke-member-disabled",
      status: "DISABLED",
      storeId: "store-1",
    },
  );

  assert.deepEqual(
    buildAdminMemberEnablePayload({
      storeId: "store-1",
    }),
    {
      disabledReason: null,
      remark: "real-data-smoke-member-enabled",
      status: "ACTIVE",
      storeId: "store-1",
    },
  );
});

test("build admin user package adjustment payload for package management smoke", async () => {
  const smoke = await import("./real-data-smoke.mjs");

  assert.equal(typeof smoke.buildAdminUserPackageAdjustPayload, "function");
  assert.deepEqual(
    smoke.buildAdminUserPackageAdjustPayload({
      storeId: "store-1",
    }),
    {
      expiresAt: "2099-12-31T15:59:59.000Z",
      nextOrderDate: "2099-01-01T00:00:00.000Z",
      reason: "后台 smoke 调整用户套餐",
      storeId: "store-1",
      totalTimes: 22,
      usedTimes: 3,
      weightLimitJin: 9.5,
    },
  );
});

test("build admin system settings payload for system management smoke", async () => {
  const smoke = await import("./real-data-smoke.mjs");

  assert.equal(typeof smoke.buildAdminSystemSettingsPayload, "function");
  assert.deepEqual(
    smoke.buildAdminSystemSettingsPayload({
      storeId: "store-1",
    }),
    {
      aboutText: "真实数据 smoke 门店说明：用于验证后台系统设置写入与恢复。",
      customerServiceTel: "400-0752-300",
      privacyPolicyUrl: "https://example.com/hentor/privacy-smoke",
      storeId: "store-1",
      userAgreementUrl: "https://example.com/hentor/agreement-smoke",
    },
  );
});

test("buildTinyPngUploadFormData creates a supported image upload body", () => {
  const formData = buildTinyPngUploadFormData();
  const file = formData.get("file");

  assert.equal(file.name, "smoke-dish.png");
  assert.equal(file.type, "image/png");
  assert.equal(file.size, 68);
});

test("assertAdminOrderStatus and assertTextIncludes reject wrong responses", () => {
  assert.deepEqual(
    assertAdminOrderStatus({ id: "order-1", status: "SHIPPED" }, "SHIPPED"),
    { id: "order-1", status: "SHIPPED" },
  );
  assert.throws(
    () => assertAdminOrderStatus({ id: "order-1", status: "VOIDED" }, "SHIPPED"),
    /ADMIN_ORDER_STATUS_MISMATCH/,
  );

  assert.equal(assertTextIncludes("订单号,状态\nOD1,待配送", "订单号", "export"), true);
  assert.throws(
    () => assertTextIncludes("empty", "订单号", "export"),
    /EXPORT_TEXT_MISSING/,
  );
});
