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
    expect(source).toContain('"设置头像"');
    expect(source).toContain("rememberMiniSessionLogout");
    expect(source).toContain('Taro.removeStorageSync("editing_order_id")');
    expect(source).toContain("已退出登录");
    expect(source).not.toContain("账号注销");
  });

  it("only shows nickname input for the optional first-login profile completion prompt", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.tsx"),
      "utf8",
    );

    expect(source).toContain("MINI_PROFILE_COMPLETION_PROMPT_KEY");
    expect(source).toContain("profileCompletionMode");
    expect(source).toContain('type="nickname"');
    expect(source).toContain("头像和昵称可先跳过，后续仍可继续使用");
    expect(source).toContain("保存资料");
    expect(source).not.toContain('name="nickname"');
    expect(source).toContain('formType="submit"');
    expect(source).not.toContain("onNickNameReview");
    expect(source).not.toContain("value.nickname");
    expect(source).toContain('method: "PATCH"');
    expect(source).toContain("buildMiniappAccountUrl(API_BASE_URL)");
    expect(source).toContain("头像已更新");
    expect(source).toContain("设置头像");
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

  it("keeps avatar editable and nickname read-only in the profile header", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.tsx"),
      "utf8",
    );

    expect(source).toContain("function openProfileEditor()");
    expect(source).not.toContain("function openNicknameEditor()");
    expect(source).not.toContain("onClick={openNicknameEditor}\n          >\n            <View className=\"profile__avatar\"");
    expect(source).toContain('className="profile__avatar"');
    expect(source).toContain("onClick={openProfileEditor}");
    expect(source).toContain('className="profile__name"');
    expect(source).not.toContain("onClick={openNicknameEditor}");
    expect(source).toContain('hoverClass="profile__avatar--active"');
    expect(source).not.toContain('hoverClass="profile__name--active"');
    expect(source).toContain("loginVegetablesImage");
    expect(source).toContain('className="profile-hero__image"');
    expect(source).not.toContain('hoverClass="profile-hero__content--active"');
    expect(source).not.toContain("} · {memberStatusText}");
  });

  it("renders phone number and package level as two readable profile meta lines", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.tsx"),
      "utf8",
    );
    const styleSource = readFileSync(
      join(process.cwd(), "src/pages/me/index.scss"),
      "utf8",
    );

    expect(source).toContain("const memberMeta = isLoggedIn");
    expect(source).toContain("const memberPhone = data?.member?.phone?.trim() ?? \"\"");
    expect(source).toContain('memberPhone || "未绑定手机号"');
    expect(source).toContain("const memberPackageMeta = isLoggedIn");
    expect(source).toContain("? memberStatusLabel(data?.member)");
    expect(source).not.toContain('packageInfo?.nameSnapshot ?? "暂无套餐"');
    expect(source).toContain('className="profile__meta-line"');
    expect(styleSource).toContain(".profile__meta-line");
    expect(styleSource).toContain("display: block");
  });

  it("uses WeChat user as the logged-in nickname fallback", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.tsx"),
      "utf8",
    );

    expect(source).toContain("const memberName = isLoggedIn");
    expect(source).toContain('data?.member?.nickname?.trim() || "微信用户"');
    expect(source).not.toContain('data?.member?.nickname || "未登录"');
  });

  it("keeps profile header text readable without narrow wrapping", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.scss"),
      "utf8",
    );
    const identityBlock = source.slice(
      source.indexOf(".profile__identity"),
      source.indexOf(".member-card"),
    );
    const contentBlock = source.slice(
      source.indexOf(".profile-hero__content"),
      source.indexOf(".profile__identity"),
    );

    expect(contentBlock).toContain("margin-top: 10px");
    expect(identityBlock).toContain(".profile-hero__image");
    expect(identityBlock).toContain("flex: 1 1 auto");
    expect(identityBlock).toContain("flex: 0 0 104px");
    expect(identityBlock).toContain("white-space: nowrap");
    expect(identityBlock).not.toContain("text-overflow: ellipsis");
    expect(identityBlock).not.toContain("word-break: break-all");
    expect(identityBlock).not.toContain("position: absolute");
  });

  it("keeps the me tab browsable when the user is not logged in", () => {
    const source = readFileSync(
      join(process.cwd(), "src/pages/me/index.tsx"),
      "utf8",
    );

    expect(source).toContain("const isLoggedIn = Boolean(data?.member)");
    expect(source).toContain("登录后查看套餐和订单");
    expect(source).toContain("登录后查看套餐");
    expect(source).toContain("登录");
    expect(source).toContain("setData(null)");
    expect(source).not.toContain("const response = await requestWithMiniSession<MeData>");
  });
});
