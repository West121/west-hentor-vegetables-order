import { ok } from "@/app/lib/api";

export async function GET() {
  return ok({
    service: "hentor-admin-web",
    status: "ok",
    checkedAt: new Date().toISOString(),
  });
}
