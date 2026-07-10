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
    expect(source).toContain('data-icon="inline-start"');
    expect(source).toContain("查看");
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
    expect(source).toContain("预订可用量由任务配置中的菜品总重量决定");
    expect(source).not.toContain("未选择门店");
    expect(source).not.toContain("当前门店还没有菜品");
    expect(source).not.toContain("按门店维护");
  });

  it("adds quick shelf actions in the list and removes inventory adjustment entry", () => {
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
    expect(source).toContain("下架");
    expect(source).toContain("上架");
    expect(source).toContain("aria-label=");
    expect(source).not.toContain("openInventoryModal");
    expect(source).not.toContain("/inventory");
    expect(source).not.toContain("库存调整");
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

  it("supports file upload import with xlsx template download", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/dish-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("导入菜品");
    expect(source).toContain("菜品导入模板.xlsx");
    expect(source).toContain("/api/admin/dishes/import");
    expect(source).toContain("AdminImportDialog");
    expect(source).toContain("downloadXlsxTemplate");
    expect(source).toContain("菜品可用总重量请在任务配置中维护");
  });
});
