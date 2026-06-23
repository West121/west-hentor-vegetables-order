export type ParsedMemberImportRow = {
  disabledReason?: string | null;
  nickname?: string | null;
  phone: string;
  remark?: string | null;
  rowNumber: number;
  status?: "ACTIVE" | "DISABLED" | null;
};

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
const STATUS_HEADERS = new Set(["status", "状态", "服务状态"]);
const DISABLED_REASON_HEADERS = new Set([
  "disabledreason",
  "disabled_reason",
  "停用原因",
  "禁用原因",
]);

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function normalizeStatus(
  value: string | undefined,
): ParsedMemberImportRow["status"] {
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

function optionalCell(value: string | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : null;
}

function hasHeader(cells: string[]) {
  return cells.some((cell) => PHONE_HEADERS.has(normalizeHeader(cell)));
}

function resolveHeaderIndexes(headers: string[]) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const findIndex = (candidates: Set<string>) =>
    normalizedHeaders.findIndex((header) => candidates.has(header));

  return {
    disabledReason: findIndex(DISABLED_REASON_HEADERS),
    nickname: findIndex(NICKNAME_HEADERS),
    phone: findIndex(PHONE_HEADERS),
    remark: findIndex(REMARK_HEADERS),
    status: findIndex(STATUS_HEADERS),
  };
}

export function parseMemberImportText(text: string): ParsedMemberImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ",";
  const rows = lines.map((line) => splitDelimitedLine(line, delimiter));
  const firstRow = rows[0] ?? [];
  const startsWithHeader = hasHeader(firstRow);
  const indexes = startsWithHeader
    ? resolveHeaderIndexes(firstRow)
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
      disabledReason:
        indexes.disabledReason >= 0
          ? optionalCell(cells[indexes.disabledReason])
          : null,
      nickname:
        indexes.nickname >= 0 ? optionalCell(cells[indexes.nickname]) : null,
      phone: indexes.phone >= 0 ? cells[indexes.phone]?.trim() ?? "" : "",
      remark: indexes.remark >= 0 ? optionalCell(cells[indexes.remark]) : null,
      rowNumber: index + rowNumberOffset,
      status:
        indexes.status >= 0 ? normalizeStatus(cells[indexes.status]) : null,
    }))
    .filter((row) => row.phone || row.nickname || row.remark);
}
