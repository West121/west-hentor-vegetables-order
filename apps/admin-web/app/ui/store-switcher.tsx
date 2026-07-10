"use client";

import { adminStoreHref } from "@/app/lib/admin-navigation";

import { AdminSelect } from "./admin-select";

type StoreSwitcherProps = {
  activeStoreId: string | null;
  stores: Array<{
    id: string;
    name: string;
  }>;
};

export function StoreSwitcher({ activeStoreId, stores }: StoreSwitcherProps) {
  return (
    <AdminSelect
      contentLabel="业务范围"
      disabled={stores.length === 0}
      onChange={(value) => {
        const params = new URLSearchParams(window.location.search);
        window.location.href = `/${adminStoreHref(params, value)}`;
      }}
      options={stores.map((store) => ({
        label: store.name,
        value: store.id,
      }))}
      triggerClassName="h-11 max-w-64 border-[#dbe6dc] bg-white px-4 text-sm font-medium"
      value={activeStoreId ?? ""}
    />
  );
}
