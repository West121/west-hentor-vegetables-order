import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("miniapp login privacy review contract", () => {
  it("does not default agree to privacy terms before requesting phone auth", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/login/index.tsx"),
      "utf8",
    );

    expect(source).toContain("useState(false)");
    expect(source).toContain("agreementAccepted ? \"getPhoneNumber\" : undefined");
    expect(source).toContain("请先阅读并同意用户协议和隐私政策");
    expect(source).toContain("promptAgreementRequired");
    expect(source).toContain("userAgreementContent");
    expect(source).toContain("privacyPolicyContent");
    expect(source).toContain("clearMiniSessionLogout");
    expect(source).not.toContain('openType="getPhoneNumber"');
  });

  it("renders an explicit user-controlled agreement selector", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "src/pages/login/index.tsx"),
      "utf8",
    );
    const styleSource = readFileSync(
      join(process.cwd(), "src/pages/login/index.scss"),
      "utf8",
    );

    expect(pageSource).toContain("login__agreement-check");
    expect(pageSource).toContain("setAgreementAccepted((value) => !value)");
    expect(styleSource).toContain(".login__agreement-check");
    expect(styleSource).toContain(".login__agreement-check--active");
    expect(styleSource).not.toContain(".login__agreement::before");
  });

  it("allows reviewers and users to return from login without authorizing phone number", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "src/pages/login/index.tsx"),
      "utf8",
    );
    const styleSource = readFileSync(
      join(process.cwd(), "src/pages/login/index.scss"),
      "utf8",
    );

    expect(pageSource).toContain("function returnToPreviousPage()");
    expect(pageSource).toContain("返回");
    expect(pageSource).not.toContain("暂不登录，先逛逛");
    expect(pageSource).toContain("Taro.getCurrentPages().length > 1");
    expect(pageSource).toContain('Taro.switchTab({ url: "/pages/home/index" })');
    expect(pageSource).toContain("<MiniCustomTop back");
    expect(pageSource).toContain("onBack={goBack}");
    expect(styleSource).toContain(".login__return-button");
  });
});
