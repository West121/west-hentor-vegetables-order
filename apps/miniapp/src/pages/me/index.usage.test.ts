import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("miniapp me page lifecycle", () => {
  it("refreshes member and today order data whenever the tab is shown", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.tsx"),
      "utf8",
    );

    expect(source).toContain("useDidShow");
    expect(source).toContain("void loadMe();");
    expect(source).not.toContain("useEffect(() => {\n    void loadMe();");
  });

  it("keeps orders as a service entry and separates it from reservation editing", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.tsx"),
      "utf8",
    );

    expect(source).toContain('label: "订单"');
    expect(source).toContain('/pages/orders/index');
    expect(source).not.toContain('label: "修改预订"');
  });

  it("does not render a duplicated today reservation status card", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.tsx"),
      "utf8",
    );

    expect(source).not.toContain("today-card");
    expect(source).not.toContain("今日预订已提交");
    expect(source).not.toContain("今日已预订");
  });

  it("uses logout instead of account cancellation in account settings", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.tsx"),
      "utf8",
    );

    expect(source).toContain('"退出登录"');
    expect(source).toContain('"修改昵称"');
    expect(source).toContain('Taro.removeStorageSync("mini_session_token")');
    expect(source).toContain('Taro.removeStorageSync("editing_order_id")');
    expect(source).toContain("已退出登录");
    expect(source).not.toContain("账号注销");
  });

  it("supports editing nickname through the WeChat nickname input capability", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.tsx"),
      "utf8",
    );

    expect(source).toContain('type="nickname"');
    expect(source).toContain('name="nickname"');
    expect(source).toContain('formType="submit"');
    expect(source).toContain("onNickNameReview");
    expect(source).toContain("value.nickname");
    expect(source).toContain('method: "PATCH"');
    expect(source).toContain("/api/v1/account");
    expect(source).toContain("昵称已更新");
    expect(source).toContain("修改昵称");
  });
});
