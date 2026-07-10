"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { resolveWechatLoginState, type WechatLoginState } from "./wechat-login-model";

type ApiResponse<T> = {
  data?: T;
  error?: { message: string };
  success: boolean;
};

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wechatState, setWechatState] = useState<WechatLoginState>({ mode: "password" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setWechatState(resolveWechatLoginState(params));
    const callbackError = params.get("wechatError");
    setError(callbackError ?? "");
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const endpoint =
      wechatState.mode === "bind"
        ? "/api/admin/auth/wechat/bind"
        : "/api/admin/auth/login";
    const body =
      wechatState.mode === "bind"
        ? { bindToken: wechatState.bindToken, password, username }
        : { password, username };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? "登录失败");
        return;
      }

      router.replace("/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const binding = wechatState.mode === "bind";

  return (
    <div className="space-y-5">
      {binding ? (
        <div className="rounded-xl border border-[#cfe3d3] bg-[#f2fbf4] px-4 py-3 text-sm leading-6 text-[#31513b]">
          微信已授权。首次使用请输入原后台账号和密码完成绑定，之后可直接扫码登录。
        </div>
      ) : null}
      <form className="space-y-5" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">账号</span>
          <input
            className="h-12 w-full rounded-xl border border-[#dbe6dc] bg-white px-4 text-base outline-none transition focus:border-[#1f8f4f] focus:ring-4 focus:ring-[#1f8f4f]/10"
            name="username"
            placeholder="请输入后台账号"
            autoComplete="username"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">密码</span>
          <input
            className="h-12 w-full rounded-xl border border-[#dbe6dc] bg-white px-4 text-base outline-none transition focus:border-[#1f8f4f] focus:ring-4 focus:ring-[#1f8f4f]/10"
            name="password"
            type="password"
            placeholder={binding ? "请输入原后台密码" : "请输入后台密码"}
            autoComplete="current-password"
          />
        </label>
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <button
          className="h-12 w-full rounded-xl bg-[#1f8f4f] text-base font-semibold text-white transition hover:bg-[#16753f] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "处理中" : binding ? "绑定微信并登录" : "登录"}
        </button>
      </form>
      {!binding ? (
        <div className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-3 text-center text-sm leading-6 text-[#66756d]">
          微信登录还在准备中，上线后就能直接扫码登录啦，敬请期待～
        </div>
      ) : null}
    </div>
  );
}
