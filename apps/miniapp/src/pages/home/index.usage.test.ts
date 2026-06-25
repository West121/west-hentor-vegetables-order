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

  it("renders confirmation selected items as readable compact rows", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/home/index.tsx"),
      "utf8",
    );

    expect(source).not.toContain('className="confirm-summary"');
    expect(source).not.toContain("变化明细");
    expect(source).toContain("confirm-dish-list");
    expect(source).toContain("confirm-dish-item");
    expect(source).toContain("confirm-item__name");
    expect(source).toContain("confirm-item__weight");
    expect(source).toContain("confirmationView.benefits.map");
    expect(source).not.toContain("confirm-benefits");
  });

  it("keeps compact phones from overlapping cutoff and quantity controls", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/home/index.scss"),
      "utf8",
    );
    const cutoffBlock = source.match(
      /\.package-card__cutoff\s*\{[\s\S]*?\n\}/,
    )?.[0];
    const threeColumnCardBlock = source.match(
      /\.dish-grid--cols-3 \.dish-card\s*\{[\s\S]*?\n\}/,
    )?.[0];
    const fourColumnCardBlock = source.match(
      /\.dish-grid--cols-4 \.dish-card\s*\{[\s\S]*?\n\}/,
    )?.[0];

    expect(cutoffBlock).toBeTruthy();
    expect(cutoffBlock).not.toContain("position: absolute");
    expect(cutoffBlock).not.toContain("top:");
    expect(cutoffBlock).not.toContain("right:");
    expect(threeColumnCardBlock).toContain("--dish-step-size: 24px;");
    expect(fourColumnCardBlock).toContain("--dish-step-size: 20px;");
    expect(fourColumnCardBlock).toContain("--dish-weight-slot: 28px;");
    expect(source).toContain("place-items: center;");
  });

  it("uses runtime system settings for dish columns instead of build-time env", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/home/index.tsx"),
      "utf8",
    );

    expect(source).toContain("homeData?.store.homeDishColumns");
    expect(source).toContain("dish-grid--cols-${homeDishColumns}");
    expect(source).not.toContain("TARO_APP_HOME_DISH_COLUMNS");
  });

  it("keeps home submission as create-only and prompts when today already has an order", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/home/index.tsx"),
      "utf8",
    );

    expect(source).toContain("今天已有订单");
    expect(source).toContain("仍然提交");
    expect(source).toContain("去修改");
    expect(source).toContain("MiniConfirmModal");
    expect(source).toContain("showConfirmDialog");
    expect(source).not.toContain("去订单修改");
    expect(source).toContain("提交订单");
    expect(source).toContain("Taro.removeStorageSync(\"editing_order_id\")");
    expect(source).toContain("pages/order-edit/index");
    expect(source).not.toContain("Taro.setStorageSync(\"editing_order_id\"");
    expect(source).not.toContain("switchTab({ url: \"/pages/home/index\" })");
    expect(source).not.toContain("Taro.showModal");
  });
});
