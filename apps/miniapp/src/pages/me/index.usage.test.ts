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
    expect(source).toContain('"编辑资料"');
    expect(source).toContain("MINI_SESSION_TOKEN_KEY");
    expect(source).toContain("Taro.removeStorageSync(MINI_SESSION_TOKEN_KEY)");
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
    expect(source).toContain("buildMiniappAccountUrl(API_BASE_URL)");
    expect(source).toContain("资料已更新");
    expect(source).toContain("编辑资料");
  });

  it("supports editing avatar through the WeChat chooseAvatar capability", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.tsx"),
      "utf8",
    );

    expect(source).toContain('openType="chooseAvatar"');
    expect(source).toContain("onChooseAvatar={handleAvatarChoose}");
    expect(source).toContain("Taro.uploadFile");
    expect(source).toContain("buildMiniappAccountAvatarUrl(API_BASE_URL)");
    expect(source).toContain("isUnauthorizedMiniResponse(payload)");
    expect(source).toContain("refreshMiniSessionToken");
    expect(source).toContain("avatarUrl");
  });

  it("separates avatar and nickname click areas in the profile header", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.tsx"),
      "utf8",
    );

    expect(source).toContain("function openProfileEditor()");
    expect(source).toContain("function openNicknameEditor()");
    expect(source).not.toContain("onClick={openNicknameEditor}\n          >\n            <View className=\"profile__avatar\"");
    expect(source).toContain('className="profile__avatar"');
    expect(source).toContain("onClick={openProfileEditor}");
    expect(source).toContain('className="profile__name"');
    expect(source).toContain("onClick={openNicknameEditor}");
    expect(source).toContain('hoverClass="profile__avatar--active"');
    expect(source).toContain('hoverClass="profile__name--active"');
    expect(source).toContain("loginVegetablesImage");
    expect(source).toContain('className="profile-hero__image"');
    expect(source).not.toContain('hoverClass="profile-hero__content--active"');
    expect(source).not.toContain("} · {memberStatusText}");
  });

  it("keeps profile header text readable without ellipsis styling", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.scss"),
      "utf8",
    );
    const identityBlock = source.slice(
      source.indexOf(".profile__identity"),
      source.indexOf(".member-card"),
    );

    expect(identityBlock).toContain(".profile-hero__image");
    expect(identityBlock).not.toContain("text-overflow: ellipsis");
    expect(identityBlock).toContain("word-break: break-all");
  });
});
