import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAccountProfile } from "@/lib/account";

/** Session requise ; redirige vers la connexion si absent. */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  return session;
}

/**
 * Compte prêt à utiliser l'app (mot de passe définitif).
 * Redirige vers /account si première connexion en attente.
 */
export async function requireAccountReady() {
  const session = await requireSession();
  const profile = await getAccountProfile(session.user.id);

  if (profile?.mustChangePassword) {
    redirect("/account");
  }

  return { session, profile };
}
