import {
  createDishImageObjectKey,
  uploadObject,
} from "@/app/lib/object-storage";
import { fail, ok } from "@/app/lib/api";
import { getAdminSession } from "@/app/lib/session";

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return fail("UNAUTHORIZED", "请先登录", 401);
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return fail("INVALID_PARAMS", "请选择图片");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return fail("IMAGE_TYPE_INVALID", "仅支持 jpg、png、webp、avif 图片");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return fail("IMAGE_TOO_LARGE", "图片不能超过 3MB");
  }

  const key = createDishImageObjectKey({ fileName: file.name });
  const uploadResult = await uploadObject({
    contentType: file.type,
    key,
    value: Buffer.from(await file.arrayBuffer()),
  });

  return ok({
    image: {
      key: uploadResult.key,
      url: uploadResult.url,
    },
  });
}
