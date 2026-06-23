import { importStoreMembers, MemberServiceError } from "@hentor/db";

import {
  getPermissionFailure,
  getStoreAccessFailure,
} from "@/app/lib/admin-access";
import { fail, ok } from "@/app/lib/api";
import {
  parseMemberImportRows,
  readSpreadsheetRows,
} from "@/app/lib/spreadsheet-import";
import { getAdminSession } from "@/app/lib/session";

export const runtime = "nodejs";

function statusForMemberError(code: string) {
  return code.endsWith("_NOT_FOUND") ? 404 : 400;
}

function getUploadedFile(value: FormDataEntryValue | null) {
  return value instanceof File ? value : null;
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return fail("INVALID_PARAMS", "导入参数不完整");
  }

  const storeId = String(formData.get("storeId") ?? "").trim();
  const file = getUploadedFile(formData.get("file"));
  if (!storeId || !file) {
    return fail("INVALID_PARAMS", "请上传会员导入文件");
  }

  const permissionFailure = await getPermissionFailure(
    session.adminUserId,
    "members.write",
  );
  if (permissionFailure) {
    return permissionFailure;
  }

  const accessFailure = await getStoreAccessFailure(session.adminUserId, storeId);
  if (accessFailure) {
    return accessFailure;
  }

  try {
    const rows = parseMemberImportRows(await readSpreadsheetRows(file));
    if (rows.length === 0) {
      return fail("INVALID_PARAMS", "导入文件没有可识别的会员数据");
    }

    const result = await importStoreMembers({
      operatorId: session.adminUserId,
      rows,
      storeId,
    });

    return ok({ result });
  } catch (error) {
    if (error instanceof MemberServiceError) {
      return fail(error.code, error.message, statusForMemberError(error.code));
    }

    if (error instanceof Error) {
      return fail("INVALID_IMPORT_FILE", error.message);
    }

    throw error;
  }
}
