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
const NEXT_BACKEND_SENTINELS = [
  "apps/admin-web/app/api/admin/orders/route.ts",
  "apps/admin-web/app/api/admin/members/route.ts",
  "apps/admin-web/app/api/v1/home/route.ts",
  "apps/admin-web/app/api/v1/orders/route.ts",
];

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
  const routeFiles = listFiles(join(rootDir, NEXT_API_DIR), "route.ts");
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
    const classBase = extractRequestMappingPath(source) ?? "";
    const mappingPattern =
      /@(Get|Post|Put|Patch|Delete)Mapping(?:\s*\(([^)]*)\))?/g;

    for (const mappingMatch of source.matchAll(mappingPattern)) {
      const method = mappingMatch[1].toUpperCase();
      if (!HTTP_METHODS.has(method)) {
        continue;
      }

      const methodPath = extractAnnotationPath(mappingMatch[2]);
      const absolutePath = combineSpringPaths(classBase, methodPath);
      routes.push(`${method} ${normalizeSpringRoutePath(absolutePath)}`);
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

function extractRequestMappingPath(source) {
  const requestMapping = source.match(
    /@RequestMapping\s*\(\s*(?:value\s*=\s*)?"([^"]*)"/,
  );
  return requestMapping?.[1];
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

test("Spring backend exposes every method from the existing Next API contract", () => {
  const nextRoutes = collectNextRouteMethods();
  const springRoutes = collectSpringRouteMethods();
  const missing = findMissingSpringMethods(nextRoutes, springRoutes);

  assert.equal(nextRoutes.length > 0, true, "Next routes were discovered");
  assert.equal(springRoutes.length > 0, true, "Spring routes were discovered");
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

test("existing Next.js API backend remains present beside the Spring backend", () => {
  for (const sentinel of NEXT_BACKEND_SENTINELS) {
    assert.equal(existsSync(join(ROOT, sentinel)), true, `${sentinel} should remain`);
  }
});
