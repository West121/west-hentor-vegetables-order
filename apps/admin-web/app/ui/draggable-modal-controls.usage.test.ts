import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const draggableModalPanels = [
  "dish-management-panel.tsx",
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
    /:\s*"absolute left-1\/2 top-20 flex h-\[\d+vh\] w-\[min\(\d+px,calc\(100vw-48px\)\)\] -translate-x-1\/2 resize/,
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
  it("keeps every management modal draggable, fullscreen-capable and resizable", () => {
    for (const fileName of draggableModalPanels) {
      const source = readFileSync(
        join(process.cwd(), "app/ui", fileName),
        "utf8",
      );

      expect(source, fileName).toContain("const [fullscreen, setFullscreen]");
      expect(source, fileName).toContain("Maximize2");
      expect(source, fileName).toContain("Minimize2");
      expect(source, fileName).toContain('aria-modal="true"');
      expect(source, fileName).toContain('role="dialog"');
      expectResizableModalContainer(source, fileName);
      expect(source, fileName).toContain("translate(");
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

      expect(source, fileName).toContain("onPointerDown={handleHeaderPointerDown}");
      expect(source, fileName).toContain(
        "onPointerDown={(event) => event.stopPropagation()}",
      );
    }
  });
});
