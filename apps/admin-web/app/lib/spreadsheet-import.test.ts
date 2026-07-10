import { describe, expect, it } from "vitest";
import { utils, write } from "xlsx";

import {
  parseMemberImportRows,
  parseUserPackageImportRows,
  readSpreadsheetRows,
} from "./spreadsheet-import";

function buildXlsxFile(rows: string[][], fileName: string) {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), "导入数据");
  const buffer = write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
  const arrayBuffer = new ArrayBuffer(buffer.length);
  new Uint8Array(arrayBuffer).set(buffer);

  return new File([arrayBuffer], fileName, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("spreadsheet import helpers", () => {
  it("reads xlsx member files and maps Chinese headers", async () => {
    const file = buildXlsxFile(
      [
        ["手机号", "姓名", "备注", "状态", "停用原因"],
        ["15295081992", "张建国", "8斤周套餐", "正常", ""],
        ["13800001111", "李四", "暂停配送", "停用", "长期不在家"],
      ],
      "members.xlsx",
    );

    const rows = parseMemberImportRows(await readSpreadsheetRows(file));

    expect(rows).toEqual([
      {
        disabledReason: null,
        nickname: "张建国",
        phone: "15295081992",
        remark: "8斤周套餐",
        rowNumber: 2,
        status: "ACTIVE",
      },
      {
        disabledReason: "长期不在家",
        nickname: "李四",
        phone: "13800001111",
        remark: "暂停配送",
        rowNumber: 3,
        status: "DISABLED",
      },
    ]);
  });

  it("parses member package import rows with template and usage fields", async () => {
    const file = buildXlsxFile(
      [
        [
          "手机号",
          "昵称",
          "省",
          "市",
          "区",
          "详细地址",
          "套餐名称",
          "总次数",
          "已用次数",
          "状态",
          "备注",
        ],
        [
          "15295081992",
          "张三",
          "江苏省",
          "南京市",
          "六合区",
          "龙池街道冠城大通",
          "8斤周套餐",
          "8",
          "1",
          "正常",
          "补录",
        ],
      ],
      "packages.xlsx",
    );

    const rows = parseUserPackageImportRows(await readSpreadsheetRows(file));

    expect(rows).toEqual([
      {
        address: "龙池街道冠城大通",
        city: "南京市",
        detail: "龙池街道冠城大通",
        district: "六合区",
        nickname: "张三",
        phone: "15295081992",
        province: "江苏省",
        receiverName: null,
        receiverPhone: null,
        remark: "补录",
        rowNumber: 2,
        status: "ACTIVE",
        templateName: "8斤周套餐",
        totalTimes: 8,
        usedTimes: 1,
        weightLimitJin: null,
      },
    ]);
  });

  it("supports csv files without a header", async () => {
    const file = new File(
      [
        "15295081992,张三,江苏省,南京市,六合区,龙池街道冠城大通,8斤周套餐,8,1,ACTIVE,补录",
      ],
      "packages.csv",
      { type: "text/csv" },
    );

    const rows = parseUserPackageImportRows(await readSpreadsheetRows(file));

    expect(rows).toMatchObject([
      {
        address: "龙池街道冠城大通",
        city: "南京市",
        detail: "龙池街道冠城大通",
        district: "六合区",
        nickname: "张三",
        phone: "15295081992",
        province: "江苏省",
        remark: "补录",
        rowNumber: 1,
        status: "ACTIVE",
        templateName: "8斤周套餐",
        totalTimes: 8,
        usedTimes: 1,
        weightLimitJin: null,
      },
    ]);
  });
});
