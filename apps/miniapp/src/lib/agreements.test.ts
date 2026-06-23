import { describe, expect, it } from "vitest";

import {
  buildAgreementWebviewUrl,
  getAgreementEntry,
} from "./agreements";

describe("miniapp agreement helpers", () => {
  it("builds a safe webview page url for configured policy links", () => {
    expect(buildAgreementWebviewUrl("https://example.com/privacy?a=1&b=2")).toBe(
      "/pages/webview/index?url=https%3A%2F%2Fexample.com%2Fprivacy%3Fa%3D1%26b%3D2",
    );
  });

  it("marks agreement entries unavailable when no link is configured", () => {
    expect(getAgreementEntry("用户协议", "")).toEqual({
      disabled: true,
      label: "用户协议",
      toastTitle: "暂未配置用户协议",
      url: null,
    });
  });

});
