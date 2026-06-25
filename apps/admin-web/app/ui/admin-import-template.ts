import { utils, write } from "xlsx";

type TemplateCell = number | string;

export function downloadXlsxTemplate(
  fileName: string,
  sheetName: string,
  headers: string[],
  rows: Array<Record<string, TemplateCell>>,
) {
  const worksheet = utils.json_to_sheet(rows, { header: headers });
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, sheetName);
  const data = write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
