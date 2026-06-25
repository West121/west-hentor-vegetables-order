import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("package template management modal usage", () => {
  it("opens package template detail in the shared draggable modal without entering edit mode", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/package-template-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("Eye");
    expect(source).toContain('mode: "detail"');
    expect(source).toContain("openDetailModal");
    expect(source).toContain('title="查看详情"');
    expect(source).toContain("套餐模板详情");
    expect(source).toContain('modal.mode !== "detail"');
    expect(source).toContain('readOnly={modal.mode === "detail"}');
    expect(source).toContain('disabled={modal.mode === "detail"}');
  });

  it("generates additional benefit kind codes instead of asking admins to type them", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/package-template-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("generateBenefitKind");
    expect(source).toContain("benefitKindPreview");
    expect(source).toContain("kind: generateBenefitKind");
    expect(source).toContain("类型编码");
    expect(source).not.toContain('updateBenefit(index, "kind"');
  });

  it("wraps package benefit fields inside the modal instead of overflowing action buttons", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/package-template-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain(
      "grid-cols-[repeat(auto-fit,minmax(112px,1fr))]",
    );
    expect(source).not.toContain("xl:grid-cols-[minmax");
    expect(source).not.toContain("xl:col-span-1");
  });

  it("normalizes numeric fields so leading zeroes are not kept in the modal", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/package-template-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("normalizeIntegerInputText");
    expect(source).toContain("normalizeDecimalInputText");
    expect(source).toContain("normalizeDecimalInputNumber");
    expect(source).toContain('inputMode="decimal"');
    expect(source).toContain('value={formatBenefitQuantity(benefit.totalQuantity)}');
    expect(source).toContain('value={String(benefit.sortOrder)}');
  });

  it("supports file upload import with xlsx template download", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/package-template-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("导入套餐模板");
    expect(source).toContain("套餐模板导入模板.xlsx");
    expect(source).toContain("/api/admin/package-templates/import");
    expect(source).toContain("AdminImportDialog");
    expect(source).toContain("downloadXlsxTemplate");
    expect(source).toContain("附加权益类型编码由系统自动生成");
  });
});
