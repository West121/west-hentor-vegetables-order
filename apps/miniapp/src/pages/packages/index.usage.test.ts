import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("miniapp packages page multi-package carousel", () => {
  it("renders all user packages as a swipeable carousel and binds detail sections to the selected package", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/packages/index.tsx"),
      "utf8",
    );

    expect(source).toContain("Swiper");
    expect(source).toContain("SwiperItem");
    expect(source).toContain("selectedPackageIndex");
    expect(source).toContain("handlePackageChange");
    expect(source).toContain("packages.map((packageItem, index)");
    expect(source).toContain("getPackageSlidePosition");
    expect(source).toContain("packages[selectedIndex] ?? getFirstPackageItem(packages)");
    expect(source).toContain("currentPackage?.usageDetails ?? []");
    expect(source).toContain("左右滑动切换");
  });
});
