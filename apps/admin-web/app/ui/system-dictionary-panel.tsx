"use client";

import {
  CheckCircle2,
  Database,
  Plus,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

import { AdminConfirmDialog } from "./admin-confirm-dialog";
import { AdminFormField } from "./admin-form-field";
import { RequiredLabel } from "./required-mark";

type StoreOption = {
  id: string;
  name: string;
};

export type SystemDictionaryItem = {
  code: string;
  enabled: boolean;
  name: string;
  sortOrder: number;
};

export type SystemDictionaryMeta = {
  builtIn?: boolean;
  code: string;
  description?: string;
  enabled: boolean;
  name: string;
  sortOrder: number;
};

type SystemDictionaryPanelProps = {
  initialDictionaries?: SystemDictionaryMeta[];
  initialItems: SystemDictionaryItem[];
  store: StoreOption | null;
};

type ApiResponse<T> = {
  data?: T;
  error?: {
    message: string;
  };
  success: boolean;
};

type DictionaryFormErrors = Partial<
  Record<"code" | "name" | "sortOrder", string>
> & {
  items?: Array<Partial<Record<"code" | "enabled" | "name" | "sortOrder", string>>>;
};

const DEFAULT_DISH_DICTIONARY: SystemDictionaryMeta = {
  builtIn: true,
  code: "DISH_CATEGORY",
  description: "菜品管理、任务选菜使用的菜品分类。",
  enabled: true,
  name: "菜品类型",
  sortOrder: 1,
};

const DEFAULT_DISH_CATEGORIES: SystemDictionaryItem[] = [
  { code: "LEAFY", enabled: true, name: "叶菜", sortOrder: 1 },
  { code: "FRUIT", enabled: true, name: "茄果", sortOrder: 2 },
  { code: "ROOT", enabled: true, name: "根茎", sortOrder: 3 },
  { code: "MUSHROOM", enabled: true, name: "菌菇", sortOrder: 4 },
  { code: "ACTIVITY", enabled: true, name: "活动", sortOrder: 5 },
];

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

function sortDictionaries(items: SystemDictionaryMeta[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

function nextDictionaryCode(items: SystemDictionaryMeta[]) {
  let index = items.length + 1;
  let code = `CUSTOM_DICT_${index}`;
  const codes = new Set(items.map((item) => item.code));
  while (codes.has(code)) {
    index += 1;
    code = `CUSTOM_DICT_${index}`;
  }
  return code;
}

function nextItemCode(items: SystemDictionaryItem[]) {
  let index = items.length + 1;
  let code = `ITEM_${index}`;
  const codes = new Set(items.map((item) => item.code));
  while (codes.has(code)) {
    index += 1;
    code = `ITEM_${index}`;
  }
  return code;
}

function mergeDictionary(
  dictionaries: SystemDictionaryMeta[],
  dictionary: SystemDictionaryMeta,
) {
  const exists = dictionaries.some((item) => item.code === dictionary.code);
  return sortDictionaries(
    exists
      ? dictionaries.map((item) =>
          item.code === dictionary.code ? dictionary : item,
        )
      : [...dictionaries, dictionary],
  );
}

function dictionaryFallback(initialDictionaries?: SystemDictionaryMeta[]) {
  return initialDictionaries?.length
    ? sortDictionaries(initialDictionaries)
    : [DEFAULT_DISH_DICTIONARY];
}

function itemFallback(initialItems: SystemDictionaryItem[]) {
  return initialItems.length ? initialItems : DEFAULT_DISH_CATEGORIES;
}

function hasDictionaryFormErrors(errors: DictionaryFormErrors) {
  return Object.entries(errors).some(([key, value]) =>
    key === "items"
      ? Array.isArray(value) &&
        value.some((item) => Object.values(item).some(Boolean))
      : Boolean(value),
  );
}

function validateDictionaryForm(
  dictionary: SystemDictionaryMeta,
  items: SystemDictionaryItem[],
) {
  const errors: DictionaryFormErrors = {};
  if (!dictionary.name.trim()) {
    errors.name = "请输入字典名称";
  }
  if (!dictionary.code.trim()) {
    errors.code = "请输入字典编码";
  }
  if (!Number.isFinite(Number(dictionary.sortOrder))) {
    errors.sortOrder = "请输入排序";
  }
  const itemErrors = items.map((item) => {
    const current: NonNullable<DictionaryFormErrors["items"]>[number] = {};
    if (!item.name.trim()) {
      current.name = "请输入字典项名称";
    }
    if (!item.code.trim()) {
      current.code = "请输入字典项编码";
    }
    if (!Number.isFinite(Number(item.sortOrder))) {
      current.sortOrder = "请输入排序";
    }
    return current;
  });
  if (itemErrors.some((item) => Object.values(item).some(Boolean))) {
    errors.items = itemErrors;
  }
  return errors;
}

export function SystemDictionaryPanel({
  initialDictionaries,
  initialItems,
  store,
}: SystemDictionaryPanelProps) {
  const fallbackDictionaries = dictionaryFallback(initialDictionaries);
  const [dictionaries, setDictionaries] = useState(fallbackDictionaries);
  const [selectedCode, setSelectedCode] = useState(
    fallbackDictionaries[0]?.code ?? DEFAULT_DISH_DICTIONARY.code,
  );
  const [itemsByCode, setItemsByCode] = useState<
    Record<string, SystemDictionaryItem[]>
  >({
    [DEFAULT_DISH_DICTIONARY.code]: itemFallback(initialItems),
  });
  const [loadedCodes, setLoadedCodes] = useState(
    new Set([DEFAULT_DISH_DICTIONARY.code]),
  );
  const [persistedCodes, setPersistedCodes] = useState(
    new Set(fallbackDictionaries.map((item) => item.code)),
  );
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<SystemDictionaryMeta | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<DictionaryFormErrors>({});

  const activeDictionary =
    dictionaries.find((item) => item.code === selectedCode) ??
    dictionaries[0] ??
    DEFAULT_DISH_DICTIONARY;
  const activeItems = itemsByCode[activeDictionary.code] ?? [];
  const activePersisted = persistedCodes.has(activeDictionary.code);

  async function selectDictionary(code: string) {
    setSelectedCode(code);
    setDeleteCandidate(null);
    setMessage(null);
    setFormErrors({});
    if (!store || loadedCodes.has(code)) {
      return;
    }

    setLoadingCode(code);
    try {
      const params = new URLSearchParams({ storeId: store.id });
      const response = await fetch(
        `/api/admin/dictionaries/${encodeURIComponent(code)}?${params.toString()}`,
      );
      const payload = (await response.json()) as ApiResponse<{
        dictionary: SystemDictionaryMeta;
        items: SystemDictionaryItem[];
      }>;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "字典加载失败");
      }
      setDictionaries((current) =>
        mergeDictionary(current, payload.data!.dictionary),
      );
      setItemsByCode((current) => ({
        ...current,
        [code]: payload.data!.items,
      }));
      setLoadedCodes((current) => new Set([...current, code]));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "字典加载失败");
    } finally {
      setLoadingCode(null);
    }
  }

  function updateDictionary<K extends keyof SystemDictionaryMeta>(
    key: K,
    value: SystemDictionaryMeta[K],
  ) {
    setDictionaries((current) =>
      current.map((item) =>
        item.code === activeDictionary.code ? { ...item, [key]: value } : item,
      ),
    );
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  }

  function updateItem<K extends keyof SystemDictionaryItem>(
    index: number,
    key: K,
    value: SystemDictionaryItem[K],
  ) {
    setItemsByCode((current) => ({
      ...current,
      [activeDictionary.code]: activeItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
    setFormErrors((current) => ({ ...current, items: undefined }));
  }

  function addDictionary() {
    const code = nextDictionaryCode(dictionaries);
    const dictionary: SystemDictionaryMeta = {
      builtIn: false,
      code,
      description: "",
      enabled: true,
      name: "新字典",
      sortOrder: dictionaries.length + 1,
    };
    setDictionaries((current) => sortDictionaries([...current, dictionary]));
    setItemsByCode((current) => ({
      ...current,
      [code]: [{ code: "ITEM_1", enabled: true, name: "字典项", sortOrder: 1 }],
    }));
    setLoadedCodes((current) => new Set([...current, code]));
    setSelectedCode(code);
    setMessage(null);
    setFormErrors({});
  }

  function addItem() {
    setItemsByCode((current) => ({
      ...current,
      [activeDictionary.code]: [
        ...activeItems,
        {
          code: nextItemCode(activeItems),
          enabled: true,
          name: "",
          sortOrder: activeItems.length + 1,
        },
      ],
    }));
  }

  function removeItem(index: number) {
    setItemsByCode((current) => ({
      ...current,
      [activeDictionary.code]: activeItems.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  }

  async function saveDictionary() {
    if (!store) {
      return;
    }

    const validationErrors = validateDictionaryForm(
      activeDictionary,
      activeItems,
    );
    setFormErrors(validationErrors);
    if (hasDictionaryFormErrors(validationErrors)) {
      return;
    }

    const normalizedItems = activeItems.map((item, index) => ({
      ...item,
      code: normalizeCode(item.code),
      sortOrder: Number(item.sortOrder || index + 1),
    }));

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/dictionaries/${encodeURIComponent(activeDictionary.code)}`,
        {
          body: JSON.stringify({
            description: activeDictionary.description ?? "",
            enabled: activeDictionary.enabled,
            items: normalizedItems,
            name: activeDictionary.name,
            sortOrder: Number(activeDictionary.sortOrder || 1),
            storeId: store.id,
          }),
          headers: { "content-type": "application/json" },
          method: "PUT",
        },
      );
      const payload = (await response.json()) as ApiResponse<{
        dictionary: SystemDictionaryMeta;
        items: SystemDictionaryItem[];
      }>;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "保存字典失败");
      }
      setDictionaries((current) =>
        mergeDictionary(current, payload.data!.dictionary),
      );
      setItemsByCode((current) => ({
        ...current,
        [payload.data!.dictionary.code]: payload.data!.items,
      }));
      setPersistedCodes((current) =>
        new Set([...current, payload.data!.dictionary.code]),
      );
      setSelectedCode(payload.data.dictionary.code);
      setMessage("字典已保存");
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "保存字典失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDictionary(dictionary: SystemDictionaryMeta) {
    if (!store || dictionary.builtIn) {
      return;
    }

    if (!activePersisted) {
      removeDictionaryLocally(dictionary.code);
      setDeleteCandidate(null);
      return;
    }

    setDeletingCode(dictionary.code);
    setMessage(null);
    try {
      const params = new URLSearchParams({ storeId: store.id });
      const response = await fetch(
        `/api/admin/dictionaries/${encodeURIComponent(dictionary.code)}?${params.toString()}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as ApiResponse<{
        dictionaries: SystemDictionaryMeta[];
      }>;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "删除字典失败");
      }
      const nextDictionaries = dictionaryFallback(payload.data.dictionaries);
      setDictionaries(nextDictionaries);
      setPersistedCodes(new Set(nextDictionaries.map((item) => item.code)));
      setItemsByCode((current) => {
        const next = { ...current };
        delete next[dictionary.code];
        return next;
      });
      setSelectedCode(nextDictionaries[0]?.code ?? DEFAULT_DISH_DICTIONARY.code);
      setDeleteCandidate(null);
      setMessage("字典已删除");
    } catch (deleteError) {
      setMessage(
        deleteError instanceof Error ? deleteError.message : "删除字典失败",
      );
    } finally {
      setDeletingCode(null);
    }
  }

  function removeDictionaryLocally(code: string) {
    const nextDictionaries = dictionaries.filter((item) => item.code !== code);
    setDictionaries(nextDictionaries);
    setItemsByCode((current) => {
      const next = { ...current };
      delete next[code];
      return next;
    });
    setLoadedCodes((current) => {
      const next = new Set(current);
      next.delete(code);
      return next;
    });
    setSelectedCode(nextDictionaries[0]?.code ?? DEFAULT_DISH_DICTIONARY.code);
    setDeleteCandidate(null);
  }

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <Settings2 size={18} />
            系统字典
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">
            字典管理
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            维护系统字典和字典项，菜品类型只是其中一个内置字典。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            aria-label="新增字典"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#dbe6dc] px-4 text-sm font-semibold text-[#1f8f4f] hover:bg-[#f3f7f1]"
            onClick={addDictionary}
            title="新增字典"
            type="button"
          >
            <Plus size={18} />
            新增字典
          </button>
          <button
            aria-label="保存当前字典"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1f8f4f] px-4 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving || !store}
            onClick={() => void saveDictionary()}
            title="保存当前字典"
            type="button"
          >
            <Save size={18} />
            {saving ? "保存中" : "保存"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7] p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="text-sm font-semibold text-[#102017]">字典</div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#66756d]">
              {dictionaries.length} 个
            </div>
          </div>
          <div className="space-y-2">
            {dictionaries.map((dictionary) => {
              const active = dictionary.code === activeDictionary.code;
              return (
                <button
                  className={[
                    "w-full rounded-xl border p-3 text-left transition",
                    active
                      ? "border-[#9ecfaf] bg-white shadow-sm"
                      : "border-transparent bg-transparent hover:bg-white",
                  ].join(" ")}
                  key={dictionary.code}
                  onClick={() => void selectDictionary(dictionary.code)}
                  type="button"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#102017]">
                        {dictionary.name}
                      </div>
                      <div className="mt-1 truncate font-mono text-xs text-[#66756d]">
                        {dictionary.code}
                      </div>
                    </div>
                    {dictionary.builtIn ? (
                      <span className="shrink-0 rounded-full bg-[#eef7f0] px-2 py-1 text-xs font-semibold text-[#1f8f4f]">
                        内置
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#66756d]">
                    {dictionary.enabled ? (
                      <CheckCircle2 size={14} className="text-[#1f8f4f]" />
                    ) : (
                      <Database size={14} className="text-[#9aa89f]" />
                    )}
                    {dictionary.enabled ? "启用" : "停用"}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0 rounded-2xl border border-[#dbe6dc]">
          <div className="border-b border-[#edf2ed] p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_140px]">
              <AdminFormField
                error={formErrors.name}
                label="字典名称"
                required
              >
                {(invalid) => (
                <input
                  aria-invalid={invalid}
                  className="mt-2 h-11 w-full rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                  onChange={(event) =>
                    updateDictionary("name", event.target.value)
                  }
                  value={activeDictionary.name}
                />
                )}
              </AdminFormField>
              <AdminFormField
                error={formErrors.code}
                label="字典编码"
                required
              >
                {(invalid) => (
                <input
                  aria-invalid={invalid}
                  className="mt-2 h-11 w-full rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-3 font-mono text-sm text-[#66756d] outline-none"
                  readOnly
                  value={activeDictionary.code}
                />
                )}
              </AdminFormField>
              <AdminFormField
                error={formErrors.sortOrder}
                label="排序"
                required
              >
                {(invalid) => (
                <input
                  aria-invalid={invalid}
                  className="mt-2 h-11 w-full rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                  onChange={(event) =>
                    updateDictionary("sortOrder", Number(event.target.value || 0))
                  }
                  type="number"
                  value={activeDictionary.sortOrder}
                />
                )}
              </AdminFormField>
              <label className="block lg:col-span-2">
                <span className="text-sm font-semibold text-[#102017]">
                  字典说明
                </span>
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                  onChange={(event) =>
                    updateDictionary("description", event.target.value)
                  }
                  placeholder="例如：用于菜品、权益、订单等业务配置"
                  value={activeDictionary.description ?? ""}
                />
              </label>
              <div className="flex items-end gap-2">
                <label className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#dbe6dc] text-sm font-semibold text-[#405248]">
                  <input
                    checked={activeDictionary.enabled}
                    className="accent-[#1f8f4f]"
                    disabled={activeDictionary.builtIn}
                    onChange={(event) =>
                      updateDictionary("enabled", event.target.checked)
                    }
                    type="checkbox"
                  />
                  {activeDictionary.enabled ? "启用" : "停用"}
                </label>
                <Button
                  aria-label="删除字典"
                  className="border-red-100 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={
                    Boolean(activeDictionary.builtIn) ||
                    deletingCode === activeDictionary.code
                  }
                  onClick={() => setDeleteCandidate(activeDictionary)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Trash2 data-icon="inline-start" />
                  删除字典
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-sm font-semibold text-[#102017]">字典项</div>
              <div className="mt-1 text-xs text-[#66756d]">
                {loadingCode === activeDictionary.code
                  ? "正在加载"
                  : `${activeItems.length} 条配置`}
              </div>
            </div>
            <button
              aria-label="新增字典项"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe6dc] px-3 text-sm font-semibold text-[#1f8f4f] hover:bg-[#f3f7f1]"
              onClick={addItem}
              title="新增字典项"
              type="button"
            >
              <Plus size={17} />
              新增字典项
            </button>
          </div>

          <div className="overflow-x-auto border-t border-[#edf2ed]">
            <table className="min-w-[760px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f5f8f3] text-[#66756d]">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    <RequiredLabel>字典项名称</RequiredLabel>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <RequiredLabel>字典项编码</RequiredLabel>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <RequiredLabel>排序</RequiredLabel>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <RequiredLabel>状态</RequiredLabel>
                  </th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2ed]">
                {activeItems.map((item, index) => (
                  <tr key={`${item.code}-${index}`}>
                    <td className="px-4 py-3">
                      <AdminFormField
                        error={formErrors.items?.[index]?.name}
                        label="字典项名称"
                        required
                      >
                        {(invalid) => (
                          <input
                            aria-invalid={invalid}
                            className="h-10 w-full rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                            onChange={(event) =>
                              updateItem(index, "name", event.target.value)
                            }
                            placeholder="例如：叶菜"
                            value={item.name}
                          />
                        )}
                      </AdminFormField>
                    </td>
                    <td className="px-4 py-3">
                      <AdminFormField
                        error={formErrors.items?.[index]?.code}
                        label="字典项编码"
                        required
                      >
                        {(invalid) => (
                          <input
                            aria-invalid={invalid}
                            className="h-10 w-full rounded-xl border border-[#dbe6dc] px-3 font-mono text-sm outline-none focus:border-[#1f8f4f]"
                            onBlur={() =>
                              updateItem(index, "code", normalizeCode(item.code))
                            }
                            onChange={(event) =>
                              updateItem(index, "code", event.target.value)
                            }
                            placeholder="例如：LEAFY"
                            value={item.code}
                          />
                        )}
                      </AdminFormField>
                    </td>
                    <td className="px-4 py-3">
                      <AdminFormField
                        error={formErrors.items?.[index]?.sortOrder}
                        label="排序"
                        required
                      >
                        {(invalid) => (
                          <input
                            aria-invalid={invalid}
                            className="h-10 w-24 rounded-xl border border-[#dbe6dc] px-3 outline-none focus:border-[#1f8f4f]"
                            onChange={(event) =>
                              updateItem(
                                index,
                                "sortOrder",
                                Number(event.target.value || 0),
                              )
                            }
                            type="number"
                            value={item.sortOrder}
                          />
                        )}
                      </AdminFormField>
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#405248]">
                        <input
                          checked={item.enabled}
                          className="accent-[#1f8f4f]"
                          onChange={(event) =>
                            updateItem(index, "enabled", event.target.checked)
                          }
                          type="checkbox"
                        />
                        启用
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button
                          aria-label="删除字典项"
                          className="border-red-100 text-red-600 hover:bg-red-50"
                          onClick={() => removeItem(index)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Trash2 data-icon="inline-start" />
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {message ? (
            <div className="border-t border-[#edf2ed] px-4 py-3 text-sm font-semibold text-[#1f8f4f]">
              {message}
            </div>
          ) : null}
        </div>
      </div>
      {deleteCandidate ? (
        <AdminConfirmDialog
          busy={deletingCode === deleteCandidate.code}
          confirmLabel="删除"
          message={
            <>
              确认删除字典「{deleteCandidate.name}」吗？删除后对应配置项将不可用。
            </>
          }
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={() => void deleteDictionary(deleteCandidate)}
          title="删除字典"
          variant="danger"
        />
      ) : null}
    </section>
  );
}
