"use client";

type StoreSwitcherProps = {
  activeStoreId: string | null;
  stores: Array<{
    id: string;
    name: string;
  }>;
};

export function StoreSwitcher({ activeStoreId, stores }: StoreSwitcherProps) {
  return (
    <select
      className="h-11 max-w-64 rounded-xl border border-[#dbe6dc] bg-white px-4 text-sm font-medium outline-none"
      disabled={stores.length === 0}
      onChange={(event) => {
        const params = new URLSearchParams(window.location.search);
        params.set("storeId", event.target.value);
        window.location.href = `/?${params.toString()}`;
      }}
      value={activeStoreId ?? ""}
    >
      {stores.map((store) => (
        <option key={store.id} value={store.id}>
          {store.name}
        </option>
      ))}
    </select>
  );
}
