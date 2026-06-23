import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readAdminRoute(path: string) {
  return readFileSync(join(process.cwd(), "app/api/admin", path), "utf8");
}

function handlerBody(
  source: string,
  method: "GET" | "PATCH" | "POST",
  nextMethod?: "PATCH" | "POST",
) {
  const start = source.indexOf(`export async function ${method}`);
  const end = nextMethod
    ? source.indexOf(`export async function ${nextMethod}`)
    : source.length;

  expect(start, `${method} handler exists`).toBeGreaterThanOrEqual(0);
  expect(end, `${method} handler end exists`).toBeGreaterThan(start);

  return source.slice(start, end);
}

function expectPermissionBefore(
  source: string,
  permissionCode: string,
  nextCall: string,
) {
  expect(source).toContain("getPermissionFailure(");
  expect(source).toContain(`"${permissionCode}"`);
  expect(source.indexOf("getPermissionFailure(")).toBeLessThan(
    source.indexOf(nextCall),
  );
}

describe("business admin route access checks", () => {
  it("requires dish permissions before dish reads and writes", () => {
    const dishList = readAdminRoute("dishes/route.ts");
    expectPermissionBefore(
      handlerBody(dishList, "GET", "POST"),
      "dishes.read",
      "listDishes(",
    );
    expectPermissionBefore(
      handlerBody(dishList, "POST"),
      "dishes.write",
      "createDish(",
    );

    const dishDetail = readAdminRoute("dishes/[dishId]/route.ts");
    expectPermissionBefore(
      handlerBody(dishDetail, "GET", "PATCH"),
      "dishes.read",
      "getDish(",
    );
    expectPermissionBefore(
      handlerBody(dishDetail, "PATCH"),
      "dishes.write",
      "updateDish(",
    );

    expectPermissionBefore(
      readAdminRoute("dishes/[dishId]/inventory/route.ts"),
      "dishes.write",
      "adjustDishInventory(",
    );
    expect(readAdminRoute("dishes/[dishId]/inventory/route.ts")).toContain(
      "inventoryValidationMessage",
    );
    expect(readAdminRoute("dishes/[dishId]/inventory/route.ts")).toContain(
      "请输入库存调整原因",
    );
  });

  it("requires order permissions before order reads and writes", () => {
    const orderList = readAdminRoute("orders/route.ts");
    expectPermissionBefore(
      handlerBody(orderList, "GET", "POST"),
      "orders.read",
      "listStoreOrders(",
    );
    expectPermissionBefore(
      handlerBody(orderList, "POST"),
      "orders.write",
      "createStoreOrder(",
    );

    const orderDetail = readAdminRoute("orders/[orderId]/route.ts");
    expectPermissionBefore(
      handlerBody(orderDetail, "GET", "PATCH"),
      "orders.read",
      "getStoreOrder(",
    );
    expectPermissionBefore(
      handlerBody(orderDetail, "PATCH"),
      "orders.write",
      "updateOrderInternalRemark(",
    );

    expectPermissionBefore(
      readAdminRoute("orders/export/route.ts"),
      "orders.read",
      "exportStoreOrders(",
    );
    expectPermissionBefore(
      readAdminRoute("orders/print-labels/route.ts"),
      "orders.read",
      "buildOrderPrintLabels(",
    );
    expectPermissionBefore(
      readAdminRoute("stats/shipment/route.ts"),
      "orders.read",
      "getShipmentStats(",
    );
    expectPermissionBefore(
      readAdminRoute("orders/batch-ship/route.ts"),
      "orders.write",
      "batchShipOrders(",
    );
    expectPermissionBefore(
      readAdminRoute("orders/[orderId]/ship/route.ts"),
      "orders.write",
      "shipOrder(",
    );
    expectPermissionBefore(
      readAdminRoute("orders/[orderId]/sign/route.ts"),
      "orders.write",
      "signOrder(",
    );
    expectPermissionBefore(
      readAdminRoute("orders/[orderId]/void/route.ts"),
      "orders.write",
      "voidOrder(",
    );
  });

  it("requires member permissions before member and user package reads and writes", () => {
    expectPermissionBefore(
      readAdminRoute("members/route.ts"),
      "members.read",
      "listStoreMembers(",
    );

    const memberDetail = readAdminRoute("members/[userId]/route.ts");
    expectPermissionBefore(
      handlerBody(memberDetail, "GET", "PATCH"),
      "members.read",
      "getStoreMember(",
    );
    expectPermissionBefore(
      handlerBody(memberDetail, "PATCH"),
      "members.write",
      "updateStoreMember(",
    );
    expectPermissionBefore(
      handlerBody(readAdminRoute("members/import/route.ts"), "POST"),
      "members.write",
      "importStoreMembers(",
    );

    expectPermissionBefore(
      readAdminRoute("user-packages/route.ts"),
      "members.read",
      "listUserPackages(",
    );

    const userPackage = readAdminRoute("user-packages/[packageId]/route.ts");
    expectPermissionBefore(
      handlerBody(userPackage, "GET", "PATCH"),
      "members.read",
      "getUserPackage(",
    );
    expectPermissionBefore(
      handlerBody(userPackage, "PATCH"),
      "members.write",
      "adjustUserPackage(",
    );

    expectPermissionBefore(
      readAdminRoute("user-packages/[packageId]/freeze/route.ts"),
      "members.write",
      "freezeUserPackage(",
    );
    expectPermissionBefore(
      readAdminRoute("user-packages/[packageId]/unfreeze/route.ts"),
      "members.write",
      "unfreezeUserPackage(",
    );
    expectPermissionBefore(
      handlerBody(readAdminRoute("user-packages/import/route.ts"), "POST"),
      "members.write",
      "importUserPackages(",
    );
  });

  it("requires package template permissions before template reads and writes", () => {
    const templateList = readAdminRoute("package-templates/route.ts");
    expectPermissionBefore(
      handlerBody(templateList, "GET", "POST"),
      "packages.read",
      "listPackageTemplates(",
    );
    expectPermissionBefore(
      handlerBody(templateList, "POST"),
      "packages.write",
      "createPackageTemplate(",
    );

    const templateDetail = readAdminRoute("package-templates/[templateId]/route.ts");
    expectPermissionBefore(
      handlerBody(templateDetail, "GET", "PATCH"),
      "packages.read",
      "getPackageTemplate(",
    );
    expectPermissionBefore(
      handlerBody(templateDetail, "PATCH"),
      "packages.write",
      "updatePackageTemplate(",
    );
  });

  it("requires task permissions before task reads and writes", () => {
    const taskList = readAdminRoute("tasks/route.ts");
    expectPermissionBefore(
      handlerBody(taskList, "GET", "POST"),
      "tasks.read",
      "listTasks(",
    );
    expectPermissionBefore(
      handlerBody(taskList, "POST"),
      "tasks.write",
      "createTask(",
    );

    const taskDetail = readAdminRoute("tasks/[taskId]/route.ts");
    expectPermissionBefore(
      handlerBody(taskDetail, "GET", "PATCH"),
      "tasks.read",
      "getTask(",
    );
    expectPermissionBefore(
      handlerBody(taskDetail, "PATCH"),
      "tasks.write",
      "updateTask(",
    );

    expectPermissionBefore(
      readAdminRoute("tasks/[taskId]/copy/route.ts"),
      "tasks.write",
      "copyTask(",
    );
  });
});
