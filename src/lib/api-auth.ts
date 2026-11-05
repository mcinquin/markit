import type { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAccountProfile, type AccountProfile } from "@/lib/account";
import { apiError } from "@/lib/api-errors";

type ApiAuthFailure = {
  ok: false;
  response: NextResponse;
};

type ApiSessionAuth = { ok: true; session: Session };
type ApiAccountAuth = ApiSessionAuth & { profile: AccountProfile };

export type ApiAuthResult<T extends ApiSessionAuth = ApiSessionAuth> = T | ApiAuthFailure;

/** Session requise ; 401 sinon. */
export async function requireApiSession(): Promise<ApiAuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, response: await apiError("unauthorized", 401) };
  }
  return { ok: true, session };
}

/**
 * Compte prêt (mot de passe définitif).
 * 401 si non authentifié, 403 si mustChangePassword.
 */
export async function requireApiAccountReady(): Promise<ApiAuthResult<ApiAccountAuth>> {
  const auth = await requireApiSession();
  if (!auth.ok) return auth;

  const profile = await getAccountProfile(auth.session.user.id);
  // JWT périmé / user recréé après reset BDD → 401 (pas 404 « équipe »)
  if (!profile) {
    return {
      ok: false,
      response: await apiError("invalidSession", 401, { code: "INVALID_SESSION" }),
    };
  }

  if (profile.mustChangePassword) {
    return {
      ok: false,
      response: await apiError("accountSetupRequired", 403, { code: "MUST_CHANGE_PASSWORD" }),
    };
  }

  return { ok: true, session: auth.session, profile };
}

/** Admin + compte prêt. */
export async function requireApiAdmin(): Promise<ApiAuthResult<ApiAccountAuth>> {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth;

  if (!auth.profile.isAdmin) {
    return { ok: false, response: await apiError("adminRequired", 403) };
  }

  return auth;
}
