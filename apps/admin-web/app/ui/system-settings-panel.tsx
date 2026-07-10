"use client";

import { ImagePlus, Pencil, RefreshCw, Save, Settings, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

import { AdminDraggableModal } from "./admin-draggable-modal";
import { canCloseAdminModal } from "./admin-modal-close-guard";
import { hasAdminFormChanges } from "./admin-form-dirty";
import {
  buildSystemSettingsPayload,
  canSubmitSystemSettings,
  type SystemSettingsFormState,
} from "./system-settings-form";
import { AdminFormField } from "./admin-form-field";
import { AdminRichTextEditor } from "./admin-rich-text-editor";
import { RequiredLabel } from "./required-mark";

type StoreOption = {
  id: string;
  name: string;
};

export type SystemSettingsPanelItem = Omit<
  SystemSettingsFormState,
  "deliveryCities" | "deliveryProvinces"
> & {
  deliveryCities: string[];
  deliveryProvinces: string[];
  store: StoreOption;
};

type SystemSettingsPanelProps = {
  initialSettings: SystemSettingsPanelItem | null;
  store: StoreOption | null;
};

type ApiResponse<T> = {
  data?: T;
  error?: {
    message: string;
  };
  success: boolean;
};

type SystemSettingsFormErrors = Partial<Record<"homeDishColumns", string>>;

const LOGIN_IMAGE_ACCEPT = "image/avif,image/jpeg,image/png,image/webp";
const LOGIN_IMAGE_MAX_SIZE = 3 * 1024 * 1024;
const LOGIN_IMAGE_UPLOAD_TIP = "支持 JPG、PNG、WebP、AVIF，建议 800×600 以上，单张不超过 3MB。";

function buildForm(settings: SystemSettingsPanelItem | null): SystemSettingsFormState {
  return {
    adminSystemName: settings?.adminSystemName ?? "HanYang Fresh",
    aboutText: settings?.aboutText ?? "",
    customerServiceTel: settings?.customerServiceTel ?? "",
    deliveryCities: settings?.deliveryCities ?? [],
    deliveryProvinces: settings?.deliveryProvinces ?? [],
    homeDishColumns: settings?.homeDishColumns ?? 3,
    loginImageUrl: settings?.loginImageUrl ?? "",
    loginSubtitle: settings?.loginSubtitle ?? "",
    loginTitle: settings?.loginTitle ?? "",
    loginWelcome: settings?.loginWelcome ?? "",
    privacyPolicyContent: settings?.privacyPolicyContent ?? "",
    privacyPolicyUrl: settings?.privacyPolicyUrl ?? "",
    userAgreementContent: settings?.userAgreementContent ?? "",
    userAgreementUrl: settings?.userAgreementUrl ?? "",
  };
}

function contentStatus(value: string) {
  return value.trim() ? "已配置" : "未配置";
}

function validateSystemSettingsForm(form: SystemSettingsFormState) {
  const errors: SystemSettingsFormErrors = {};
  if (![2, 3, 4].includes(Number(form.homeDishColumns))) {
    errors.homeDishColumns = "请选择首页菜品每行数量";
  }
  return errors;
}

export function SystemSettingsPanel({
  initialSettings,
  store,
}: SystemSettingsPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [form, setForm] = useState<SystemSettingsFormState>(() =>
    buildForm(initialSettings),
  );
  const [initialForm, setInitialForm] = useState<SystemSettingsFormState>(() =>
    buildForm(initialSettings),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLoginImage, setUploadingLoginImage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<SystemSettingsFormErrors>({});

  function openEditModal() {
    const nextForm = buildForm(settings);
    setForm(nextForm);
    setInitialForm(nextForm);
    setMessage(null);
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    if (
      !canCloseAdminModal({
        hasUnsavedChanges: hasAdminFormChanges({
          current: form,
          initial: initialForm,
        }),
      })
    ) {
      return;
    }

    setModalOpen(false);
  }

  function updateField<Key extends keyof SystemSettingsFormState>(
    key: Key,
    value: SystemSettingsFormState[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function reloadSettings() {
    if (!store) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/system-settings?storeId=${encodeURIComponent(store.id)}`,
      );
      const result = (await response.json()) as ApiResponse<{
        settings: SystemSettingsPanelItem;
      }>;

      if (!response.ok || !result.success || !result.data?.settings) {
        throw new Error(result.error?.message ?? "系统设置加载失败");
      }

      const nextForm = buildForm(result.data.settings);
      setSettings(result.data.settings);
      setForm(nextForm);
      setInitialForm(nextForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "系统设置加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!store) {
      setMessage("当前数据范围不可用，暂不能保存系统设置");
      return;
    }

    const validationErrors = validateSystemSettingsForm(form);
    setFormErrors(validationErrors);
    if (Object.values(validationErrors).some(Boolean)) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/system-settings", {
        body: JSON.stringify(buildSystemSettingsPayload(store.id, form)),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<{
        settings: SystemSettingsPanelItem;
      }>;

      if (!response.ok || !result.success || !result.data?.settings) {
        throw new Error(result.error?.message ?? "保存系统设置失败");
      }

      const nextForm = buildForm(result.data.settings);
      setSettings(result.data.settings);
      setForm(nextForm);
      setInitialForm(nextForm);
      setModalOpen(false);
      setMessage("系统设置已保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存系统设置失败");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLoginImage(file: File) {
    if (!LOGIN_IMAGE_ACCEPT.split(",").includes(file.type)) {
      setMessage("仅支持 JPG、PNG、WebP、AVIF 图片");
      return;
    }

    if (file.size > LOGIN_IMAGE_MAX_SIZE) {
      setMessage("登录页图片不能超过 3MB");
      return;
    }

    setUploadingLoginImage(true);
    setMessage(null);

    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/admin/uploads/dish-images", {
        body,
        method: "POST",
      });
      const result = (await response.json()) as {
        data?: { image: { key: string; url: string } };
        error?: { message: string };
        success: boolean;
      };

      if (!response.ok || !result.success || !result.data?.image) {
        throw new Error(result.error?.message ?? "登录页图片上传失败");
      }

      updateField("loginImageUrl", result.data.image.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录页图片上传失败");
    } finally {
      setUploadingLoginImage(false);
    }
  }

  const submitEnabled = canSubmitSystemSettings({
    saving,
    storeId: store?.id ?? null,
  });

  const currentForm = buildForm(settings);

  return (
    <section className="rounded-2xl border border-[#dbe6dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1f8f4f]">
            <Settings size={18} />
            系统设置
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">
            基础配置
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#66756d]">
            配置客服电话、小程序展示、协议富文本和首页展示规则。
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="border-[#dbe6dc] text-[#405248] disabled:opacity-50"
            disabled={!store || loading || saving}
            onClick={reloadSettings}
            size="lg"
            type="button"
            variant="outline"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} data-icon="inline-start" />
            刷新
          </Button>
          <Button
            className="disabled:opacity-50"
            disabled={!store || loading || saving}
            onClick={openEditModal}
            size="lg"
            type="button"
          >
            <Pencil data-icon="inline-start" />
            编辑设置
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["后台系统名称", currentForm.adminSystemName || "HanYang Fresh"],
          ["客服电话", currentForm.customerServiceTel || "未配置"],
          ["首页菜品列数", `每行 ${currentForm.homeDishColumns} 个`],
          ["登录页", currentForm.loginTitle || "默认标题"],
          ["协议内容", `用户协议${contentStatus(currentForm.userAgreementContent)} / 隐私${contentStatus(currentForm.privacyPolicyContent)}`],
        ].map(([label, value]) => (
          <div
            className="rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4"
            key={label}
          >
            <div className="text-xs font-medium text-[#66756d]">{label}</div>
            <div className="mt-2 truncate text-base font-semibold text-[#102017]">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] p-4">
        <div className="text-xs font-medium text-[#66756d]">关于我们</div>
        <div className="mt-2 line-clamp-3 text-sm leading-6 text-[#405248]">
          {currentForm.aboutText || "未配置介绍和客服说明"}
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-[#dbe6dc] bg-[#f8fbf7] px-4 py-3 text-sm text-[#405248]">
          {message}
        </div>
      ) : null}

      {modalOpen ? (
        <AdminDraggableModal
          heightClassName="h-[64vh]"
          onClose={closeModal}
          subtitle="设置保存后会影响小程序登录、协议、客服和展示规则"
          title="编辑系统设置"
          widthClassName="w-[760px]"
          footer={
            <>
              <button
                className="rounded-xl border border-[#dbe6dc] px-5 py-2 text-sm font-semibold text-[#405248]"
                onClick={closeModal}
                type="button"
              >
                取消
              </button>
              <button
                className="flex items-center gap-2 rounded-xl bg-[#1f8f4f] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!submitEnabled}
                onClick={saveSettings}
                type="button"
              >
                <Save size={16} />
                {saving ? "保存中" : "保存设置"}
              </button>
            </>
          }
        >
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium lg:col-span-2">
                  后台系统名称
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("adminSystemName", event.target.value)
                    }
                    placeholder="例如 HanYang Fresh"
                    value={form.adminSystemName}
                  />
                  <span className="text-xs font-normal text-[#66756d]">
                    全平台统一显示，未配置时默认使用 HanYang Fresh。
                  </span>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  客服电话
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("customerServiceTel", event.target.value)
                    }
                    placeholder="例如 400-800-1000"
                    value={form.customerServiceTel}
                  />
                </label>
                <AdminFormField
                  className="rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7] p-4"
                  error={formErrors.homeDishColumns}
                  label="首页菜品每行数量"
                  required
                >
                  {() => (
                  <>
                  <div className="mt-1 text-xs leading-5 text-[#66756d]">
                    控制小程序首页菜品宫格展示密度，默认每行 3 个。
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[2, 3, 4].map((columns) => (
                      <button
                        className={[
                          "h-10 rounded-xl border text-sm font-semibold transition",
                          form.homeDishColumns === columns
                            ? "border-[#1f8f4f] bg-[#1f8f4f] text-white"
                            : "border-[#cfe3d3] bg-white text-[#405248] hover:border-[#1f8f4f]",
                        ].join(" ")}
                        key={columns}
                        onClick={() => updateField("homeDishColumns", columns)}
                        type="button"
                      >
                        {columns} 个
                      </button>
                    ))}
                  </div>
                  </>
                  )}
                </AdminFormField>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  登录页主标题
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("loginTitle", event.target.value)
                    }
                    placeholder="例如 Hentor Fresh"
                    value={form.loginTitle}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  登录页副标题
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("loginSubtitle", event.target.value)
                    }
                    placeholder="例如 社区鲜蔬会员"
                    value={form.loginSubtitle}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  登录页欢迎语
                  <input
                    className="h-11 rounded-xl border border-[#dbe6dc] px-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) =>
                      updateField("loginWelcome", event.target.value)
                    }
                    placeholder="例如 欢迎来到蔬菜预订"
                    value={form.loginWelcome}
                  />
                </label>
                <div className="lg:col-span-2">
                  <div className="mb-2 text-sm font-medium">登录页图片</div>
                  <div className="grid gap-3 rounded-2xl border border-[#dbe6dc] bg-[#f8fbf7] p-3 sm:grid-cols-[180px_1fr]">
                    <div className="overflow-hidden rounded-xl border border-[#dbe6dc] bg-white">
                      {form.loginImageUrl ? (
                        <img
                          alt="登录页图片"
                          className="h-28 w-full object-cover"
                          src={form.loginImageUrl}
                        />
                      ) : (
                        <div className="grid h-28 place-items-center text-[#1f8f4f]">
                          <ImagePlus size={30} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center gap-2">
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#cfe3d3] bg-white px-4 text-sm font-semibold text-[#1f8f4f] hover:border-[#1f8f4f]">
                          <Upload size={15} />
                          {uploadingLoginImage ? "上传中" : "上传图片"}
                          <input
                            accept={LOGIN_IMAGE_ACCEPT}
                            className="hidden"
                            disabled={uploadingLoginImage}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                void uploadLoginImage(file);
                              }
                              event.currentTarget.value = "";
                            }}
                            type="file"
                          />
                        </label>
                        {form.loginImageUrl ? (
                          <button
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#f2d5c8] bg-white px-4 text-sm font-semibold text-[#b85a2b]"
                            onClick={() => updateField("loginImageUrl", "")}
                            type="button"
                          >
                            <Trash2 size={15} />
                            移除
                          </button>
                        ) : null}
                      </div>
                      <p className="text-xs leading-5 text-[#718178]">
                        {LOGIN_IMAGE_UPLOAD_TIP}
                      </p>
                    </div>
                  </div>
                </div>
                <AdminRichTextEditor
                  label="用户协议富文本"
                  onChange={(value) => updateField("userAgreementContent", value)}
                  value={form.userAgreementContent}
                />
                <AdminRichTextEditor
                  label="隐私政策富文本"
                  onChange={(value) => updateField("privacyPolicyContent", value)}
                  value={form.privacyPolicyContent}
                />
                <label className="flex flex-col gap-2 text-sm font-medium lg:col-span-2">
                  关于我们
                  <textarea
                    className="min-h-28 resize-y rounded-xl border border-[#dbe6dc] p-3 text-sm outline-none focus:border-[#1f8f4f]"
                    onChange={(event) => updateField("aboutText", event.target.value)}
                    placeholder="服务介绍、客服说明"
                    value={form.aboutText}
                  />
                </label>
              </div>
        </AdminDraggableModal>
      ) : null}
    </section>
  );
}
