# Admin Brand, Navigation, Account Validation, and WeChat Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved admin brand/store renaming, stable collapsed navigation, username whitespace validation, “面单打印” copy, and simulated WeChat website OAuth with first-use account binding.

**Architecture:** Extend the existing store-backed system settings with a synchronized `admin_system_name` key and keep `HanYang Fresh` as the runtime fallback. Add a Spring-owned WeChat website OAuth boundary with one-time state/bind tokens in `SessionStore`, a dedicated admin binding table, and a server-controlled mock mode; the Next.js login UI only starts OAuth and submits the one-time binding token.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Spring Boot 3.5, Java 21, MyBatis-Plus, MySQL, Prisma schema parity, Redis/in-memory `SessionStore`, OkHttp, Maven.

## Global Constraints

- Preserve all unrelated dirty-worktree changes and stage only files belonging to each task.
- The target files already contain extensive user changes. Do not stage or commit implementation files in this execution; use tests plus `git diff --check` as checkpoints and leave the combined working tree intact for the user.
- Backend system name is globally consistent, configurable in System Settings, and defaults to `HanYang Fresh`.
- Rename only the store record `seed-store-lotus` to `涵养总店`; do not rewrite address text containing `莲花小区`.
- Reject any whitespace in newly created admin usernames with `当前账号存在空格，请重新填写`; historical login behavior remains unchanged.
- User-facing menu copy is `面单打印`; internal `kuaidi-printers` routes and Kuaidi100 integration names remain unchanged.
- Do not expose or log `WECHAT_OPEN_APP_SECRET`, OAuth access tokens, passwords, authorization codes, or one-time bind tokens.
- Mock WeChat login is disabled by default and uses only a server-configured fixed mock identity.
- Real WeChat credentials are not required for this pass; completion claims must say the real provider flow remains unverified.

---

## File Structure

- `apps/admin-web/app/ui/system-settings-form.ts`: admin system-name form type and payload normalization.
- `apps/admin-web/app/ui/system-settings-panel.tsx`: editable field and visible settings summary.
- `apps/admin-web/app/dashboard-client.tsx`: runtime shell brand and dashboard copy.
- `apps/admin-web/app/ui/admin-shell.tsx`: collapsed flyout hover/focus bridge.
- `apps/admin-web/app/lib/admin-navigation.ts`: `面单打印` navigation label.
- `apps/admin-web/app/ui/admin-username-policy.ts`: reusable client username whitespace rule.
- `apps/admin-web/app/login/login-form.tsx`: password login, WeChat start, and first-bind states.
- `apps/spring-api/.../SystemSettings*`: persisted `admin_system_name` contract and synchronization.
- `apps/spring-api/.../AdminUsernamePolicy.java`: Unicode whitespace rejection for create-user flow.
- `apps/spring-api/.../AdminWechat*`: website OAuth properties, provider client, binding entity/mapper, service, DTOs, and controller endpoints.
- `apps/spring-api/src/main/resources/{schema-mysql.sql,data-mysql.sql,application.yml}`: schema, defaults, and secure configuration wiring.
- `packages/db/prisma/schema.prisma` and `packages/db/src/system-settings.ts`: parity for the repository's TypeScript data path.
- `deploy/sql/20260710-admin-brand-wechat-login.sql`: idempotent existing-database migration.
- Focused Vitest and JUnit tests beside the affected units.

---

### Task 1: Global Admin Name and Store Rename

**Files:**
- Modify: `apps/admin-web/app/ui/system-settings-form.ts`
- Modify: `apps/admin-web/app/ui/system-settings-form.test.ts`
- Modify: `apps/admin-web/app/ui/system-settings-panel.tsx`
- Modify: `apps/admin-web/app/dashboard-client.tsx`
- Modify: `apps/admin-web/app/layout.tsx`
- Modify: `apps/admin-web/app/favicon.ico/route.ts`
- Modify: `apps/admin-web/app/favicon.ico/route.test.ts`
- Modify: `apps/spring-api/src/main/java/cn/hentor/vegetables/dto/SystemSettingsDto.java`
- Modify: `apps/spring-api/src/main/java/cn/hentor/vegetables/dto/SystemSettingsRequest.java`
- Modify: `apps/spring-api/src/main/java/cn/hentor/vegetables/service/SystemSettingsService.java`
- Modify: `apps/spring-api/src/main/resources/data-mysql.sql`
- Modify: `deploy/sql/init-mysql-clean.sql`
- Modify: `packages/db/prisma/seed.ts`
- Modify: `packages/db/src/system-settings.ts`
- Modify: `packages/db/src/system-settings.test.ts`
- Create: `deploy/sql/20260710-admin-brand-wechat-login.sql`

**Interfaces:**
- Produces: `SystemSettingsFormState.adminSystemName: string` and JSON field `adminSystemName`.
- Produces: persisted config key `admin_system_name` with fallback `HanYang Fresh`.

- [ ] **Step 1: Write failing settings and source-contract tests**

```ts
expect(buildSystemSettingsPayload("store-1", {
  aboutText: "",
  adminSystemName: " HanYang Fresh ",
  customerServiceTel: "",
  deliveryCities: [],
  deliveryProvinces: [],
  homeDishColumns: 3,
  loginImageUrl: "",
  loginSubtitle: "",
  loginTitle: "",
  loginWelcome: "",
  privacyPolicyContent: "",
  privacyPolicyUrl: "",
  userAgreementContent: "",
  userAgreementUrl: "",
})).toMatchObject({ adminSystemName: "HanYang Fresh" });
```

Add source assertions that `dashboard-client.tsx` passes `data.systemSettings?.adminSystemName || "HanYang Fresh"` to `AdminShell`, and seed assertions that `seed-store-lotus` is named `涵养总店`.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm --filter @hentor/admin-web test -- app/ui/system-settings-form.test.ts app/favicon.ico/route.test.ts`

Expected: FAIL because `adminSystemName` and the new defaults do not exist.

- [ ] **Step 3: Implement the end-to-end setting**

Add the field to the TypeScript and Java DTOs, require nonblank normalized input in Spring, and synchronize it across all stores during update:

```java
private static final String DEFAULT_ADMIN_SYSTEM_NAME = "HanYang Fresh";

String adminSystemName = normalizeText(request.adminSystemName());
if (!StringUtils.hasText(adminSystemName)) {
  throw new ApiException("ADMIN_SYSTEM_NAME_REQUIRED", "请输入后台系统名称", HttpStatus.BAD_REQUEST);
}
for (StoreEntity item : storeMapper.selectList(null)) {
  upsertConfig(item.getId(), "admin_system_name", adminSystemName, now);
}
```

Update the settings form/summary, dashboard shell prop, static metadata/favicon text, clean seeds, Prisma seed, and TypeScript data parity. Add an idempotent migration that updates `seed-store-lotus` and upserts `admin_system_name` for every store.

- [ ] **Step 4: Run focused and backend tests**

Run: `pnpm --filter @hentor/admin-web test -- app/ui/system-settings-form.test.ts app/favicon.ico/route.test.ts`

Run: `pnpm --filter @hentor/db test -- src/system-settings.test.ts`

Run: `mvn -f apps/spring-api/pom.xml -DskipTests compile`

Expected: all commands PASS.

- [ ] **Step 5: Record the dirty-worktree-safe Task 1 checkpoint**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; implementation remains unstaged so pre-existing user changes are not accidentally committed.

### Task 2: Stable Collapsed Flyout and 面单打印 Copy

**Files:**
- Modify: `apps/admin-web/app/ui/admin-shell.tsx`
- Modify: `apps/admin-web/app/ui/admin-shell.usage.test.ts`
- Modify: `apps/admin-web/app/lib/admin-navigation.ts`
- Modify: `apps/admin-web/app/lib/admin-navigation.test.ts`
- Modify: `apps/admin-web/app/dashboard-client.tsx`
- Modify: `apps/admin-web/app/dashboard-client.usage.test.ts`

**Interfaces:**
- Produces: a continuous hit area from collapsed icon to submenu and focus-visible persistence.
- Produces: user-facing label `面单打印` while preserving section `kuaidi-printers`.

- [ ] **Step 1: Add failing UI source-contract tests**

```ts
expect(source).toContain("left-full top-0 z-40 pl-3");
expect(source).toContain("group-focus-within/nav:pointer-events-auto");
expect(source).not.toContain("left-full top-0 z-40 ml-3");
expect(ADMIN_NAV_GROUPS.flatMap(group => group.items)).toContainEqual(
  expect.objectContaining({ label: "面单打印", section: "kuaidi-printers" }),
);
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm --filter @hentor/admin-web test -- app/ui/admin-shell.usage.test.ts app/lib/admin-navigation.test.ts app/dashboard-client.usage.test.ts`

Expected: FAIL on the bridge/focus and old copy.

- [ ] **Step 3: Implement the flyout bridge and labels**

Wrap the card with an absolute `pl-3` hit area and move visual card styles to its child. Add matching `group-focus-within/nav:*` classes beside hover classes. Change only user-facing labels to `面单打印`.

- [ ] **Step 4: Re-run focused tests**

Run the Step 2 command.

Expected: PASS.

- [ ] **Step 5: Record the dirty-worktree-safe Task 2 checkpoint**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; implementation remains unstaged.

### Task 3: Reject Whitespace in New Admin Usernames

**Files:**
- Create: `apps/admin-web/app/ui/admin-username-policy.ts`
- Create: `apps/admin-web/app/ui/admin-username-policy.test.ts`
- Modify: `apps/admin-web/app/ui/system-management-panel.tsx`
- Create: `apps/spring-api/src/main/java/cn/hentor/vegetables/service/AdminUsernamePolicy.java`
- Create: `apps/spring-api/src/test/java/cn/hentor/vegetables/service/AdminUsernamePolicyTest.java`
- Modify: `apps/spring-api/src/main/java/cn/hentor/vegetables/service/SystemManagementService.java`
- Modify: `packages/db/src/system-management.ts`
- Modify: `packages/db/src/system-management.test.ts`

**Interfaces:**
- Produces: `validateNewAdminUsername(value: string): string | null`.
- Produces: `AdminUsernamePolicy.normalizeForCreate(String): String`.

- [ ] **Step 1: Write failing policy tests**

```ts
expect(validateNewAdminUsername("admin user")).toBe("当前账号存在空格，请重新填写");
expect(validateNewAdminUsername("admin\tuser")).toBe("当前账号存在空格，请重新填写");
expect(validateNewAdminUsername("admin　user")).toBe("当前账号存在空格，请重新填写");
expect(validateNewAdminUsername("admin_user")).toBeNull();
```

Mirror the cases in JUnit, using `Character.isWhitespace(codePoint) || Character.isSpaceChar(codePoint)`.

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter @hentor/admin-web test -- app/ui/admin-username-policy.test.ts`

Run: `mvn -f apps/spring-api/pom.xml -Dtest=AdminUsernamePolicyTest test`

Expected: FAIL because the policy modules do not exist.

- [ ] **Step 3: Implement and wire the policies**

```ts
export function validateNewAdminUsername(value: string) {
  if (!value.trim()) return "请输入登录账号";
  return /\s/u.test(value) ? "当前账号存在空格，请重新填写" : null;
}
```

Call the policy only for `mode === "create"` in the admin form. Use the Java policy before uniqueness lookup and add the equivalent guard to the TypeScript data service.

- [ ] **Step 4: Run all focused tests**

Run both Step 2 commands plus `pnpm --filter @hentor/db test -- src/system-management.test.ts`.

Expected: PASS.

- [ ] **Step 5: Record the dirty-worktree-safe Task 3 checkpoint**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; implementation remains unstaged.

### Task 4: Spring WeChat OAuth Core and Mock Provider

**Files:**
- Create: `apps/spring-api/src/main/java/cn/hentor/vegetables/config/AdminWechatLoginProperties.java`
- Create: `apps/spring-api/src/main/java/cn/hentor/vegetables/entity/AdminWechatBindingEntity.java`
- Create: `apps/spring-api/src/main/java/cn/hentor/vegetables/mapper/AdminWechatBindingMapper.java`
- Create: `apps/spring-api/src/main/java/cn/hentor/vegetables/dto/AdminWechatStatusDto.java`
- Create: `apps/spring-api/src/main/java/cn/hentor/vegetables/dto/AdminWechatBindRequest.java`
- Create: `apps/spring-api/src/main/java/cn/hentor/vegetables/service/AdminWechatProviderClient.java`
- Create: `apps/spring-api/src/main/java/cn/hentor/vegetables/service/AdminWechatLoginService.java`
- Modify: `apps/spring-api/src/main/java/cn/hentor/vegetables/service/AdminAuthService.java`
- Modify: `apps/spring-api/src/main/java/cn/hentor/vegetables/controller/AdminAuthController.java`
- Modify: `apps/spring-api/src/main/resources/application.yml`
- Modify: `apps/spring-api/src/main/resources/schema-mysql.sql`
- Modify: `deploy/sql/init-mysql-clean.sql`
- Modify: `deploy/sql/20260710-admin-brand-wechat-login.sql`
- Modify: `packages/db/prisma/schema.prisma`
- Create: `apps/spring-api/src/test/java/cn/hentor/vegetables/service/AdminWechatLoginServiceTest.java`
- Modify: `.env.example`
- Modify: `docker-compose.yml`

**Interfaces:**
- Produces: `GET /api/spring/admin/auth/wechat/status` → `{ enabled: boolean }`.
- Produces: `GET /api/spring/admin/auth/wechat/start` → redirect to official QR OAuth or local mock callback.
- Produces: `GET /api/spring/admin/auth/wechat/callback?code&state` → session redirect or `/login?wechatBindToken=...`.
- Produces: `POST /api/spring/admin/auth/wechat/bind` with `{ bindToken, username, password }` → existing `AdminSessionDto` and session Cookie.

- [ ] **Step 1: Write failing service tests**

Cover disabled status, random single-use state, mock callback producing a bind token, bind-token single use, first binding, direct login for an existing binding, duplicate identity rejection, and disabled admin rejection.

```java
assertFalse(service.status().enabled());
assertThrows(ApiException.class, () -> service.complete("mock-code", "replayed-state"));
assertEquals("admin-1", service.bind(bindToken, "admin", "password").adminUserId());
```

- [ ] **Step 2: Run the service test and verify failure**

Run: `mvn -f apps/spring-api/pom.xml -Dtest=AdminWechatLoginServiceTest test`

Expected: FAIL because WeChat admin login classes do not exist.

- [ ] **Step 3: Add schema and secure configuration**

Add table `AdminWechatBinding` with unique `adminUserId` and `openid`, nullable indexed `unionid`, timestamps, and `lastLoginAt`. Add configuration:

```yaml
wechat:
  open:
    app-id: ${WECHAT_OPEN_APP_ID:}
    app-secret: ${WECHAT_OPEN_APP_SECRET:}
    redirect-uri: ${WECHAT_OPEN_REDIRECT_URI:}
    mock-enabled: ${WECHAT_OPEN_MOCK_ENABLED:false}
    mock-openid: ${WECHAT_OPEN_MOCK_OPENID:mock-admin-wechat}
```

- [ ] **Step 4: Implement provider and one-time flow**

Use `SessionStore` prefixes `hentor:spring:admin-wechat-state:` and `hentor:spring:admin-wechat-bind:` with five-minute TTL. In mock mode, redirect to the local callback with a fixed server-side identity; in real mode generate the official `qrconnect` URL and exchange the code only on the backend. Refactor `AdminAuthService` to expose package-private credential authentication and session issuance used by both password and WeChat flows.

- [ ] **Step 5: Add controller endpoints and safe redirects**

Set the existing HttpOnly `SameSite=Lax` admin cookie after bound login, encode only fixed login-page error messages, and never accept an arbitrary post-login redirect.

- [ ] **Step 6: Run focused tests and compile**

Run: `mvn -f apps/spring-api/pom.xml -Dtest=AdminWechatLoginServiceTest test`

Run: `mvn -f apps/spring-api/pom.xml -DskipTests compile`

Expected: PASS.

- [ ] **Step 7: Record the dirty-worktree-safe Task 4 checkpoint**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; new and modified implementation files remain unstaged.

### Task 5: Login UI for WeChat Start and First Binding

**Files:**
- Modify: `apps/admin-web/app/login/login-form.tsx`
- Modify: `apps/admin-web/app/login/page.tsx`
- Create: `apps/admin-web/app/login/wechat-login-model.ts`
- Create: `apps/admin-web/app/login/wechat-login-model.test.ts`
- Modify: `apps/admin-web/app/login/page.usage.test.ts`

**Interfaces:**
- Consumes: the four Task 4 endpoints through existing `/api/admin/:path*` rewrites.
- Produces: normal password form, configured WeChat entry, callback error state, and one-time bind form.

- [ ] **Step 1: Write failing login-state tests**

```ts
expect(resolveWechatLoginState(new URLSearchParams("wechatBindToken=abc"))).toEqual({
  mode: "bind",
  bindToken: "abc",
});
expect(resolveWechatLoginState(new URLSearchParams("wechatError=cancelled")).mode).toBe("error");
```

Add source assertions for `/api/admin/auth/wechat/status`, `/api/admin/auth/wechat/start`, and `/api/admin/auth/wechat/bind`.

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter @hentor/admin-web test -- app/login/wechat-login-model.test.ts app/login/page.usage.test.ts`

Expected: FAIL because the model and UI do not exist.

- [ ] **Step 3: Implement the UI**

Fetch public status on mount. Show `微信扫码登录` only when enabled. When a bind token is present, submit username/password plus the token to `/api/admin/auth/wechat/bind`; on success replace the route with `/`. Keep the original password form and never store credentials or bind tokens in local storage.

- [ ] **Step 4: Run focused tests and build**

Run: `pnpm --filter @hentor/admin-web test -- app/login/wechat-login-model.test.ts app/login/page.usage.test.ts`

Run: `pnpm --filter @hentor/admin-web build`

Expected: PASS.

- [ ] **Step 5: Record the dirty-worktree-safe Task 5 checkpoint**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; implementation remains unstaged.

### Task 6: Integrated Verification and Simulated Browser Acceptance

**Files:**
- Modify only if verification exposes a scoped defect.
- Update: `docs/superpowers/plans/2026-07-10-admin-brand-navigation-wechat-login.md` checkboxes as tasks complete.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: evidence for automated, build, browser, and migration readiness.

- [ ] **Step 1: Run repository-focused verification**

Run:

```bash
pnpm --filter @hentor/admin-web test
pnpm --filter @hentor/admin-web typecheck
pnpm --filter @hentor/admin-web build
pnpm --filter @hentor/db test
mvn -f apps/spring-api/pom.xml test
git diff --check
```

Expected: all commands PASS; unrelated pre-existing failures, if any, are recorded with exact evidence and do not get hidden.

- [ ] **Step 2: Start the local mock stack**

Use a non-secret local configuration:

```bash
WECHAT_OPEN_MOCK_ENABLED=true WECHAT_OPEN_MOCK_OPENID=mock-admin-wechat pnpm dev:spring
pnpm dev:admin
```

Expected: Spring listens on `8080`, Next listens on its configured local port, and `/api/admin/auth/wechat/status` returns enabled.

- [ ] **Step 3: Browser-check the original requests**

Verify `HanYang Fresh`, `涵养总店`, stable collapsed flyout click navigation, create-user whitespace message, and `面单打印` on the live page.

- [ ] **Step 4: Browser-check the simulated WeChat flow**

Click `微信扫码登录`; mock callback returns to the binding state. Bind with an existing active admin account, confirm entry to the workbench, log out, click WeChat login again, and confirm direct login without a second password prompt.

- [ ] **Step 5: Check security and deployment artifacts**

Confirm `AppSecret`, access tokens, passwords, codes, and bind tokens are absent from `git diff`, logs, browser storage, and response JSON. Validate the migration with `git diff --check -- deploy/sql/20260710-admin-brand-wechat-login.sql` and prepare test-environment commands without executing real WeChat OAuth.

If verification exposes a defect, return it to the owning task, repeat that task's failing test and implementation cycle, and use that task's exact file list for the fix commit. If no files change, do not create an empty commit.
