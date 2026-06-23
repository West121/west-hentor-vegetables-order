import { prisma } from "./client";
import { normalizeCutoffTimeValue } from "./cutoff-time";
import {
  normalizeDeliveryRangeValues,
  readDeliveryRangeValues,
} from "./delivery-range";
import { Prisma } from "./generated/prisma/client";

const CONFIG_KEYS = [
  "about_text",
  "cutoff_time",
  "customer_service_tel",
  "login_image_url",
  "login_subtitle",
  "login_title",
  "login_welcome",
  "privacy_policy_url",
  "user_agreement_url",
] as const;

type ConfigKey = (typeof CONFIG_KEYS)[number];

export type GetSystemSettingsInput = {
  storeId: string;
};

export type UpdateSystemSettingsInput = GetSystemSettingsInput & {
  aboutText: string;
  cutoffTime: string;
  customerServiceTel: string;
  deliveryCities?: string[] | null;
  deliveryProvinces?: string[] | null;
  loginImageUrl: string;
  loginSubtitle: string;
  loginTitle: string;
  loginWelcome: string;
  operatorId: string;
  privacyPolicyUrl: string;
  userAgreementUrl: string;
};

export type SystemSettings = {
  aboutText: string;
  cutoffTime: string;
  customerServiceTel: string;
  deliveryCities: string[];
  deliveryProvinces: string[];
  loginImageUrl: string;
  loginSubtitle: string;
  loginTitle: string;
  loginWelcome: string;
  privacyPolicyUrl: string;
  store: {
    id: string;
    name: string;
  };
  userAgreementUrl: string;
};

export class SystemSettingsServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SystemSettingsServiceError";
  }
}

type SystemSettingsDb = Prisma.TransactionClient | typeof prisma;

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeCutoffTime(value: string) {
  const normalized = normalizeCutoffTimeValue(value);
  if (!normalized) {
    throw new SystemSettingsServiceError(
      "INVALID_CUTOFF_TIME",
      "截单时间必须是 HH:mm",
    );
  }

  return normalized;
}

function configText(value: Prisma.JsonValue | undefined) {
  return typeof value === "string" ? value : "";
}

function settingsLogValue(settings: SystemSettings) {
  return {
    aboutText: settings.aboutText,
    cutoffTime: settings.cutoffTime,
    customerServiceTel: settings.customerServiceTel,
    deliveryCities: settings.deliveryCities,
    deliveryProvinces: settings.deliveryProvinces,
    loginImageUrl: settings.loginImageUrl,
    loginSubtitle: settings.loginSubtitle,
    loginTitle: settings.loginTitle,
    loginWelcome: settings.loginWelcome,
    privacyPolicyUrl: settings.privacyPolicyUrl,
    userAgreementUrl: settings.userAgreementUrl,
  };
}

async function readSystemSettings(
  db: SystemSettingsDb,
  input: GetSystemSettingsInput,
): Promise<SystemSettings> {
  const [store, configs] = await Promise.all([
    db.store.findUnique({
      where: { id: input.storeId },
      select: {
        customerServiceTel: true,
        cutoffTime: true,
        deliveryCities: true,
        deliveryProvinces: true,
        id: true,
        name: true,
      },
    }),
    db.systemConfig.findMany({
      where: {
        key: { in: [...CONFIG_KEYS] },
        storeId: input.storeId,
      },
      select: {
        key: true,
        value: true,
      },
    }),
  ]);

  if (!store) {
    throw new SystemSettingsServiceError("STORE_NOT_FOUND", "门店不存在");
  }

  const configByKey = new Map(
    configs.map((config) => [config.key as ConfigKey, config.value]),
  );

  return {
    aboutText: configText(configByKey.get("about_text")),
    cutoffTime: store.cutoffTime,
    customerServiceTel: store.customerServiceTel ?? "",
    deliveryCities: readDeliveryRangeValues(store.deliveryCities),
    deliveryProvinces: readDeliveryRangeValues(store.deliveryProvinces),
    loginImageUrl: configText(configByKey.get("login_image_url")),
    loginSubtitle: configText(configByKey.get("login_subtitle")),
    loginTitle: configText(configByKey.get("login_title")),
    loginWelcome: configText(configByKey.get("login_welcome")),
    privacyPolicyUrl: configText(configByKey.get("privacy_policy_url")),
    store: {
      id: store.id,
      name: store.name,
    },
    userAgreementUrl: configText(configByKey.get("user_agreement_url")),
  };
}

async function requireActiveOperator(
  tx: Prisma.TransactionClient,
  operatorId: string,
) {
  const operator = await tx.adminUser.findFirst({
    where: {
      id: operatorId,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (!operator) {
    throw new SystemSettingsServiceError("OPERATOR_NOT_FOUND", "操作员不存在");
  }

  return operator;
}

export async function getSystemSettings(input: GetSystemSettingsInput) {
  return readSystemSettings(prisma, input);
}

export async function updateSystemSettings(input: UpdateSystemSettingsInput) {
  const cutoffTime = normalizeCutoffTime(input.cutoffTime);
  const customerServiceTel = normalizeText(input.customerServiceTel);
  const deliveryCities = normalizeDeliveryRangeValues(input.deliveryCities);
  const deliveryProvinces = normalizeDeliveryRangeValues(
    input.deliveryProvinces,
  );
  const configValues: Record<ConfigKey, string> = {
    about_text: normalizeText(input.aboutText),
    cutoff_time: cutoffTime,
    customer_service_tel: customerServiceTel,
    login_image_url: normalizeText(input.loginImageUrl),
    login_subtitle: normalizeText(input.loginSubtitle),
    login_title: normalizeText(input.loginTitle),
    login_welcome: normalizeText(input.loginWelcome),
    privacy_policy_url: normalizeText(input.privacyPolicyUrl),
    user_agreement_url: normalizeText(input.userAgreementUrl),
  };

  return prisma.$transaction(async (tx) => {
    await requireActiveOperator(tx, input.operatorId);
    const before = await readSystemSettings(tx, { storeId: input.storeId });

    await tx.store.update({
      where: { id: input.storeId },
      data: {
        customerServiceTel: customerServiceTel || null,
        cutoffTime,
        deliveryCities,
        deliveryProvinces,
      },
    });

    await Promise.all(
      CONFIG_KEYS.map((key) =>
        tx.systemConfig.upsert({
          where: {
            storeId_key: {
              key,
              storeId: input.storeId,
            },
          },
          create: {
            key,
            storeId: input.storeId,
            value: configValues[key],
          },
          update: {
            value: configValues[key],
          },
        }),
      ),
    );

    const after = await readSystemSettings(tx, { storeId: input.storeId });

    await tx.adminOperationLog.create({
      data: {
        action: "SYSTEM_SETTINGS_UPDATED",
        afterValue: settingsLogValue(after),
        beforeValue: settingsLogValue(before),
        operatorId: input.operatorId,
        resource: "system_config",
        resourceId: input.storeId,
        storeId: input.storeId,
      },
    });

    return after;
  });
}
