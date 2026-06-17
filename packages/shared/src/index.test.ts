import { describe, expect, it } from "vitest";

import { calculateReservationSummary, storeCodeSchema } from "./index";

describe("storeCodeSchema", () => {
  it("accepts franchise store codes", () => {
    expect(storeCodeSchema.parse("lotus-garden")).toBe("lotus-garden");
  });

  it("rejects uppercase store codes", () => {
    expect(() => storeCodeSchema.parse("LotusGarden")).toThrow();
  });
});

describe("calculateReservationSummary", () => {
  it("returns the selected total and remaining package weight once", () => {
    expect(
      calculateReservationSummary(
        [
          { dishId: "spinach", name: "菠菜", weightJin: 1 },
          { dishId: "cucumber", name: "黄瓜", weightJin: 1.5 },
        ],
        8,
      ),
    ).toEqual({
      totalWeightJin: 2.5,
      remainingWeightJin: 5.5,
      isOverLimit: false,
      itemCount: 2,
    });
  });

  it("flags orders that exceed the package limit", () => {
    expect(
      calculateReservationSummary(
        [{ dishId: "spinach", name: "菠菜", weightJin: 8.5 }],
        8,
      ).isOverLimit,
    ).toBe(true);
  });
});
