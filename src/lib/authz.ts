import { prisma } from "./prisma";
import type { TeamActor } from "./authz-rules";

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
 * Acteur d'une équipe (rôle + statut admin du site).
 * Retourne null si l'utilisateur n'est ni membre ni admin du site.
 */
export async function getTeamActor(
  userId: string,
  teamId: string,
  isSiteAdmin: boolean
): Promise<TeamActor | null> {
  const membership = await getTeamMembership(userId, teamId);
  if (!membership && !isSiteAdmin) return null;
  return { userId, role: membership?.role ?? null, isSiteAdmin };
}

/**
 * Vérifie qu'un utilisateur appartient à l'équipe propriétaire d'une grille.
 * Retourne la grille avec son teamId et le rôle du membre, ou null.
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

  return { ...card, role: membership.role };
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
