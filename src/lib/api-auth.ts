import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAccountProfile, type AccountProfile } from "@/lib/account";
import { isAdmin } from "@/lib/admin";

type ApiAuthSuccess = {
  ok: true;
  session: Session;
  profile?: AccountProfile;
};

type ApiAuthFailure = {
  ok: false;
  response: NextResponse;
};

export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

/** Session requise ; 401 sinon. */
export async function requireApiSession(): Promise<ApiAuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Non autorisé" }, { status: 401 }),
    };
  }
  return { ok: true, session };
}

/**
 * Compte prêt (mot de passe définitif).
 * 401 si non authentifié, 403 si mustChangePassword.
 */
export async function requireApiAccountReady(): Promise<ApiAuthResult> {
  const auth = await requireApiSession();
  if (!auth.ok) return auth;

  const profile = await getAccountProfile(auth.session.user.id);
  // JWT périmé / user recréé après reset BDD → 401 (pas 404 « équipe »)
  if (!profile) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Session invalide, reconnecte-toi", code: "INVALID_SESSION" },
        { status: 401 }
      ),
    };
  }

  if (profile.mustChangePassword) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Configuration du compte requise", code: "MUST_CHANGE_PASSWORD" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, session: auth.session, profile };
}

/** Admin + compte prêt. */
export async function requireApiAdmin(): Promise<ApiAuthResult> {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth;

  if (!(await isAdmin(auth.session.user.id))) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès admin requis" }, { status: 403 }),
    };
  }

  return auth;
}
