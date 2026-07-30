import { prisma } from "./prisma";
import { isAdmin } from "./admin";

/**
 * Vérifie qu'un utilisateur est membre d'une équipe.
 * Retourne le membership ou null.
 */
export async function getTeamMembership(userId: string, teamId: string) {
  return prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
}

/**
 * Vérifie qu'un utilisateur appartient à l'équipe propriétaire d'une grille.
 * Retourne la grille avec son teamId ou null.
 */
export async function getCardIfMember(userId: string, cardId: string) {
  const card = await prisma.bingoCard.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      teamId: true,
      createdById: true,
      rows: true,
      cols: true,
      freeCenter: true,
      isActive: true,
    },
  });
  if (!card) return null;

  const membership = await getTeamMembership(userId, card.teamId);
  if (!membership) return null;

  return card;
}

/**
 * Vérifie qu'un utilisateur appartient à l'équipe propriétaire d'une phrase.
 */
export async function getPhraseIfMember(userId: string, phraseId: string) {
  const phrase = await prisma.phrase.findUnique({ where: { id: phraseId } });
  if (!phrase || phrase.isDefault) return phrase; // Les phrases globales sont accessibles à tous

  if (!phrase.teamId) return null;
  const membership = await getTeamMembership(userId, phrase.teamId);
  return membership ? phrase : null;
}

/** Admin ou créateur de la ressource. */
export function canDeleteOwnedResource(
  userId: string,
  createdById: string | null | undefined,
  userIsAdmin: boolean
): boolean {
  if (userIsAdmin) return true;
  return Boolean(createdById && createdById === userId);
}

export async function canDeleteTeam(userId: string, teamId: string): Promise<boolean> {
  const [team, userIsAdmin] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId }, select: { createdById: true } }),
    isAdmin(userId),
  ]);
  if (!team) return false;
  return canDeleteOwnedResource(userId, team.createdById, userIsAdmin);
}

export async function canDeleteCard(userId: string, cardId: string): Promise<boolean> {
  const [card, userIsAdmin] = await Promise.all([
    prisma.bingoCard.findUnique({ where: { id: cardId }, select: { createdById: true } }),
    isAdmin(userId),
  ]);
  if (!card) return false;
  return canDeleteOwnedResource(userId, card.createdById, userIsAdmin);
}
