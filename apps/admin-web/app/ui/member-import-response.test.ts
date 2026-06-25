import { describe, expect, it } from "vitest";

import { getImportResultFromApiPayload } from "./member-import-response";

type ImportResultStub = {
  importedRows: number;
  totalRows: number;
};

describe("member import response parsing", () => {
  it("accepts the Spring import result returned directly under data", () => {
    const result = getImportResultFromApiPayload<ImportResultStub>({
      data: {
        importedRows: 1,
        totalRows: 1,
      },
      success: true,
    });

    expect(result).toEqual({
      importedRows: 1,
      totalRows: 1,
    });
  });

  it("keeps compatibility with nested result payloads", () => {
    const result = getImportResultFromApiPayload<ImportResultStub>({
      data: {
        result: {
          importedRows: 2,
          totalRows: 3,
        },
      },
      success: true,
    });

    expect(result).toEqual({
      importedRows: 2,
      totalRows: 3,
    });
  });

  it("returns null when the response does not include a usable result", () => {
    expect(
      getImportResultFromApiPayload<ImportResultStub>({
        data: null,
        success: true,
      }),
    ).toBeNull();
  });
});
