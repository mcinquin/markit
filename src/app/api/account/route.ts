import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { requireApiSession } from "@/lib/api-auth";
import { getAccountProfile, updateAccount } from "@/lib/account";
import { updateAccountSchema } from "@/lib/schemas/account";
import { parseJsonBody } from "@/lib/schemas/parse";
import { LOCALE_COOKIE } from "@/i18n/config";

const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export async function GET() {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const profile = await getAccountProfile(auth.session.user.id);
  if (!profile) {
    return apiError("accountNotFound", 404);
  }

  return NextResponse.json(profile);
}

export async function PATCH(req: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(req, updateAccountSchema);
  if (!parsed.ok) return parsed.response;

  const result = await updateAccount(auth.session.user.id, parsed.data);

  if (!result.ok) {
    return apiError(result.error, result.status);
  }

  const res = NextResponse.json(result.profile);
  if (parsed.data.locale) {
    // Garde la langue après déconnexion (pages publiques)
    res.cookies.set(LOCALE_COOKIE, result.profile.locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }
  return res;
}
