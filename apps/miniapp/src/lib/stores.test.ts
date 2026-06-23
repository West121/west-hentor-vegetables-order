import { describe, expect, it } from "vitest";

import {
  buildMiniappMeUrl,
  buildStoreSettingsUrl,
  getActiveStoreCode,
  getStoreSwitchToast,
  resolveLaunchStoreCode,
  shouldShowStoreSwitcher,
} from "./stores";

describe("miniapp store helpers", () => {
  it("uses stored active store code before the build-time fallback", () => {
    expect(getActiveStoreCode(" osmanthus-yard ", "lotus-garden")).toBe(
      "osmanthus-yard",
    );
    expect(getActiveStoreCode("", "lotus-garden")).toBe("lotus-garden");
    expect(getActiveStoreCode(undefined, "lotus-garden")).toBe("lotus-garden");
  });

  it("only shows the switcher when more than one store is available", () => {
    expect(shouldShowStoreSwitcher([{ id: "store-1" }])).toBe(false);
    expect(shouldShowStoreSwitcher([{ id: "store-1" }, { id: "store-2" }])).toBe(
      true,
    );
  });

  it("builds short switch feedback for miniapp toasts", () => {
    expect(getStoreSwitchToast("莲花小区加盟店")).toBe("服务已切换");
    expect(getStoreSwitchToast("")).toBe("服务已切换");
  });

  it("builds encoded store-scoped public urls", () => {
    expect(
      buildStoreSettingsUrl({
        apiBaseUrl: "http://127.0.0.1:3000",
        storeCode: "lotus/garden",
      }),
    ).toBe(
      "http://127.0.0.1:3000/api/v1/stores/settings?storeCode=lotus%2Fgarden",
    );
    expect(
      buildMiniappMeUrl({
        apiBaseUrl: "http://127.0.0.1:3000",
        storeCode: "lotus/garden",
      }),
    ).toBe("http://127.0.0.1:3000/api/v1/me?storeCode=lotus%2Fgarden");
  });

  it("prefers explicit launch store code query params", () => {
    expect(
      resolveLaunchStoreCode({
        scene: "storeCode%3Dosmanthus-yard",
        storeCode: " lotus-garden ",
      }),
    ).toBe("lotus-garden");
    expect(resolveLaunchStoreCode({ store: "osmanthus-yard" })).toBe(
      "osmanthus-yard",
    );
    expect(resolveLaunchStoreCode({ s: "north-001" })).toBe("north-001");
  });

  it("extracts launch store code from miniapp qr scene", () => {
    expect(resolveLaunchStoreCode({ scene: "lotus-garden" })).toBe(
      "lotus-garden",
    );
    expect(resolveLaunchStoreCode({ scene: "storeCode=lotus-garden" })).toBe(
      "lotus-garden",
    );
    expect(
      resolveLaunchStoreCode({ scene: "storeCode%3Dosmanthus-yard%26x%3D1" }),
    ).toBe("osmanthus-yard");
  });

  it("ignores invalid launch store code params", () => {
    expect(resolveLaunchStoreCode({ storeCode: "LotusGarden" })).toBeUndefined();
    expect(resolveLaunchStoreCode({ scene: "storeCode=lo" })).toBeUndefined();
    expect(resolveLaunchStoreCode({ scene: "x=lotus-garden" })).toBeUndefined();
    expect(resolveLaunchStoreCode()).toBeUndefined();
  });
});
