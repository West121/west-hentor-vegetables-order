import { describe, expect, it } from "vitest";

import { parseMemberImportText } from "./member-import-parser";

describe("member import parser", () => {
  it("parses pasted spreadsheet rows with a Chinese header", () => {
    const rows = parseMemberImportText(
      [
        "手机号\t姓名\t备注\t状态\t停用原因",
        "15295081992\t张建国\t8斤周套餐\t正常\t",
        "13800001111\t李四\t暂停配送\t停用\t长期不在家",
      ].join("\n"),
    );

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

  it("parses CSV rows without a header", () => {
    const rows = parseMemberImportText(
      "15295081992,张建国,老客户,ACTIVE\n13800001111,李四,,DISABLED",
    );

    expect(rows).toMatchObject([
      {
        nickname: "张建国",
        phone: "15295081992",
        remark: "老客户",
        rowNumber: 1,
        status: "ACTIVE",
      },
      {
        nickname: "李四",
        phone: "13800001111",
        remark: null,
        rowNumber: 2,
        status: "DISABLED",
      },
    ]);
  });
});
