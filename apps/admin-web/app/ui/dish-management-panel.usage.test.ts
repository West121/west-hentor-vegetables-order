import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("dish management modal usage", () => {
  it("opens dish detail in the shared draggable modal without entering edit mode", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/dish-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("Eye");
    expect(source).toContain('mode: "detail"');
    expect(source).toContain("openDetailModal");
    expect(source).toContain('title="查看详情"');
    expect(source).toContain("菜品详情");
    expect(source).toContain('modal.mode !== "detail"');
  });

  it("shows dish image upload limits and keeps client-side validation aligned with the API", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/dish-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("支持 JPG、PNG、WebP、AVIF");
    expect(source).toContain("单张不超过 3MB");
    expect(source).toContain("DISH_IMAGE_MAX_SIZE = 3 * 1024 * 1024");
    expect(source).toContain(
      'DISH_IMAGE_ACCEPT = "image/avif,image/jpeg,image/png,image/webp"',
    );
  });

  it("hides store-facing copy while keeping store scope internal", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/dish-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("菜品列表");
    expect(source).toContain("维护菜品、图片、库存和上下架状态");
    expect(source).not.toContain("未选择门店");
    expect(source).not.toContain("当前门店还没有菜品");
    expect(source).not.toContain("按门店维护");
  });

  it("adds quick shelf actions in the list and keeps edit inventory readonly", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/dish-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("toggleDishStatus");
    expect(source).toContain("已上架");
    expect(source).toContain("已下架");
    expect(source).toContain("快捷下架");
    expect(source).toContain("快捷上架");
    expect(source).toContain("PowerOff");
    expect(source).toContain("Power");
    expect(source).toContain("aria-label=");
    expect(source).not.toContain(' ? "下架"');
    expect(source).not.toContain(' : "上架"');
    expect(source).toContain('stockJin: modal.mode === "edit"');
    expect(source).toContain('readOnly={modal.mode !== "create"}');
    expect(source).toContain("库存请通过列表");
  });

  it("validates inventory adjustment before submitting", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/dish-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("请输入有效的库存调整斤数");
    expect(source).toContain("库存不能调整为负数");
    expect(source).toContain("请输入库存调整原因");
    expect(source).toContain("const reason = inventoryForm.reason.trim()");
    expect(source).toContain("changeJin,");
    expect(source).toContain("reason,");
  });

  it("uses system dictionary category options instead of hard-coded category labels", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/dish-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("categoryOptions?: DishCategoryOption[]");
    expect(source).toContain("resolvedCategoryOptions");
    expect(source).toContain("categoryLabelByCode");
    expect(source).not.toContain("CATEGORY_LABELS");
  });
});
