"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password"),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? "登录失败");
      setSubmitting(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <label className="block">
        <span className="mb-2 block text-sm font-medium">账号</span>
        <input
          className="h-12 w-full rounded-xl border border-[#dbe6dc] bg-white px-4 text-base outline-none transition focus:border-[#1f8f4f] focus:ring-4 focus:ring-[#1f8f4f]/10"
          name="username"
          placeholder="请输入后台账号"
          defaultValue="admin"
          autoComplete="username"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium">密码</span>
        <input
          className="h-12 w-full rounded-xl border border-[#dbe6dc] bg-white px-4 text-base outline-none transition focus:border-[#1f8f4f] focus:ring-4 focus:ring-[#1f8f4f]/10"
          name="password"
          type="password"
          placeholder="请输入密码"
          defaultValue="Admin123456"
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
        {submitting ? "登录中" : "登录"}
      </button>
    </form>
  );
}
