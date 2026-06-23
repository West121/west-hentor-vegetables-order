import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, "..");
const MIN_FIGMA_SCREENSHOT_BYTES = 1024;

export const REQUIRED_FILE_GROUPS = {
  adminApiRoutes: [
    "apps/admin-web/app/api/admin/auth/login/route.ts",
    "apps/admin-web/app/api/admin/auth/logout/route.ts",
    "apps/admin-web/app/api/admin/stores/route.ts",
    "apps/admin-web/app/api/admin/stores/[storeId]/route.ts",
    "apps/admin-web/app/api/admin/franchisees/route.ts",
    "apps/admin-web/app/api/admin/franchisees/[franchiseeId]/route.ts",
    "apps/admin-web/app/api/admin/orders/route.ts",
    "apps/admin-web/app/api/admin/orders/[orderId]/route.ts",
    "apps/admin-web/app/api/admin/orders/[orderId]/ship/route.ts",
    "apps/admin-web/app/api/admin/orders/[orderId]/sign/route.ts",
    "apps/admin-web/app/api/admin/orders/[orderId]/void/route.ts",
    "apps/admin-web/app/api/admin/orders/batch-ship/route.ts",
    "apps/admin-web/app/api/admin/orders/export/route.ts",
    "apps/admin-web/app/api/admin/orders/print-labels/route.ts",
    "apps/admin-web/app/api/admin/members/route.ts",
    "apps/admin-web/app/api/admin/members/[userId]/route.ts",
    "apps/admin-web/app/api/admin/package-templates/route.ts",
    "apps/admin-web/app/api/admin/package-templates/[templateId]/route.ts",
    "apps/admin-web/app/api/admin/user-packages/route.ts",
    "apps/admin-web/app/api/admin/user-packages/[packageId]/route.ts",
    "apps/admin-web/app/api/admin/user-packages/[packageId]/freeze/route.ts",
    "apps/admin-web/app/api/admin/user-packages/[packageId]/unfreeze/route.ts",
    "apps/admin-web/app/api/admin/dishes/route.ts",
    "apps/admin-web/app/api/admin/dishes/[dishId]/route.ts",
    "apps/admin-web/app/api/admin/dishes/[dishId]/inventory/route.ts",
    "apps/admin-web/app/api/admin/tasks/route.ts",
    "apps/admin-web/app/api/admin/tasks/[taskId]/route.ts",
    "apps/admin-web/app/api/admin/tasks/[taskId]/copy/route.ts",
    "apps/admin-web/app/api/admin/stats/shipment/route.ts",
    "apps/admin-web/app/api/admin/admin-users/route.ts",
    "apps/admin-web/app/api/admin/admin-users/[adminUserId]/route.ts",
    "apps/admin-web/app/api/admin/admin-users/[adminUserId]/password/route.ts",
    "apps/admin-web/app/api/admin/roles/route.ts",
    "apps/admin-web/app/api/admin/operation-logs/route.ts",
    "apps/admin-web/app/api/admin/system-settings/route.ts",
    "apps/admin-web/app/api/admin/uploads/dish-images/route.ts",
  ],
  adminUi: [
    "apps/admin-web/app/login/page.tsx",
    "apps/admin-web/app/ui/admin-shell.tsx",
    "apps/admin-web/app/ui/admin-user-menu.tsx",
    "apps/admin-web/app/ui/order-management-panel.tsx",
    "apps/admin-web/app/ui/shipment-stats-panel.tsx",
    "apps/admin-web/app/ui/member-management-panel.tsx",
    "apps/admin-web/app/ui/operation-logs-panel.tsx",
    "apps/admin-web/app/ui/package-management-panel.tsx",
    "apps/admin-web/app/ui/package-template-management-panel.tsx",
    "apps/admin-web/app/ui/dish-management-panel.tsx",
    "apps/admin-web/app/ui/store-management-panel.tsx",
    "apps/admin-web/app/ui/task-management-panel.tsx",
    "apps/admin-web/app/ui/system-management-panel.tsx",
    "apps/admin-web/app/ui/system-settings-panel.tsx",
  ],
  adminBackendUtilities: [
    "apps/admin-web/app/lib/kuaidi100.ts",
    "apps/admin-web/app/lib/kuaidi100.test.ts",
  ],
  figmaScreenshots: [
    "docs/prototypes/figma-screenshots/01-admin-order-operations.png",
    "docs/prototypes/figma-screenshots/02-admin-user-management.png",
    "docs/prototypes/figma-screenshots/03-miniapp-home-with-package.png",
    "docs/prototypes/figma-screenshots/04-miniapp-submit-confirm.png",
    "docs/prototypes/figma-screenshots/05-miniapp-orders.png",
    "docs/prototypes/figma-screenshots/06-miniapp-me.png",
    "docs/prototypes/figma-screenshots/07-admin-login.png",
    "docs/prototypes/figma-screenshots/07-miniapp-addresses.png",
    "docs/prototypes/figma-screenshots/08-miniapp-login.png",
    "docs/prototypes/figma-screenshots/09-admin-modal-spec.png",
    "docs/prototypes/figma-screenshots/10-admin-collapsed-menu.png",
    "docs/prototypes/figma-screenshots/11-miniapp-packages.png",
    "docs/prototypes/figma-screenshots/12-miniapp-edit-reservation.png",
    "docs/prototypes/figma-screenshots/13-miniapp-home-no-package.png",
    "docs/prototypes/figma-screenshots/14-admin-nested-menu-collapse.png",
  ],
  infrastructure: [
    ".env.example",
    "docker-compose.yml",
    "packages/db/prisma/schema.prisma",
    "packages/db/prisma/seed.ts",
  ],
  springBackend: [
    "apps/spring-api/pom.xml",
    "apps/spring-api/src/main/resources/application.yml",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/VegetablesSpringApiApplication.java",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/common/ApiResponse.java",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/common/GlobalExceptionHandler.java",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/config/MybatisPlusConfig.java",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/config/MinioConfig.java",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/controller/HealthController.java",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/controller/OrderController.java",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/controller/MiniappHomeController.java",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/controller/MiniappReservationController.java",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/controller/DishUploadController.java",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/service/OrderQueryService.java",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/service/MiniReservationService.java",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/service/Kuaidi100Service.java",
    "apps/spring-api/src/main/java/cn/hentor/vegetables/service/DishImageStorageService.java",
    "apps/spring-api/src/test/java/cn/hentor/vegetables/service/Kuaidi100ServiceTest.java",
    "scripts/dev-spring.sh",
    "scripts/spring-api-smoke.mjs",
    "scripts/spring-api-smoke.test.mjs",
    "scripts/spring-route-contract.test.mjs",
  ],
  javaBackendTestingDocs: [
    "docs/testing/java-backend-real-test-cases.md",
  ],
  fullstackTestingDocs: [
    "docs/testing/fullstack-real-test-cases.md",
    "docs/testing/fullstack-real-test-cases.docx",
    "scripts/generate-fullstack-test-docx.py",
  ],
  miniappApiRoutes: [
    "apps/admin-web/app/api/v1/auth/wx-phone/route.ts",
    "apps/admin-web/app/api/v1/stores/current/route.ts",
    "apps/admin-web/app/api/v1/stores/switch/route.ts",
    "apps/admin-web/app/api/v1/stores/settings/route.ts",
    "apps/admin-web/app/api/v1/home/route.ts",
    "apps/admin-web/app/api/v1/reservations/route.ts",
    "apps/admin-web/app/api/v1/orders/route.ts",
    "apps/admin-web/app/api/v1/orders/[orderId]/route.ts",
    "apps/admin-web/app/api/v1/orders/[orderId]/cancel/route.ts",
    "apps/admin-web/app/api/v1/orders/[orderId]/user-visible/route.ts",
    "apps/admin-web/app/api/v1/addresses/route.ts",
    "apps/admin-web/app/api/v1/addresses/[addressId]/route.ts",
    "apps/admin-web/app/api/v1/addresses/[addressId]/default/route.ts",
    "apps/admin-web/app/api/v1/me/route.ts",
    "apps/admin-web/app/api/v1/packages/route.ts",
    "apps/admin-web/app/api/v1/package-purchases/route.ts",
    "apps/admin-web/app/api/v1/package-purchases/[purchaseId]/wechat-prepay/route.ts",
    "apps/admin-web/app/api/v1/account/route.ts",
  ],
  miniappPages: [
    "apps/miniapp/src/app.config.ts",
    "apps/miniapp/src/pages/home/index.tsx",
    "apps/miniapp/src/pages/home/index.scss",
    "apps/miniapp/src/pages/me/index.tsx",
    "apps/miniapp/src/pages/me/index.scss",
    "apps/miniapp/src/pages/login/index.tsx",
    "apps/miniapp/src/pages/login/index.scss",
    "apps/miniapp/src/pages/orders/index.tsx",
    "apps/miniapp/src/pages/addresses/index.tsx",
    "apps/miniapp/src/pages/packages/index.tsx",
    "apps/miniapp/src/assets/tabbar/home-default.png",
    "apps/miniapp/src/assets/tabbar/home-active.png",
    "apps/miniapp/src/assets/tabbar/me-default.png",
    "apps/miniapp/src/assets/tabbar/me-active.png",
  ],
  smokeScripts: [
    "scripts/admin-artifact-smoke.mjs",
    "scripts/admin-runtime-visual-smoke.mjs",
    "scripts/miniapp-artifact-smoke.mjs",
    "scripts/miniapp-runtime-visual-smoke.mjs",
    "scripts/real-data-smoke.mjs",
    "scripts/spring-api-smoke.mjs",
  ],
};

export const REQUIRED_SOURCE_SNIPPETS = {
  "apps/admin-web/app/ui/admin-shell.tsx": [
    'aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}',
    'aria-label={`${groupOpen ? "收起" : "展开"}${group.label}菜单`}',
    'collapsed ? "w-[72px]" : "w-[220px]"',
  ],
  "apps/miniapp/src/app.config.ts": [
    "assets/tabbar/home-default.png",
    "assets/tabbar/home-active.png",
    "assets/tabbar/me-default.png",
    "assets/tabbar/me-active.png",
  ],
  "docker-compose.yml": [
    "mysql:",
    "redis:",
    "minio:",
    "minio-init:",
    "mysql_data:",
  ],
  "apps/spring-api/pom.xml": [
    "<java.version>21</java.version>",
    "mybatis-plus-spring-boot3-starter",
    "mybatis-plus-join-boot-starter",
    "spring-boot-starter-data-redis",
    "mysql-connector-j",
    "io.minio",
  ],
  "apps/spring-api/src/main/resources/application.yml": [
    "driver-class-name: ${SPRING_DATASOURCE_DRIVER:com.mysql.cj.jdbc.Driver}",
    "SPRING_DATASOURCE_URL",
    "schema-mysql.sql",
    "REDIS_HOST",
    "storage:",
    "SPRING_MINIO_ENDPOINT",
    "SPRING_MINIO_PUBLIC_URL",
    "KUAIDI100_KEY",
    "KUAIDI100_SECRET",
    "KUAIDI100_CODE",
    "KUAIDI100_SIID",
  ],
  "apps/spring-api/src/main/java/cn/hentor/vegetables/controller/HealthController.java": [
    "SessionStore",
    "MinioClient",
    "storeMapper.selectCount(null)",
    'result.put("session", sessionStore.status())',
    'result.put("storage", checkStorage())',
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
  "apps/spring-api/src/main/java/cn/hentor/vegetables/service/Kuaidi100Service.java": [
    "https://api.kuaidi100.com/label/order",
    "method",
    "order",
    "tempId",
    "printType",
    "code",
    "md5Upper(param + timestamp + properties.getKey() + properties.getSecret())",
    "KUAIDI100_CONFIG_MISSING",
  ],
  "apps/spring-api/src/test/java/cn/hentor/vegetables/service/Kuaidi100ServiceTest.java": [
    "missingConfigReportsRequiredCloudPrintFields",
    "buildParamKeepsKuaidi100CloudPrintContract",
    "buildSignedRequestUsesOfficialMd5ParamTimestampKeySecretOrder",
    "https://api.kuaidi100.com/label/order?",
    "method=order",
  ],
  "apps/admin-web/app/lib/kuaidi100.ts": [
    "https://api.kuaidi100.com/label/order?",
    'method: "order"',
    "tempId",
    "printType",
    "KUAIDI100_CODE",
  ],
  "apps/admin-web/app/lib/kuaidi100.test.ts": [
    "keeps the legacy Kuaidi100 label/order contract used by Hyhyxcx",
    "https://api.kuaidi100.com/label/order",
    "method",
    "order",
    "tempId",
    "sf_secret",
  ],
  "package.json": [
    '"setup:dev"',
    '"dev:spring": "sh scripts/dev-spring.sh"',
    '"build:spring"',
    '"smoke:admin-artifacts"',
    '"smoke:admin-runtime-visual"',
    '"smoke:miniapp-artifacts"',
    '"smoke:miniapp-runtime-visual"',
    '"smoke:spring-api"',
    '"smoke:real"',
  ],
  "scripts/dev-spring.sh": [
    "SPRING_MINIO_ENDPOINT",
    "SPRING_MINIO_PUBLIC_URL",
    "unset MINIO_ENDPOINT",
    "mvn -f apps/spring-api/pom.xml spring-boot:run",
  ],
  "packages/db/prisma/schema.prisma": [
    "model Store",
    "model Franchisee",
    "model MemberStoreBinding",
    "model AdminUser",
    "model AdminRole",
    "model AdminPermission",
    "model UserPackage",
    "model OrderChangeLog",
    "model PackagePurchaseOrder",
    "model PaymentOrder",
  ],
  "scripts/admin-runtime-visual-smoke.mjs": [
    "sidebar-collapsed",
    "system-menu-collapsed",
    "orderModalControls",
    "assertAdminCollapsedSidebarLayout",
    "assertAdminGroupCollapsedLayout",
  ],
  "scripts/real-data-smoke.mjs": [
    "checkAdminStoreWorkflow",
    "checkAdminUserWorkflow",
    "checkAdminBusinessPermissionGuard",
    "checkAdminDishImageUpload",
    "checkAdminSystemSettingsWorkflow",
    "checkAdminMemberWorkflow",
    "checkAdminUserPackageAdjustWorkflow",
    "checkMiniappFrozenPackageGate",
    "checkAdminOrderWorkflow",
    "checkMiniappStore",
    "checkMiniappAddresses",
    "checkMiniappPackagePurchase",
    "checkMiniappWxPhoneLoginWithStub",
    "checkMiniappAccountCancellation",
    "checkMiniappNoPackageGate",
    "miniapp reservation update",
    "miniapp hide order",
  ],
  "scripts/spring-api-smoke.mjs": [
    "runSpringApiSmoke",
    "assertSpringPagePayload",
    "assertNonEmptyArray",
    "assertSystemSettingsShape",
    "assertOrderDetailShape",
    "assertMiniHomeShape",
    "assertUploadImageShape",
    "/api/spring/health",
    "/api/spring/admin/orders",
    "/api/spring/admin/roles",
    "/api/spring/admin/admin-users",
    "/api/spring/admin/package-templates",
    "/api/spring/admin/system-settings",
    "/api/spring/v1/home",
  ],
  "scripts/spring-route-contract.test.mjs": [
    "findMissingSpringMethods",
    "collectSpringRouteMethods",
    "collectNextRouteMethods",
  ],
  "docs/testing/java-backend-real-test-cases.md": [
    "只测试 Java Spring Boot 后端",
    "JAVA-BE-001 健康检查同时验证 PostgreSQL、Redis、MinIO",
    "JAVA-BE-043 提交预订成功，一天只允许一个有效订单",
    "JAVA-BE-084 用户套餐附加权益扣减",
    "JAVA-BE-102 操作日志包含请求参数、返回参数和响应时长",
    "MiniReservationServiceIntegrationTest",
    "Kuaidi100ServiceTest",
  ],
  "docs/testing/fullstack-real-test-cases.md": [
    "前后端真实测试用例文档",
    "管理后台",
    "微信小程序",
    "Next API",
    "Spring API",
    "P0-ADMIN-001 登录与会话",
    "P0-MINI-001 登录页与手机号登录",
    "P0-NEXT-001 管理后台订单 API",
    "P0-BE-001 Spring 健康检查",
    "P0-E2E-001 菜品上下架影响小程序",
    "pnpm smoke:real",
    "pnpm smoke:spring-api",
  ],
};

function requireFile(rootDir, relativePath) {
  const absolutePath = join(rootDir, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`COMPLETION_AUDIT_FILE_MISSING: ${relativePath}`);
  }
}

async function requireSourceSnippets(rootDir, relativePath, snippets) {
  const source = await readFile(join(rootDir, relativePath), "utf8");
  const missing = snippets.filter((snippet) => !source.includes(snippet));
  if (missing.length > 0) {
    throw new Error(
      `COMPLETION_AUDIT_SNIPPET_MISSING: ${relativePath} ${missing.join(", ")}`,
    );
  }
}

async function requireFigmaScreenshots(rootDir, screenshots) {
  for (const screenshot of screenshots) {
    const fileStat = await stat(join(rootDir, screenshot));
    if (fileStat.size < MIN_FIGMA_SCREENSHOT_BYTES) {
      throw new Error(
        `COMPLETION_AUDIT_FIGMA_SCREENSHOT_EMPTY: ${screenshot} ${fileStat.size}`,
      );
    }
  }
}

export async function runCompletionAudit({ rootDir = ROOT_DIR } = {}) {
  if (!existsSync(join(rootDir, ".git"))) {
    throw new Error("COMPLETION_AUDIT_GIT_MISSING: .git directory is required");
  }

  const groups = {};
  for (const [groupName, files] of Object.entries(REQUIRED_FILE_GROUPS)) {
    for (const file of files) {
      requireFile(rootDir, file);
    }
    groups[groupName] = { checked: files.length };
  }

  await requireFigmaScreenshots(rootDir, REQUIRED_FILE_GROUPS.figmaScreenshots);

  for (const [file, snippets] of Object.entries(REQUIRED_SOURCE_SNIPPETS)) {
    await requireSourceSnippets(rootDir, file, snippets);
  }

  return {
    groups,
    ok: true,
    sourceContracts: Object.keys(REQUIRED_SOURCE_SNIPPETS).length,
  };
}

function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCompletionAudit()
    .then(printResult)
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
