import { ok } from "@/app/lib/api";
import { clearAdminSession } from "@/app/lib/session";

export async function POST() {
  await clearAdminSession();
  return ok({ loggedOut: true });
}
