import { createHash } from "node:crypto";

import type { Kuaidi100PrintTask } from "@hentor/db";

type Kuaidi100Config = {
  code: string;
  expType: string;
  key: string;
  kuaidicom: string;
  needBack: string;
  needChild: string;
  net: string;
  partnerId: string;
  partnerKey: string;
  partnerName: string;
  partnerSecret: string;
  payType: string;
  siid: string;
  tempId: string;
  type: string;
};

type Kuaidi100Response = {
  data?: {
    eOrder?: unknown;
    kuaidinum?: string;
    taskId?: string;
  };
  message?: string;
  success?: boolean;
};

export type Kuaidi100PrintResult = {
  kuaidinum: string;
  rawResponse: Kuaidi100Response;
  shipmentId: string;
  taskId?: string;
};

const REQUIRED_ENV = [
  "KUAIDI100_KEY",
  "KUAIDI100_SECRET",
  "KUAIDI100_PARTNER_ID",
  "KUAIDI100_PARTNER_KEY",
  "KUAIDI100_CODE",
  "KUAIDI100_TEMP_ID",
  "KUAIDI100_SIID",
] as const;

function envValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getKuaidi100MissingConfig() {
  return REQUIRED_ENV.filter((name) => !envValue(name));
}

function getKuaidi100Config(): Kuaidi100Config {
  const missing = getKuaidi100MissingConfig();
  if (missing.length > 0) {
    throw new Error(`快递100配置缺失：${missing.join(", ")}`);
  }

  return {
    code: envValue("KUAIDI100_CODE"),
    expType: envValue("KUAIDI100_EXP_TYPE") || "标准快递",
    key: envValue("KUAIDI100_KEY"),
    kuaidicom: envValue("KUAIDI100_KUAIDICOM") || "shunfeng",
    needBack: envValue("KUAIDI100_NEED_BACK") || "0",
    needChild: envValue("KUAIDI100_NEED_CHILD") || "0",
    net: envValue("KUAIDI100_NET"),
    partnerId: envValue("KUAIDI100_PARTNER_ID"),
    partnerKey: envValue("KUAIDI100_PARTNER_KEY"),
    partnerName: envValue("KUAIDI100_PARTNER_NAME"),
    partnerSecret: envValue("KUAIDI100_PARTNER_SECRET"),
    payType: envValue("KUAIDI100_PAY_TYPE") || "SHIPPER",
    siid: envValue("KUAIDI100_SIID"),
    tempId: envValue("KUAIDI100_TEMP_ID"),
    type: envValue("KUAIDI100_TYPE") || "10",
  };
}

function md5Upper(value: string) {
  return createHash("md5").update(value).digest("hex").toUpperCase();
}

function buildParam(task: Kuaidi100PrintTask, config: Kuaidi100Config) {
  return {
    backTempId: envValue("KUAIDI100_BACK_TEMP_ID"),
    cargo: task.cargo,
    count: task.count,
    childTempId: envValue("KUAIDI100_CHILD_TEMP_ID"),
    code: config.code,
    expType: config.expType,
    kuaidicom: config.kuaidicom,
    needBack: config.needBack,
    needChild: config.needChild,
    needDesensitization: envValue("KUAIDI100_NEED_DESENSITIZATION") === "1",
    needLogo: envValue("KUAIDI100_NEED_LOGO") !== "0",
    needOcr: envValue("KUAIDI100_NEED_OCR") === "1",
    orderId: `${task.orderNo}-${task.shipmentId.slice(-8)}`,
    partnerId: config.partnerId,
    partnerKey: config.partnerKey,
    payType: config.payType,
    printType: "CLOUD",
    recMan: {
      company: "",
      mobile: task.receiverMobile,
      name: task.receiverName,
      printAddr: task.receiverAddress,
    },
    remark: task.remark,
    sendMan: {
      company: envValue("KUAIDI100_SENDER_COMPANY"),
      mobile: task.senderMobile,
      name: task.senderName,
      printAddr: task.senderAddress,
    },
    siid: config.siid,
    tempId: config.tempId,
    weight: task.weightKg,
  };
}

export async function submitKuaidi100CloudPrint(
  task: Kuaidi100PrintTask,
): Promise<Kuaidi100PrintResult> {
  const config = getKuaidi100Config();
  const param = JSON.stringify(buildParam(task, config));
  const timestamp = Date.now().toString();
  const sign = md5Upper(`${param}${timestamp}${config.key}${envValue("KUAIDI100_SECRET")}`);
  const query = new URLSearchParams({
    key: config.key,
    method: "order",
    param,
    sign,
    t: timestamp,
  });

  const response = await fetch(`https://api.kuaidi100.com/label/order?${query.toString()}`, {
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as
    | Kuaidi100Response
    | null;

  if (!response.ok || !payload) {
    throw new Error(`快递100请求失败：HTTP ${response.status}`);
  }

  if (!payload.success || !payload.data?.kuaidinum) {
    throw new Error(payload.message || "快递100电子面单创建失败");
  }

  return {
    kuaidinum: payload.data.kuaidinum,
    rawResponse: payload,
    shipmentId: task.shipmentId,
    taskId: payload.data.taskId,
  };
}
