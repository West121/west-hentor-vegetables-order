# Collapsed Sidebar Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep six first-level icons in the collapsed sidebar, expose every accessible child icon in a viewport-safe flyout, and add polished Motion animations to collapse, expand, and flyout transitions.

**Architecture:** `AdminShell` remains the owner of navigation state and trigger geometry. A focused `AdminCollapsedFlyout` component renders the active group with Motion and measures itself before clamping its top position through a pure positioning helper. Nginx, routes, permissions, backend APIs, and stored layout preferences remain unchanged.

**Tech Stack:** React 19, Next.js 16, TypeScript, Tailwind CSS, Vitest, Motion for React (`motion/react`).

## Global Constraints

- Collapsed sidebar width remains `72px`; expanded vertical sidebar width remains `220px`.
- Keep exactly one collapsed flyout open at a time.
- The pointer must be able to move from trigger to flyout without the menu disappearing.
- Flyouts keep at least `12px` from viewport top and bottom and scroll internally when necessary.
- Animation duration stays between `180ms` and `220ms` and respects reduced-motion user preferences.
- Do not change route parameters, permissions, backend APIs, or database data.

---

### Task 1: Viewport-safe flyout positioning

**Files:**
- Create: `apps/admin-web/app/ui/admin-collapsed-flyout-position.ts`
- Create: `apps/admin-web/app/ui/admin-collapsed-flyout-position.test.ts`

**Interfaces:**
- Produces: `getCollapsedFlyoutTop(anchorTop: number, flyoutHeight: number, viewportHeight: number, edgeGap?: number): number`

- [ ] **Step 1: Write the failing positioning tests**

```ts
expect(getCollapsedFlyoutTop(120, 200, 800)).toBe(120);
expect(getCollapsedFlyoutTop(2, 200, 800)).toBe(12);
expect(getCollapsedFlyoutTop(760, 320, 800)).toBe(468);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm --dir apps/admin-web exec vitest run app/ui/admin-collapsed-flyout-position.test.ts`

Expected: FAIL because the positioning module does not exist.

- [ ] **Step 3: Implement the pure clamp helper**

```ts
export function getCollapsedFlyoutTop(anchorTop, flyoutHeight, viewportHeight, edgeGap = 12) {
  const maximumTop = Math.max(edgeGap, viewportHeight - flyoutHeight - edgeGap);
  return Math.min(Math.max(anchorTop, edgeGap), maximumTop);
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `pnpm --dir apps/admin-web exec vitest run app/ui/admin-collapsed-flyout-position.test.ts`

Expected: 3 tests pass.

### Task 2: Motion flyout and animated sidebar

**Files:**
- Create: `apps/admin-web/app/ui/admin-collapsed-flyout.tsx`
- Modify: `apps/admin-web/app/ui/admin-shell.tsx`
- Modify: `apps/admin-web/app/ui/admin-shell.usage.test.ts`
- Modify: `apps/admin-web/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `getCollapsedFlyoutTop(...)` from Task 1.
- Produces: `AdminCollapsedFlyout` with `anchorLeft`, `anchorTop`, `label`, `onMouseEnter`, `onMouseLeave`, and `children` props.

- [ ] **Step 1: Extend the usage test for Motion and a single global flyout**

```ts
expect(source).toContain('from "motion/react"');
expect(source).toContain("AdminCollapsedFlyout");
expect(source).toContain("openCollapsedGroup");
expect(source).toContain("scheduleCollapsedGroupClose");
expect(source).not.toContain("group-focus-within/nav");
```

- [ ] **Step 2: Run the usage test and verify RED**

Run: `pnpm --dir apps/admin-web exec vitest run app/ui/admin-shell.usage.test.ts`

Expected: FAIL because Motion and the global measured flyout are not implemented.

- [ ] **Step 3: Install Motion**

Run: `pnpm --dir apps/admin-web add motion`

Expected: `motion` appears in the admin-web dependencies and lockfile.

- [ ] **Step 4: Implement the measured flyout**

Use `useLayoutEffect` to measure the rendered panel, call `getCollapsedFlyoutTop`, apply `maxHeight: calc(100vh - 24px)`, and animate with:

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.98, x: 6 }}
  animate={{ opacity: 1, scale: 1, x: 0 }}
  exit={{ opacity: 0, scale: 0.98, x: 4 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
/>
```

- [ ] **Step 5: Replace per-group hidden flyouts with one active flyout**

Store the active group label and trigger rectangle in one state object. Open on hover/focus, delay close by `120ms`, cancel the timer when the pointer enters the flyout, close on click, layout change, sidebar expansion, and `Escape`.

- [ ] **Step 6: Animate the sidebar**

Wrap the shell in `MotionConfig reducedMotion="user"`, use `motion.aside` for `72px ↔ 220px`, and animate the collapse icon and flyout through `AnimatePresence mode="wait"`.

- [ ] **Step 7: Run related tests and build**

Run:

```bash
pnpm --dir apps/admin-web exec vitest run app/ui/admin-collapsed-flyout-position.test.ts app/ui/admin-shell.usage.test.ts
pnpm --dir apps/admin-web build
```

Expected: related tests pass and Next.js production build completes.

### Task 3: Publish and runtime verification

**Files:**
- Modify only generated local build output; deploy artifacts to existing test and production application directories.

**Interfaces:**
- Consumes: successful Task 2 standalone Next.js build.
- Produces: live test `8202` and production `8102` admin frontends.

- [ ] **Step 1: Commit and push source changes**

```bash
git add apps/admin-web pnpm-lock.yaml docs/superpowers/plans/2026-07-10-collapsed-sidebar-motion.md
git commit -m "feat: animate collapsed sidebar navigation"
git push origin main
```

- [ ] **Step 2: Deploy the same frontend artifact to test and production**

Replace only `frontend/apps/admin-web` under `/opt/hentor-vegetables` and `/opt/hentor-vegetables-prod`, preserving timestamped backups. Restart only the two Next.js processes.

- [ ] **Step 3: Verify live behavior**

Check both admin entry points return HTTP 200. In a production browser session, collapse the sidebar, hover System Management, confirm all child items are visible within the viewport, move into the flyout and click a child route, then expand the sidebar and confirm the width/text transition is smooth.

