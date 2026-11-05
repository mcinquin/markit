/**
 * Règles d'autorisation pures (sans Prisma) : utilisables côté serveur et dans les composants client.
 */

/** Admin ou créateur de la ressource. */
export function canDeleteOwnedResource(
  userId: string | null | undefined,
  createdById: string | null | undefined,
  userIsAdmin: boolean
): boolean {
  if (userIsAdmin) return true;
  return Boolean(userId && createdById && createdById === userId);
}
