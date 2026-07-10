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

  it("shows the member phone on the package card without masking it", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "src/pages/home/index.tsx"),
      "utf8",
    );
    const styleSource = readFileSync(
      join(process.cwd(), "src/pages/home/index.scss"),
      "utf8",
    );

    expect(pageSource).toContain("homeData?.member?.phone?.trim()");
    expect(pageSource).toContain('className="package-card__member-phone"');
    expect(pageSource).not.toContain("package-card__member-label");
    expect(pageSource).not.toContain("maskPhone(homeData?.member?.phone");
    expect(styleSource).toContain(".package-card__member-phone");
    expect(styleSource).toContain("display: inline-flex;");
    expect(styleSource).toContain("flex: 0 0 auto;");
    expect(styleSource).toContain("max-width: 118px;");
    expect(styleSource).not.toContain(".package-card__member-label");
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

  it("keeps home submission as create-only and prompts once when selecting after an existing order", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/home/index.tsx"),
      "utf8",
    );

    expect(source).toContain("今天已有订单");
    expect(source).toContain("再来一单");
    expect(source).toContain("去修改");
    expect(source).toContain("confirmExistingOrderBeforeSelection");
    expect(source).toContain("existingOrderSelectionPromptShownRef");
    expect(source).toContain("MiniConfirmModal");
    expect(source).toContain("showConfirmDialog");
    expect(source).toContain("await confirmExistingOrderBeforeSelection()");
    expect(source).not.toContain("去订单修改");
    expect(source).not.toContain("仍然提交");
    expect(source).toContain("提交订单");
    expect(source).toContain("Taro.removeStorageSync(\"editing_order_id\")");
    expect(source).toContain("pages/order-edit/index");
    expect(source).not.toContain("Taro.setStorageSync(\"editing_order_id\"");
    expect(source).not.toContain("switchTab({ url: \"/pages/home/index\" })");
    expect(source).not.toContain("Taro.showModal");
  });

  it("preserves selected dishes when switching or adding an address", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/home/index.tsx"),
      "utf8",
    );

    expect(source).toContain("preserveSelection?: boolean");
    expect(source).toContain("if (!options?.preserveSelection)");
    expect(source).toContain("loadHome({ preserveSelection: true, quiet: true })");
  });

  it("loads homepage content without forcing phone login on first open", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/home/index.tsx"),
      "utf8",
    );

    expect(source).toContain("requestHomeData");
    expect(source).toContain("getStoredMiniSessionToken");
    expect(source).toContain("isUnauthorizedMiniResponse");
    expect(source).toContain("memberInfo: homeData ? homeData.member : undefined");
    expect(source).not.toContain("payload.error?.code === \"UNAUTHORIZED\"");
  });
});
