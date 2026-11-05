import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAccountProfile } from "@/lib/account";

/** Layout et page appellent les gardes dans la même requête : une seule lecture session / BDD. */
const getCachedSession = cache(() => getServerSession(authOptions));
const getCachedProfile = cache(getAccountProfile);

/** Session requise ; redirige vers la connexion si absent. */
export async function requireSession() {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  return session;
}

/** Profil du compte connecté (sans exiger un compte prêt). */
export async function getSessionProfile() {
  const session = await requireSession();
  return getCachedProfile(session.user.id);
}

/**
 * Compte prêt à utiliser l'app (mot de passe définitif).
 * Redirige vers /account si première connexion en attente.
 * Redirige vers /signin si le JWT ne correspond plus à un user (BDD reset, etc.).
 */
export async function requireAccountReady() {
  const session = await requireSession();
  const profile = await getCachedProfile(session.user.id);

  if (!profile) {
    redirect("/auth/signin");
  }

  if (profile.mustChangePassword) {
    redirect("/account");
  }

  return { session, profile };
}

/**
 * Compte prêt + administrateur ; redirige vers /dashboard sinon.
 * À appeler dans chaque page admin : un layout seul ne protège pas ses pages.
 */
export async function requireAdmin() {
  const context = await requireAccountReady();
  if (!context.profile.isAdmin) {
    redirect("/dashboard");
  }
  return context;
}
