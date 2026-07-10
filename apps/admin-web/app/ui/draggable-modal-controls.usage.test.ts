import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const draggableModalPanels = [
  "delivery-range-panel.tsx",
  "dish-management-panel.tsx",
  "kuaidi-printer-management-panel.tsx",
  "member-management-panel.tsx",
  "order-management-panel.tsx",
  "package-management-panel.tsx",
  "package-template-management-panel.tsx",
  "store-management-panel.tsx",
  "system-management-panel.tsx",
  "system-settings-panel.tsx",
  "task-management-panel.tsx",
];

function expectResizableModalContainer(source: string, fileName: string) {
  const modalContainerPatterns = [
    /:\s*"h-\[\d+vh\] w-\[\d+px\] max-w-full resize"/,
    /:\s*"h-\[\d+vh\] max-w-4xl resize"/,
    /:\s*"absolute left-1\/2 top-20 flex h-\[\d+vh\] w-\[min\(\d+px,calc\(100vw-48px\)\)\] -translate-x-1\/2 resize/,
    /heightClassName = "h-\[\d+vh\]"/,
  ];

  expect(
    modalContainerPatterns.some((pattern) => pattern.test(source)),
    `${fileName} must put resize on the modal shell, not only on textareas`,
  ).toBe(true);
  expect(source, fileName).toMatch(
    /overflow-hidden[^\n"]*rounded-2xl[^\n"]*bg-white[^\n"]*shadow-2xl/,
  );
}

describe("draggable admin modal controls", () => {
  it("centralizes draggable fullscreen modal behavior in a shared component", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/admin-draggable-modal.tsx"),
      "utf8",
    );

    expect(source).toContain("export function AdminDraggableModal");
    expect(source).toContain("const [fullscreen, setFullscreen] = useState(true)");
    expect(source).toContain("Maximize2");
    expect(source).toContain("Minimize2");
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('role="dialog"');
    expectResizableModalContainer(source, "admin-draggable-modal.tsx");
    expect(source).toContain("translate(");
    expect(source).toContain("createAdminModalDragState");
    expect(source).toContain("getBoundedAdminModalOffset");
    expect(source).toContain("data-admin-modal-shell");
    expect(source).toContain("data-admin-modal-drag-handle");
    expect(source).toContain("setPointerCapture(event.pointerId)");
    expect(source).toContain("releasePointerCapture(event.pointerId)");
    expect(source).toContain("onPointerDown={handleHeaderPointerDown}");
    expect(source).toContain("onPointerCancel={handleHeaderPointerUp}");
    expect(source).toContain('title={fullscreen ? "退出全屏" : "全屏"}');
    expect(source).toContain(
      "onPointerDown={(event) => event.stopPropagation()}",
    );
  });

  it("keeps every management modal draggable, fullscreen-capable and resizable", () => {
    for (const fileName of draggableModalPanels) {
      const source = readFileSync(
        join(process.cwd(), "app/ui", fileName),
        "utf8",
      );

      if (source.includes("AdminDraggableModal")) {
        expect(source, fileName).toContain("AdminDraggableModal");
        continue;
      }

      expect(source, fileName).toContain("const [fullscreen, setFullscreen] = useState(true)");
      expect(source, fileName).toContain("Maximize2");
      expect(source, fileName).toContain("Minimize2");
      expect(source, fileName).toContain('aria-modal="true"');
      expect(source, fileName).toContain('role="dialog"');
      expectResizableModalContainer(source, fileName);
      expect(source, fileName).toContain("translate(");
      expect(source, fileName).toContain("createAdminModalDragState");
      expect(source, fileName).toContain("getBoundedAdminModalOffset");
      expect(source, fileName).toContain("data-admin-modal-shell");
      expect(source, fileName).toContain("data-admin-modal-drag-handle");
      expect(source, fileName).toContain("setPointerCapture(event.pointerId)");
      expect(source, fileName).toContain("releasePointerCapture(event.pointerId)");
      expect(source, fileName).toContain("onPointerDown={handleHeaderPointerDown}");
      expect(source, fileName).toContain("onPointerCancel={handleHeaderPointerUp}");
      expect(source, fileName).toContain('title={fullscreen ? "退出全屏" : "全屏"}');
      expect(source, fileName).not.toContain(">全屏<");
      expect(source, fileName).not.toContain(">全<");
    }
  });

  it("prevents header action buttons from starting a drag interaction", () => {
    for (const fileName of draggableModalPanels) {
      const source = readFileSync(
        join(process.cwd(), "app/ui", fileName),
        "utf8",
      );

      if (source.includes("AdminDraggableModal")) {
        expect(source, fileName).toContain("AdminDraggableModal");
        continue;
      }

      expect(source, fileName).toContain("onPointerDown={handleHeaderPointerDown}");
      expect(source, fileName).toContain(
        "onPointerDown={(event) => event.stopPropagation()}",
      );
    }
  });

  it("hides the drag affordance while a modal is fullscreen", () => {
    const source = readFileSync(
      join(process.cwd(), "app/globals.css"),
      "utf8",
    );

    expect(source).toContain(
      '[data-admin-modal-shell][data-fullscreen="true"] [data-admin-modal-drag-handle]',
    );
    expect(source).toContain("cursor: default !important");
  });

  it("makes fullscreen admin modals occupy the whole viewport", () => {
    const source = readFileSync(
      join(process.cwd(), "app/globals.css"),
      "utf8",
    );

    expect(source).toContain('[data-admin-modal-shell][data-fullscreen="true"]');
    expect(source).toContain("position: fixed !important");
    expect(source).toContain("inset: 0 !important");
    expect(source).toContain("width: 100vw !important");
    expect(source).toContain("max-width: 100vw !important");
    expect(source).toContain("height: 100vh !important");
    expect(source).toContain("max-height: 100vh !important");
    expect(source).toContain("min-height: 100vh !important");
    expect(source).toContain("margin: 0 !important");
    expect(source).toContain("border-width: 0 !important");
    expect(source).toContain("border-radius: 0 !important");
    expect(source).toContain("resize: none !important");
    expect(source).toContain("transform: none !important");
  });

  it("locks the page scroll and keeps scrolling inside the active modal", () => {
    const source = readFileSync(
      join(process.cwd(), "app/globals.css"),
      "utf8",
    );

    expect(source).toContain('body:has([aria-modal="true"])');
    expect(source).toContain("overflow: hidden");
    expect(source).toContain("[aria-modal=\"true\"]");
    expect(source).toContain("overscroll-behavior: contain");
    expect(source).toContain("[data-admin-modal-shell]");
    expect(source).toContain("max-height: calc(100vh - 40px)");
  });

  it("keeps list headers on one line and lets list tables overflow horizontally", () => {
    const source = readFileSync(
      join(process.cwd(), "app/globals.css"),
      "utf8",
    );

    expect(source).toContain(".admin-shell-main table th");
    expect(source).toContain("white-space: nowrap");
    expect(source).toContain(".admin-shell-main table");
    expect(source).toContain("min-width: max-content");
  });

  it("uses compact global spacing for admin table rows", () => {
    const source = readFileSync(
      join(process.cwd(), "app/globals.css"),
      "utf8",
    );

    expect(source).toContain("padding-top: 0.375rem !important");
    expect(source).toContain("padding-bottom: 0.375rem !important");
    expect(source).toContain('[class~="h-14"][class~="w-14"]');
    expect(source).toContain('[data-slot="button"]');
    expect(source).toContain("height: 2rem !important");
  });

  it("uses compact spacing rules inside admin modal forms", () => {
    const source = readFileSync(
      join(process.cwd(), "app/globals.css"),
      "utf8",
    );

    expect(source).toContain('[data-admin-modal-shell] [class~="px-6"]');
    expect(source).toContain('[data-admin-modal-shell] [class~="py-4"]');
    expect(source).toContain('[data-admin-modal-shell] [class~="p-6"]');
    expect(source).toContain('[data-admin-modal-shell] [class~="p-5"]');
    expect(source).toContain('[data-admin-modal-shell] [class~="p-4"]');
    expect(source).toContain('[data-admin-modal-shell] [class~="gap-6"]');
    expect(source).toContain('[data-admin-modal-shell] [class~="gap-5"]');
    expect(source).toContain('[data-admin-modal-shell] [class~="gap-4"]');
    expect(source).toContain('[data-admin-modal-shell] [class~="space-y-8"]');
    expect(source).toContain('[data-admin-modal-shell] [class~="space-y-6"]');
    expect(source).toContain('input:not([type="checkbox"])');
    expect(source).toContain(':not([type="radio"])');
    expect(source).toContain(':not([type="file"])');
    expect(source).toContain('button[role="combobox"]');
    expect(source).toContain("height: 2.25rem !important");
    expect(source).toContain("min-height: 2.25rem !important");
    expect(source).toContain("min-height: 4rem !important");
    expect(source).toContain(".admin-shell-main table th,");
    expect(source).toContain("padding-top: 0.375rem !important");
  });

  it("applies the compact modal shell to shared import and role dialogs too", () => {
    for (const fileName of ["admin-import-dialog.tsx", "role-management-panel.tsx"]) {
      const source = readFileSync(
        join(process.cwd(), "app/ui", fileName),
        "utf8",
      );

      expect(source, fileName).toContain("data-admin-modal-shell");
      expect(source, fileName).toContain('aria-modal="true"');
      expect(source, fileName).toContain('role="dialog"');
    }
  });
});
