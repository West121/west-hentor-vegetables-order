import { Suspense } from "react";

import DashboardClient from "./dashboard-client";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#f5f8f3] text-[#14231a]">
          <div className="rounded-2xl border border-[#dbe6dc] bg-white px-6 py-5 text-sm shadow-sm">
            正在加载后台数据
          </div>
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
