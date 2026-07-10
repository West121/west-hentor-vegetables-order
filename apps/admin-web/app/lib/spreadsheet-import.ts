import { read, utils } from "xlsx";

type BindingStatus = "ACTIVE" | "DISABLED";
type PackageStatus = "ACTIVE" | "FROZEN" | "EXPIRED" | "USED_UP";

export const IMPORT_ACCEPT =
  ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([".xlsx", ".xls", ".csv"]);

const PHONE_HEADERS = new Set([
  "phone",
  "mobile",
  "手机号",
  "手机",
  "联系电话",
  "电话",
]);
const NICKNAME_HEADERS = new Set(["nickname", "name", "昵称", "姓名", "会员"]);
const REMARK_HEADERS = new Set(["remark", "备注"]);
const STATUS_HEADERS = new Set(["status", "状态", "服务状态", "套餐状态"]);
const ADDRESS_HEADERS = new Set([
  "address",
  "fulladdress",
  "deliveryaddress",
  "地址",
  "完整地址",
  "配送地址",
  "默认地址",
  "详细地址",
]);
const CITY_HEADERS = new Set(["city", "城市", "市"]);
const DETAIL_HEADERS = new Set([
  "detail",
  "addressdetail",
  "详细地址",
  "门牌地址",
  "街道门牌",
]);
const DISTRICT_HEADERS = new Set(["district", "area", "区县", "区", "县"]);
const PROVINCE_HEADERS = new Set(["province", "省份", "省"]);
const RECEIVER_NAME_HEADERS = new Set([
  "receivername",
  "contactname",
  "收货人",
  "联系人",
]);
const RECEIVER_PHONE_HEADERS = new Set([
  "receiverphone",
  "contactphone",
  "收货电话",
  "联系电话",
]);
const DISABLED_REASON_HEADERS = new Set([
  "disabledreason",
  "disabled_reason",
  "停用原因",
  "禁用原因",
]);
const TEMPLATE_HEADERS = new Set([
  "template",
  "templatename",
  "packagetemplate",
  "packagename",
  "套餐",
  "套餐名",
  "套餐名称",
  "套餐模板",
  "模板",
]);
const TOTAL_TIMES_HEADERS = new Set(["totaltimes", "total", "总次数", "次数"]);
const USED_TIMES_HEADERS = new Set(["usedtimes", "used", "已用次数", "已使用", "已用"]);
const WEIGHT_LIMIT_HEADERS = new Set([
  "weightlimitjin",
  "weight",
  "单次斤数",
  "每次斤数",
  "蔬菜斤数",
  "斤数",
]);

export type ParsedMemberImportRow = {
  disabledReason?: string | null;
  nickname?: string | null;
  phone: string;
  remark?: string | null;
  rowNumber: number;
  status?: BindingStatus | null;
};

export type ParsedUserPackageImportRow = {
  address?: string | null;
  city?: string | null;
  detail?: string | null;
  district?: string | null;
  nickname?: string | null;
  phone: string;
  province?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  remark?: string | null;
  rowNumber: number;
  status?: PackageStatus | null;
  templateName: string;
  totalTimes?: number | null;
  usedTimes?: number | null;
  weightLimitJin?: number | null;
};

function extensionOf(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function ensureSupportedFile(file: File) {
  const extension = extensionOf(file.name);
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error("仅支持 .xlsx、.xls、.csv 文件");
  }

  if (file.size <= 0) {
    throw new Error("导入文件为空");
  }

  if (file.size > MAX_IMPORT_FILE_SIZE) {
    throw new Error("导入文件不能超过 5MB");
  }
}

function normalizeHeader(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function optionalCell(value: string | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
}

function cellAt(cells: string[], index: number | undefined) {
  return index !== undefined && index >= 0 ? cells[index] : undefined;
}

function numberCell(value: string | undefined) {
  const normalized = value?.trim().replace(/[斤次]/g, "");
  if (!normalized) {
    return null;
  }

  const nextValue = Number(normalized);
  return Number.isFinite(nextValue) ? nextValue : null;
}

function hasHeader(cells: string[], candidates: Set<string>) {
  return cells.some((cell) => candidates.has(normalizeHeader(cell)));
}

function resolveHeaderIndexes(
  headers: string[],
  mapping: Record<string, Set<string>>,
) {
  const normalizedHeaders = headers.map(normalizeHeader);
  return Object.fromEntries(
    Object.entries(mapping).map(([key, candidates]) => [
      key,
      normalizedHeaders.findIndex((header) => candidates.has(header)),
    ]),
  ) as Record<string, number>;
}

function normalizeMemberStatus(value: string | undefined): BindingStatus | null {
  const status = value?.trim().toLowerCase();
  if (!status) {
    return null;
  }

  if (["active", "正常", "启用", "可服务"].includes(status)) {
    return "ACTIVE";
  }

  if (["disabled", "停用", "禁用", "已停用", "不可服务"].includes(status)) {
    return "DISABLED";
  }

  return null;
}

function normalizePackageStatus(value: string | undefined): PackageStatus | null {
  const status = value?.trim().toLowerCase();
  if (!status) {
    return null;
  }

  if (["active", "正常", "启用", "可预订", "可用"].includes(status)) {
    return "ACTIVE";
  }

  if (["frozen", "冻结", "已冻结"].includes(status)) {
    return "FROZEN";
  }

  if (["used_up", "usedup", "用完", "已用完"].includes(status)) {
    return "USED_UP";
  }

  if (["expired", "过期", "不可用"].includes(status)) {
    return "EXPIRED";
  }

  return null;
}

export async function readSpreadsheetRows(file: File) {
  ensureSupportedFile(file);
  const extension = extensionOf(file.name);
  const workbook =
    extension === ".csv"
      ? read(await file.text(), { cellDates: true, type: "string" })
      : read(Buffer.from(await file.arrayBuffer()), {
          cellDates: true,
          type: "buffer",
        });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return [];
  }

  const rows = utils.sheet_to_json<unknown[]>(sheet, {
    blankrows: false,
    defval: "",
    header: 1,
    raw: false,
  });

  return rows
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some(Boolean));
}

export function parseMemberImportRows(rows: string[][]): ParsedMemberImportRow[] {
  if (rows.length === 0) {
    return [];
  }

  const firstRow = rows[0] ?? [];
  const startsWithHeader = hasHeader(firstRow, PHONE_HEADERS);
  const indexes = startsWithHeader
    ? resolveHeaderIndexes(firstRow, {
        disabledReason: DISABLED_REASON_HEADERS,
        nickname: NICKNAME_HEADERS,
        phone: PHONE_HEADERS,
        remark: REMARK_HEADERS,
        status: STATUS_HEADERS,
      })
    : {
        disabledReason: 4,
        nickname: 1,
        phone: 0,
        remark: 2,
        status: 3,
      };
  const dataRows = startsWithHeader ? rows.slice(1) : rows;
  const rowNumberOffset = startsWithHeader ? 2 : 1;

  return dataRows
    .map((cells, index) => ({
      disabledReason: optionalCell(cellAt(cells, indexes.disabledReason)),
      nickname: optionalCell(cellAt(cells, indexes.nickname)),
      phone: cellAt(cells, indexes.phone)?.trim() ?? "",
      remark: optionalCell(cellAt(cells, indexes.remark)),
      rowNumber: index + rowNumberOffset,
      status: normalizeMemberStatus(cellAt(cells, indexes.status)),
    }))
    .filter((row) => row.phone || row.nickname || row.remark);
}

export function parseUserPackageImportRows(
  rows: string[][],
): ParsedUserPackageImportRow[] {
  if (rows.length === 0) {
    return [];
  }

  const firstRow = rows[0] ?? [];
  const startsWithHeader =
    hasHeader(firstRow, PHONE_HEADERS) && hasHeader(firstRow, TEMPLATE_HEADERS);
  const indexes = startsWithHeader
    ? resolveHeaderIndexes(firstRow, {
        address: ADDRESS_HEADERS,
        city: CITY_HEADERS,
        detail: DETAIL_HEADERS,
        district: DISTRICT_HEADERS,
        nickname: NICKNAME_HEADERS,
        phone: PHONE_HEADERS,
        province: PROVINCE_HEADERS,
        receiverName: RECEIVER_NAME_HEADERS,
        receiverPhone: RECEIVER_PHONE_HEADERS,
        remark: REMARK_HEADERS,
        status: STATUS_HEADERS,
        templateName: TEMPLATE_HEADERS,
        totalTimes: TOTAL_TIMES_HEADERS,
        usedTimes: USED_TIMES_HEADERS,
        weightLimitJin: WEIGHT_LIMIT_HEADERS,
      })
    : {
        address: 5,
        city: 3,
        detail: 5,
        district: 4,
        nickname: 1,
        phone: 0,
        province: 2,
        receiverName: -1,
        receiverPhone: -1,
        remark: 10,
        status: 9,
        templateName: 6,
        totalTimes: 7,
        usedTimes: 8,
        weightLimitJin: -1,
      };
  const dataRows = startsWithHeader ? rows.slice(1) : rows;
  const rowNumberOffset = startsWithHeader ? 2 : 1;

  return dataRows
    .map((cells, index) => ({
      address: optionalCell(cellAt(cells, indexes.address)),
      city: optionalCell(cellAt(cells, indexes.city)),
      detail: optionalCell(cellAt(cells, indexes.detail)),
      district: optionalCell(cellAt(cells, indexes.district)),
      nickname: optionalCell(cellAt(cells, indexes.nickname)),
      phone: cellAt(cells, indexes.phone)?.trim() ?? "",
      province: optionalCell(cellAt(cells, indexes.province)),
      receiverName: optionalCell(cellAt(cells, indexes.receiverName)),
      receiverPhone: optionalCell(cellAt(cells, indexes.receiverPhone)),
      remark: optionalCell(cellAt(cells, indexes.remark)),
      rowNumber: index + rowNumberOffset,
      status: normalizePackageStatus(cellAt(cells, indexes.status)),
      templateName: cellAt(cells, indexes.templateName)?.trim() ?? "",
      totalTimes: numberCell(cellAt(cells, indexes.totalTimes)),
      usedTimes: numberCell(cellAt(cells, indexes.usedTimes)),
      weightLimitJin: numberCell(cellAt(cells, indexes.weightLimitJin)),
    }))
    .filter(
      (row) =>
        row.phone ||
        row.templateName ||
        row.nickname ||
        row.address ||
        row.province ||
        row.remark,
    );
}
