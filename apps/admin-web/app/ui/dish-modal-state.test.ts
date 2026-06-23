import { describe, expect, it } from "vitest";

import {
  buildDishFormState,
  buildInventoryFormState,
  hasUnsavedDishModalChanges,
  hasUnsavedInventoryModalChanges,
} from "./dish-modal-state";

const dish = {
  category: "LEAFY",
  description: "清炒口感好",
  imageKey: "dishes/spinach.png",
  imageUrl: "https://example.com/spinach.png",
  name: "菠菜",
  sortOrder: 10,
  status: "ON_SALE",
  stepJin: 0.5,
  stockJin: 20,
} as const;

describe("dish modal dirty state", () => {
  it("does not mark unchanged dish and inventory forms as dirty", () => {
    expect(
      hasUnsavedDishModalChanges({
        current: buildDishFormState(dish),
        initial: buildDishFormState(dish),
      }),
    ).toBe(false);

    expect(
      hasUnsavedInventoryModalChanges({
        current: buildInventoryFormState(),
        initial: buildInventoryFormState(),
      }),
    ).toBe(false);
  });

  it("marks dish content, image and inventory changes as dirty", () => {
    const dishInitial = buildDishFormState(dish);
    const inventoryInitial = buildInventoryFormState();

    expect(
      hasUnsavedDishModalChanges({
        current: { ...dishInitial, name: "有机菠菜" },
        initial: dishInitial,
      }),
    ).toBe(true);
    expect(
      hasUnsavedDishModalChanges({
        current: { ...dishInitial, imageUrl: "https://example.com/new.png" },
        initial: dishInitial,
      }),
    ).toBe(true);
    expect(
      hasUnsavedInventoryModalChanges({
        current: { ...inventoryInitial, changeJin: "5" },
        initial: inventoryInitial,
      }),
    ).toBe(true);
    expect(
      hasUnsavedInventoryModalChanges({
        current: { ...inventoryInitial, reason: "补货入库" },
        initial: inventoryInitial,
      }),
    ).toBe(true);
  });
});
