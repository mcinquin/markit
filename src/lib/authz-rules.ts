/**
 * Règles d'autorisation pures (sans Prisma) : utilisables côté serveur et dans les composants client.
 * L'admin du site a tous les droits sur toutes les équipes.
 */
import { TEAM_ROLES, type TeamRole } from "./team-roles";

/** Utilisateur agissant sur une équipe : `role` est null s'il n'en est pas membre. */
export type TeamActor = {
  userId: string;
  role: TeamRole | null;
  isSiteAdmin: boolean;
};

/** Rôle au moins égal à `min` (MEMBER < ADMIN < OWNER), ou admin du site. */
export function hasTeamRole(actor: TeamActor, min: TeamRole): boolean {
  if (actor.isSiteAdmin) return true;
  if (!actor.role) return false;
  return TEAM_ROLES.indexOf(actor.role) >= TEAM_ROLES.indexOf(min);
}

/** Modifier ou supprimer les phrases personnalisées de l'équipe. */
export function canManagePhrases(actor: TeamActor): boolean {
  return hasTeamRole(actor, "ADMIN");
}

/** Créateur de la grille (encore membre), ou ADMIN et plus. */
export function canDeleteCard(actor: TeamActor, createdById: string | null): boolean {
  if (hasTeamRole(actor, "ADMIN")) return true;
  return actor.role !== null && createdById === actor.userId;
}

export function canDeleteTeam(actor: TeamActor): boolean {
  return hasTeamRole(actor, "OWNER");
}

/**
 * OWNER (ou admin du site) qui change le rôle d'un membre.
 * L'équipe doit garder au moins un OWNER : `ownerCount` est le nombre actuel d'OWNER.
 */
export function canChangeRole(
  actor: TeamActor,
  target: { role: TeamRole },
  nextRole: TeamRole,
  ownerCount: number
): boolean {
  if (!hasTeamRole(actor, "OWNER")) return false;
  if (target.role === "OWNER" && nextRole !== "OWNER" && ownerCount <= 1) return false;
  return true;
}

/**
 * Retirer un membre (ADMIN+) ou quitter soi-même.
 * Le dernier OWNER ne peut pas partir / être retiré : il doit d'abord transférer la propriété.
 * Un ADMIN ne peut pas retirer un OWNER (seul un OWNER / admin du site le peut).
 */
export function canRemoveMember(
  actor: TeamActor,
  target: { userId: string; role: TeamRole },
  ownerCount: number
): boolean {
  if (target.role === "OWNER" && ownerCount <= 1) return false;

  const isSelf = target.userId === actor.userId;
  if (isSelf) return actor.role !== null;

  if (!hasTeamRole(actor, "ADMIN")) return false;
  if (target.role === "OWNER" && !hasTeamRole(actor, "OWNER")) return false;
  return true;
}

/** Régénérer le code d'invitation : OWNER (ou admin du site). */
export function canRegenerateInviteCode(actor: TeamActor): boolean {
  return hasTeamRole(actor, "OWNER");
}
