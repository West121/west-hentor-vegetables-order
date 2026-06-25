import assert from "node:assert/strict";
import test from "node:test";

import {
  assertApiErrorCode,
  assertApiSuccess,
  assertMiniHomeShape,
  assertNonEmptyArray,
  assertOrderDetailShape,
  assertSpringPagePayload,
  assertSystemSettingsShape,
  assertUploadImageShape,
  chooseActivePackage,
  chooseOperationalStore,
  chooseReservableDish,
  getListItems,
  normalizeBaseUrl,
} from "./spring-api-smoke.mjs";

test("normalizeBaseUrl trims trailing slashes", () => {
  assert.equal(normalizeBaseUrl("http://127.0.0.1:8080///"), "http://127.0.0.1:8080");
});

test("assertApiSuccess and assertApiErrorCode validate API envelopes", () => {
  assert.deepEqual(assertApiSuccess({ success: true, data: { ok: true } }), { ok: true });
  assert.throws(
    () => assertApiSuccess({ success: false, error: { code: "BROKEN", message: "失败" } }, "spring"),
    /spring: BROKEN: 失败/,
  );

  assert.deepEqual(
    assertApiErrorCode(
      { success: false, error: { code: "INVALID_PARAMS", message: "参数错误" } },
      "INVALID_PARAMS",
      "invalid create",
    ),
    { code: "INVALID_PARAMS", message: "参数错误" },
  );
  assert.throws(
    () => assertApiErrorCode({ success: true, data: {} }, "INVALID_PARAMS", "invalid create"),
    /invalid create: expected INVALID_PARAMS, got SUCCESS/,
  );
});

test("getListItems supports Spring list aliases", () => {
  assert.deepEqual(getListItems({ stores: [{ id: "store-1" }] }, ["stores"]), [
    { id: "store-1" },
  ]);
  assert.deepEqual(getListItems({ items: [{ id: "item-1" }] }, ["stores"]), [
    { id: "item-1" },
  ]);
  assert.throws(() => getListItems({ rows: [] }, ["stores"]), /LIST_ITEMS_MISSING/);
});

test("assertSpringPagePayload validates both PageResult and named list pagination contracts", () => {
  assert.deepEqual(
    assertSpringPagePayload(
      { items: [{ id: "item-1" }], page: 1, pageSize: 20, total: 1, totalPages: 1 },
      ["stores"],
      "page result",
    ).items,
    [{ id: "item-1" }],
  );
  assert.deepEqual(
    assertSpringPagePayload(
      {
        pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
        stores: [{ id: "store-1" }],
      },
      ["stores"],
      "stores",
    ).items,
    [{ id: "store-1" }],
  );
  assert.throws(
    () => assertSpringPagePayload({ items: [], page: 1, pageSize: 20 }, ["items"], "broken"),
    /broken: pagination.total missing/,
  );
});

test("Spring smoke shape assertions catch broken business payloads", () => {
  assert.equal(
    assertOrderDetailShape({
      id: "order-1",
      items: [],
      orderNo: "OD1",
      shipments: [],
      status: "PENDING_SHIPMENT",
      user: { id: "user-1" },
      userPackage: { id: "package-1" },
    }).id,
    "order-1",
  );
  assert.throws(
    () => assertOrderDetailShape({ id: "order-1", items: [], orderNo: "OD1", status: "PENDING" }),
    /shipments must be an array/,
  );

  assert.equal(
    assertMiniHomeShape({
      dishes: [{ id: "dish-1", name: "菠菜", stepJin: 0.5 }],
      member: { id: "member-1" },
      store: { id: "store-1" },
    }).store.id,
    "store-1",
  );
  assert.throws(
    () => assertMiniHomeShape({ dishes: [{ id: "dish-1", name: "菠菜", stepJin: 0 }], member: { id: "member-1" }, store: { id: "store-1" } }),
    /dish contract broken/,
  );

  assert.equal(
    assertUploadImageShape({ image: { key: "dishes/a.png", mimeType: "image/png", url: "http://localhost/a.png" } }).key,
    "dishes/a.png",
  );
  assert.throws(
    () => assertUploadImageShape({ image: { key: "x", mimeType: "text/plain", url: "http://localhost/x" } }),
    /invalid image mime type/,
  );
});

test("management smoke assertions validate permissions and system settings payloads", () => {
  assert.deepEqual(assertNonEmptyArray([{ code: "orders.read" }], "permissions"), [
    { code: "orders.read" },
  ]);
  assert.throws(() => assertNonEmptyArray([], "permissions"), /permissions: expected non-empty array/);

  assert.equal(
    assertSystemSettingsShape({
      deliveryCities: ["南京市"],
      deliveryProvinces: ["江苏省"],
      store: { id: "store-1" },
    }).store.id,
    "store-1",
  );
  assert.throws(
    () => assertSystemSettingsShape({ store: { id: "store-1" } }),
    /delivery ranges must be arrays/,
  );
});

test("chooseOperationalStore prefers lotus-garden and requires an id", () => {
  assert.deepEqual(
    chooseOperationalStore([
      { code: "other", id: "store-other" },
      { code: "lotus-garden", id: "store-lotus" },
    ]),
    { code: "lotus-garden", id: "store-lotus" },
  );
  assert.throws(() => chooseOperationalStore([]), /SPRING_SMOKE_STORE_MISSING/);
});

test("chooseActivePackage picks usable packages", () => {
  assert.equal(
    chooseActivePackage([
      { id: "used", status: "ACTIVE", totalTimes: 1, usedTimes: 1, userId: "u1" },
      { id: "active", status: "ACTIVE", totalTimes: 8, usedTimes: 2, userId: "u2" },
    ]).id,
    "active",
  );
  assert.throws(() => chooseActivePackage([]), /SPRING_SMOKE_ACTIVE_PACKAGE_MISSING/);
});

test("chooseReservableDish picks on-sale dishes with enough stock for one step", () => {
  assert.equal(
    chooseReservableDish([
      { id: "off", status: "OFF_SALE", stockJin: 10, stepJin: 0.5 },
      { id: "stocked", status: "ON_SALE", stockJin: 1, stepJin: 0.5 },
    ]).id,
    "stocked",
  );
  assert.throws(() => chooseReservableDish([]), /SPRING_SMOKE_DISH_MISSING/);
});
