"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe6dc] bg-white text-[#66756d] hover:text-[#14231a]"
      onClick={logout}
      title="退出登录"
      type="button"
    >
      <LogOut size={17} />
    </button>
  );
}
