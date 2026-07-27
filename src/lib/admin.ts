import { prisma } from "./prisma";

/**
 * Vérifie qu'un utilisateur est administrateur.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return user?.isAdmin ?? false;
}
