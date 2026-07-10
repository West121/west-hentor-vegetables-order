import { describe, expect, it } from "vitest";

import {
  buildSystemSettingsPayload,
  canSubmitSystemSettings,
} from "./system-settings-form";

describe("system settings form helpers", () => {
  it("builds a trimmed payload scoped to the active store", () => {
    expect(
      buildSystemSettingsPayload("store-1", {
        adminSystemName: " HanYang Fresh ",
        aboutText: "  社区蔬菜配送说明  ",
        customerServiceTel: " 400-222-3333 ",
        deliveryCities: [" 南京市 ", "合肥市", "南京市"],
        deliveryProvinces: [" 江苏省 ", "安徽省"],
        homeDishColumns: 4,
        loginImageUrl: " /uploads/login.jpg ",
        loginSubtitle: " 社区鲜蔬会员 ",
        loginTitle: " Hentor Fresh ",
        loginWelcome: " 欢迎来到蔬菜预订 ",
        privacyPolicyContent: " <h2>隐私政策</h2> ",
        privacyPolicyUrl: " https://example.com/privacy ",
        userAgreementContent: " <h2>用户协议</h2> ",
        userAgreementUrl: " https://example.com/agreement ",
      }),
    ).toEqual({
      adminSystemName: "HanYang Fresh",
      aboutText: "社区蔬菜配送说明",
      customerServiceTel: "400-222-3333",
      deliveryCities: ["南京市", "合肥市"],
      deliveryProvinces: ["江苏省", "安徽省"],
      homeDishColumns: 4,
      loginImageUrl: "/uploads/login.jpg",
      loginSubtitle: "社区鲜蔬会员",
      loginTitle: "Hentor Fresh",
      loginWelcome: "欢迎来到蔬菜预订",
      privacyPolicyContent: "<h2>隐私政策</h2>",
      privacyPolicyUrl: "https://example.com/privacy",
      storeId: "store-1",
      userAgreementContent: "<h2>用户协议</h2>",
      userAgreementUrl: "https://example.com/agreement",
    });
  });

  it("falls back to three home dish columns for invalid form values", () => {
    expect(
      buildSystemSettingsPayload("store-1", {
        adminSystemName: "HanYang Fresh",
        aboutText: "",
        customerServiceTel: "",
        deliveryCities: [],
        deliveryProvinces: [],
        homeDishColumns: 5,
        loginImageUrl: "",
        loginSubtitle: "",
        loginTitle: "",
        loginWelcome: "",
        privacyPolicyContent: "",
        privacyPolicyUrl: "",
        userAgreementContent: "",
        userAgreementUrl: "",
      }).homeDishColumns,
    ).toBe(3);
  });

  it("only allows submit when an active store is selected and not saving", () => {
    expect(canSubmitSystemSettings({ saving: false, storeId: "store-1" })).toBe(
      true,
    );
    expect(canSubmitSystemSettings({ saving: true, storeId: "store-1" })).toBe(
      false,
    );
    expect(canSubmitSystemSettings({ saving: false, storeId: null })).toBe(false);
  });
});
