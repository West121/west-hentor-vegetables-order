import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const NEXT_API_DIR = "apps/admin-web/app/api";
const SPRING_CONTROLLER_DIR =
  "apps/spring-api/src/main/java/cn/hentor/vegetables/controller";
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const REQUIRED_STACK_SNIPPETS = {
  "apps/spring-api/pom.xml": [
    "<java.version>21</java.version>",
    "spring-boot-starter-web",
    "mybatis-plus-spring-boot3-starter",
    "mybatis-plus-join-boot-starter",
    "spring-boot-starter-data-redis",
    "org.postgresql",
    "mysql-connector-j",
    "io.minio",
  ],
  "apps/spring-api/src/main/resources/application.yml": [
    "driver-class-name: ${SPRING_DATASOURCE_DRIVER:com.mysql.cj.jdbc.Driver}",
    "schema-mysql.sql",
    "redis:",
    "minio:",
    "storage:",
  ],
  "apps/spring-api/src/main/java/cn/hentor/vegetables/controller/HealthController.java": [
    "SessionStore",
    "MinioClient",
    "storeMapper.selectCount(null)",
  ],
  "apps/spring-api/src/main/java/cn/hentor/vegetables/service/AdminAuthService.java": [
    "SessionStore",
    "sessionStore.set",
  ],
  "apps/spring-api/src/main/java/cn/hentor/vegetables/service/SessionStore.java": [
    "StringRedisTemplate",
    "Redis is optional",
    "localSessions",
  ],
  "apps/spring-api/src/main/java/cn/hentor/vegetables/service/DishImageStorageService.java": [
    "StorageProperties",
    "putLocalObject",
    "MinioClient",
    "PutObjectArgs",
    "minioClient.putObject",
  ],
  "apps/spring-api/src/main/java/cn/hentor/vegetables/service/OrderQueryService.java": [
    "MPJLambdaWrapper",
    "selectJoinPage",
  ],
  "apps/spring-api/src/main/java/cn/hentor/vegetables/service/MemberService.java": [
    "MPJLambdaWrapper",
    "selectJoinPage",
  ],
  "apps/spring-api/src/main/java/cn/hentor/vegetables/service/UserPackageQueryService.java": [
    "MPJLambdaWrapper",
    "selectJoinPage",
  ],
};
function listFiles(rootDir, suffix) {
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolutePath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else if (entry.isFile() && absolutePath.endsWith(suffix)) {
        files.push(absolutePath);
      }
    }
  }

  return files.sort();
}

export function normalizeNextRoutePath(routeFile, rootDir = ROOT) {
  const relativeRoute = relative(join(rootDir, NEXT_API_DIR), routeFile);
  const withoutFile = relativeRoute
    .replace(new RegExp(`${sep.replace("\\", "\\\\")}route\\.ts$`), "")
    .replace(/route\.ts$/, "");
  const segments = withoutFile
    .split(sep)
    .filter(Boolean)
    .map((segment) => segment.replace(/^\[([^\]]+)\]$/, "{$1}"));
  return normalizeApiPath(`/${segments.join("/")}`);
}

export function normalizeSpringRoutePath(path) {
  return normalizeApiPath(path.replace(/^\/api\/spring(?=\/|$)/, ""));
}

function normalizeApiPath(path) {
  const normalized = `/${path}`
    .replace(/\/+/g, "/")
    .replace(/\/$/, "")
    .replace(/^\/*/, "/");
  return normalized === "" ? "/" : normalized;
}

export function collectNextRouteMethods(rootDir = ROOT) {
  const nextApiPath = join(rootDir, NEXT_API_DIR);
  if (!existsSync(nextApiPath)) {
    return [];
  }

  const routeFiles = listFiles(nextApiPath, "route.ts");
  const routes = [];

  for (const routeFile of routeFiles) {
    const source = readFileSync(routeFile, "utf8");
    const path = normalizeNextRoutePath(routeFile, rootDir);
    const methods = source.matchAll(
      /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g,
    );

    for (const methodMatch of methods) {
      routes.push(`${methodMatch[1]} ${path}`);
    }
  }

  return [...new Set(routes)].sort();
}

export function collectSpringRouteMethods(rootDir = ROOT) {
  const controllerFiles = listFiles(join(rootDir, SPRING_CONTROLLER_DIR), ".java");
  const routes = [];

  for (const controllerFile of controllerFiles) {
    const source = readFileSync(controllerFile, "utf8");
    const classBases = extractRequestMappingPaths(source);
    const mappingPattern =
      /@(Get|Post|Put|Patch|Delete)Mapping(?:\s*\(([^)]*)\))?/g;

    for (const mappingMatch of source.matchAll(mappingPattern)) {
      const method = mappingMatch[1].toUpperCase();
      if (!HTTP_METHODS.has(method)) {
        continue;
      }

      const methodPath = extractAnnotationPath(mappingMatch[2]);
      for (const classBase of classBases) {
        const absolutePath = combineSpringPaths(classBase, methodPath);
        routes.push(`${method} ${normalizeSpringRoutePath(absolutePath)}`);
      }
    }
  }

  return [...new Set(routes)].sort();
}

export function findMissingSpringMethods(
  nextRoutes = collectNextRouteMethods(),
  springRoutes = collectSpringRouteMethods(),
) {
  const springRouteSet = new Set(springRoutes);
  return nextRoutes.filter((route) => !springRouteSet.has(route));
}

function extractRequestMappingPaths(source) {
  const requestMapping = source.match(
    /@RequestMapping\s*\(([^)]*)\)/,
  );
  const paths = [...(requestMapping?.[1] ?? "").matchAll(/"([^"]*)"/g)].map(
    (match) => match[1],
  );
  return paths.length > 0 ? paths : [""];
}

function extractAnnotationPath(annotationArgs = "") {
  const stringMatch = annotationArgs.match(/"([^"]*)"/);
  return stringMatch?.[1] ?? "";
}

function combineSpringPaths(classBase, methodPath) {
  if (methodPath.startsWith("/api/")) {
    return methodPath;
  }
  return `${classBase}/${methodPath}`;
}

test("route path normalizers map Next and Spring dynamic segments to the same contract shape", () => {
  assert.equal(
    normalizeNextRoutePath(
      join(ROOT, "apps/admin-web/app/api/admin/orders/[orderId]/ship/route.ts"),
    ),
    "/admin/orders/{orderId}/ship",
  );
  assert.equal(
    normalizeSpringRoutePath("/api/spring/admin/orders/{orderId}/ship"),
    "/admin/orders/{orderId}/ship",
  );
});

test("Spring route collector supports alternate controller prefixes", () => {
  const springRoutes = collectSpringRouteMethods();

  assert.equal(springRoutes.includes("POST /v1/account/avatar"), true);
});

test("Spring backend exposes every method from the existing Next API contract", () => {
  const nextRoutes = collectNextRouteMethods();
  const springRoutes = collectSpringRouteMethods();

  assert.equal(springRoutes.length > 0, true, "Spring routes were discovered");
  if (nextRoutes.length === 0) {
    assert.equal(
      existsSync(join(ROOT, NEXT_API_DIR)),
      false,
      "Next API backend is omitted in Spring-only mode",
    );
    return;
  }

  const missing = findMissingSpringMethods(nextRoutes, springRoutes);
  assert.deepEqual(missing, []);
});

test("Spring backend uses the requested runtime and infrastructure stack in executable code", () => {
  for (const [relativePath, snippets] of Object.entries(REQUIRED_STACK_SNIPPETS)) {
    const source = readFileSync(join(ROOT, relativePath), "utf8");
    for (const snippet of snippets) {
      assert.equal(
        source.includes(snippet),
        true,
        `${relativePath} should contain ${snippet}`,
      );
    }
  }
});

test("package usage details exclude canceled and voided orders", () => {
  const springSource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/MiniPackageService.java",
    ),
    "utf8",
  );
  const legacyDbSource = readFileSync(
    join(ROOT, "packages/db/src/packages.ts"),
    "utf8",
  );

  assert.equal(
    springSource.includes(
      '.notIn(OrderEntity::getStatus, "CANCELED", "VOIDED")',
    ),
    true,
    "MiniPackageService usage details should not include canceled or voided orders",
  );
  assert.equal(
    legacyDbSource.includes('status: { notIn: ["CANCELED", "VOIDED"] }'),
    true,
    "legacy package detail recentOrders should not include canceled or voided orders",
  );
});

test("miniapp profile and package page keep first-created package ordering", () => {
  const packageSource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/MiniPackageService.java",
    ),
    "utf8",
  );
  const profileSource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/MiniProfileService.java",
    ),
    "utf8",
  );

  assert.equal(
    packageSource.includes("public MiniPackageDto getFirstCreatedPackage"),
    true,
    "MiniPackageService should expose first-created package for profile summary",
  );
  assert.equal(
    profileSource.includes("miniPackageService.getFirstCreatedPackage"),
    true,
    "MiniProfileService should show the first-created package on the me page",
  );
  assert.equal(
    packageSource.includes(".orderByAsc(UserPackageEntity::getCreatedAt)"),
    true,
    "miniapp package list should be sorted by createdAt ascending",
  );
  assert.equal(
    packageSource.includes(".orderByAsc(UserPackageEntity::getStatus)"),
    false,
    "miniapp package list should not move packages by status before createdAt",
  );
});

test("system settings no longer own cutoff time", () => {
  const serviceSource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/SystemSettingsService.java",
    ),
    "utf8",
  );
  const panelSource = readFileSync(
    join(ROOT, "apps/admin-web/app/ui/system-settings-panel.tsx"),
    "utf8",
  );

  assert.equal(
    serviceSource.includes('"cutoff_time"'),
    false,
    "SystemSettingsService should not persist a system-level cutoff_time config",
  );
  assert.equal(
    serviceSource.includes("normalizeCutoffTime"),
    false,
    "SystemSettingsService should not validate cutoff time after task management owns it",
  );
  assert.equal(
    panelSource.includes("每日截单时间"),
    false,
    "system settings modal should not expose cutoff time",
  );
});

test("task management rejects overlapping active or draft task ranges", () => {
  const taskSource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/TaskQueryService.java",
    ),
    "utf8",
  );

  assert.equal(
    taskSource.includes("ensureTaskTimeRangeAvailable"),
    true,
    "TaskQueryService should validate task time range conflicts",
  );
  assert.equal(
    taskSource.includes("TASK_TIME_RANGE_CONFLICT"),
    true,
    "overlapping task ranges should return a dedicated error code",
  );
  assert.equal(
    taskSource.includes(".lt(TaskEntity::getStartsAt, endsAt)"),
    true,
    "overlap check should reject existing tasks that start before the new end",
  );
  assert.equal(
    taskSource.includes(".gt(TaskEntity::getEndsAt, startsAt)"),
    true,
    "overlap check should reject existing tasks that end after the new start",
  );
});

test("miniapp reservations use active task cutoff without store fallback", () => {
  const homeSource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/MiniHomeService.java",
    ),
    "utf8",
  );
  const reservationSource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/MiniReservationService.java",
    ),
    "utf8",
  );

  assert.equal(
    homeSource.includes("activeTask == null ? null : activeTask.getCutoffTime()"),
    true,
    "MiniHomeService should expose cutoff time from the active task only",
  );
  assert.equal(
    homeSource.includes("if (activeTask == null) {\n      return List.of();\n    }"),
    true,
    "MiniHomeService should not show fallback dishes when no task is active",
  );
  assert.equal(
    reservationSource.includes('reservationError("TASK_NOT_AVAILABLE", "今日暂无可预订任务")'),
    true,
    "MiniReservationService should reject submits when no task is active",
  );
  assert.equal(
    reservationSource.includes("activeTask == null ? store.getCutoffTime()"),
    false,
    "MiniReservationService should not fall back to store cutoff time",
  );
});

test("user package import auto-creates missing members", () => {
  const packageSource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/UserPackageQueryService.java",
    ),
    "utf8",
  );
  const panelSource = readFileSync(
    join(ROOT, "apps/admin-web/app/ui/member-management-panel.tsx"),
    "utf8",
  );

  assert.equal(
    packageSource.includes("findOrCreateBindingByPhone"),
    true,
    "UserPackageQueryService should create or bind missing members during package import",
  );
  assert.equal(
    packageSource.includes('"imported-phone:" + phone'),
    true,
    "auto-created import users should receive a deterministic imported openid",
  );
  assert.equal(
    packageSource.includes('binding.setSource("user_package_import")'),
    true,
    "auto-created bindings should record their source",
  );
  assert.equal(
    panelSource.includes("会员不存在时会自动创建"),
    true,
    "admin import modal should explain auto-created members",
  );
});

test("member disable requires a reason in admin edit and import", () => {
  const serviceSource = readFileSync(
    join(ROOT, "apps/spring-api/src/main/java/cn/hentor/vegetables/service/MemberService.java"),
    "utf8",
  );

  assert.equal(
    serviceSource.includes("DISABLED_REASON_REQUIRED"),
    true,
    "MemberService should reject disabled members without a reason",
  );
  assert.equal(
    serviceSource.includes("停用会员时必须填写停用原因"),
    true,
    "MemberService should return a clear disabled-reason validation message",
  );
  assert.equal(
    serviceSource.includes('if ("DISABLED".equals(status) && !StringUtils.hasText(disabledReason))'),
    true,
    "member import should reject disabled rows without a reason",
  );
});

test("miniapp reservations allow multiple same-day orders and keep updates explicit", () => {
  const reservationSource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/MiniReservationService.java",
    ),
    "utf8",
  );

  assert.equal(
    reservationSource.includes("return saveReservation(session, request, null);"),
    true,
    "POST /reservations should always create a new reservation",
  );
  assert.equal(
    reservationSource.includes("return saveReservation(session, request, orderId);"),
    true,
    "PUT /orders/{orderId} should remain the only update path",
  );
  assert.equal(
    reservationSource.includes("ensureNoTodayOrder"),
    false,
    "same-day order uniqueness should not be enforced by the backend",
  );
  assert.equal(
    reservationSource.includes("ORDER_ALREADY_EXISTS"),
    false,
    "backend should not reject a second same-day order",
  );
});

test("admin order status filters use database-portable parameter binding", () => {
  const orderQuerySource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/OrderQueryService.java",
    ),
    "utf8",
  );

  assert.equal(
    orderQuerySource.includes('::"OrderStatus"'),
    false,
    "order status filters must not use PostgreSQL enum casts because MySQL is the default database",
  );
  assert.equal(
    orderQuerySource.includes("wrapper.eq(OrderEntity::getStatus, status.trim())"),
    true,
    "list/export status filters should bind status as a normal query parameter",
  );
});

test("admin order list applies date filters on the Spring backend", () => {
  const controllerSource = readFileSync(
    join(ROOT, "apps/spring-api/src/main/java/cn/hentor/vegetables/controller/OrderController.java"),
    "utf8",
  );
  const orderQuerySource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/OrderQueryService.java",
    ),
    "utf8",
  );

  assert.equal(
    controllerSource.includes("@RequestParam(required = false) String dateFrom"),
    true,
    "admin order list should accept dateFrom",
  );
  assert.equal(
    controllerSource.includes("@RequestParam(required = false) String dateTo"),
    true,
    "admin order list should accept dateTo",
  );
  assert.equal(
    controllerSource.includes("orderQueryService.listOrders(storeId, status, query, dateFrom, dateTo, page, pageSize)"),
    true,
    "admin order list should pass date filters into the service",
  );
  assert.equal(
    orderQuerySource.includes('parseDate(dateFrom, "dateFrom")'),
    true,
    "admin order list should parse dateFrom",
  );
  assert.equal(
    orderQuerySource.includes("wrapper.ge(OrderEntity::getCreatedAt, from.atStartOfDay())"),
    true,
    "admin order list should filter createdAt from the start date",
  );
  assert.equal(
    orderQuerySource.includes("wrapper.lt(OrderEntity::getCreatedAt, to.plusDays(1).atStartOfDay())"),
    true,
    "admin order list should filter createdAt before the day after dateTo",
  );
});

test("admin lists without explicit sort order default to newest created first", () => {
  const adminUserMapperSource = readFileSync(
    join(ROOT, "apps/spring-api/src/main/java/cn/hentor/vegetables/mapper/AdminUserMapper.java"),
    "utf8",
  );
  const dishSource = readFileSync(
    join(ROOT, "apps/spring-api/src/main/java/cn/hentor/vegetables/service/DishService.java"),
    "utf8",
  );
  const packageSource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/UserPackageQueryService.java",
    ),
    "utf8",
  );
  const storeSource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/StoreManagementService.java",
    ),
    "utf8",
  );
  const systemSource = readFileSync(
    join(
      ROOT,
      "apps/spring-api/src/main/java/cn/hentor/vegetables/service/SystemManagementService.java",
    ),
    "utf8",
  );
  const taskSource = readFileSync(
    join(ROOT, "apps/spring-api/src/main/java/cn/hentor/vegetables/service/TaskQueryService.java"),
    "utf8",
  );

  assert.equal(adminUserMapperSource.includes('ORDER BY u."createdAt" DESC'), true);
  assert.equal(adminUserMapperSource.includes('ORDER BY u."status" ASC'), false);
  assert.equal(dishSource.includes(".orderByDesc(DishEntity::getCreatedAt);"), true);
  assert.equal(dishSource.includes(".orderByAsc(DishEntity::getStatus)"), false);
  assert.equal(dishSource.includes(".orderByAsc(DishEntity::getCategory)"), false);
  assert.equal(dishSource.includes(".orderByAsc(DishEntity::getSortOrder)"), false);
  assert.equal(packageSource.includes(".orderByDesc(UserPackageEntity::getCreatedAt);"), true);
  assert.equal(
    packageSource.includes(".orderByDesc(UserPackageEntity::getUpdatedAt);"),
    false,
  );
  assert.equal(storeSource.includes("wrapper.orderByDesc(StoreEntity::getCreatedAt);"), true);
  assert.equal(storeSource.includes(".orderByDesc(FranchiseeEntity::getCreatedAt);"), true);
  assert.equal(systemSource.includes(".orderByDesc(AdminRoleEntity::getCreatedAt);"), true);
  assert.equal(taskSource.includes(".orderByDesc(TaskEntity::getCreatedAt)"), true);
  assert.equal(taskSource.includes(".orderByAsc(TaskEntity::getStatus)"), false);
});

test("admin frontend runs without the old Next.js API backend directory", () => {
  assert.equal(
    existsSync(join(ROOT, NEXT_API_DIR)),
    false,
    "apps/admin-web/app/api should stay removed after Spring backend migration",
  );
});
