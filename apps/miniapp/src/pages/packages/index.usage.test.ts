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

  it("uses the same configurable brand name as the login/home settings instead of hardcoding Hentor Fresh", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/packages/index.tsx"),
      "utf8",
    );

    expect(source).toContain("buildStoreSettingsUrl");
    expect(source).toContain('useState("Hentor Fresh")');
    expect(source).toContain("setBrandName(settingsResponse.data.data.loginTitle)");
    expect(source).toContain("brandName={brandName}");
    expect(source).not.toContain('<View className="hero-card__brand">Hentor Fresh</View>');
  });
});
