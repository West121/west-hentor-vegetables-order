import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("miniapp home page layout contract", () => {
  it("renders selectable package benefits inside the dish card grid", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "src/pages/home/index.tsx"),
      "utf8",
    );
    const styleSource = readFileSync(
      join(process.cwd(), "src/pages/home/index.scss"),
      "utf8",
    );

    expect(pageSource).toContain("selectablePackageBenefits");
    expect(pageSource).toContain("changePackageBenefit");
    expect(pageSource).toContain("benefit-card");
    expect(pageSource).toContain("benefit-card__icon");
    expect(pageSource).toContain("egg.png");
    expect(pageSource).toContain("getBenefitImage");
    expect(pageSource).toContain("editableBenefitQuantityByPackageId");
    expect(pageSource).not.toContain("benefit-selector");
    expect(pageSource).not.toContain(
      "!isEditingCurrentOrder && selectablePackageBenefits",
    );
    expect(styleSource).toContain(".benefit-card__icon");
  });

  it("renders confirmation selected items as read-only home-style cards", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/home/index.tsx"),
      "utf8",
    );

    expect(source).not.toContain('className="confirm-summary"');
    expect(source).not.toContain("变化明细");
    expect(source).toContain("dish-card--readonly");
    expect(source).toContain("confirm-dish-card");
    expect(source).toContain("dish-card__readonly-weight");
    expect(source).toContain("confirmationView.benefits.map");
    expect(source).not.toContain("confirm-benefits");
  });
});
