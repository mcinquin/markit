import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const memberUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} satisfies Prisma.UserSelect;

export const teamMembersInclude = {
  members: { include: { user: { select: memberUserSelect } } },
} satisfies Prisma.TeamInclude;

/** Données nécessaires à l'écran de jeu (sans dates ni emails des membres). */
export const playCardSelect = {
  id: true,
  label: true,
  rows: true,
  cols: true,
  freeCenter: true,
  isActive: true,
  team: { select: { id: true, name: true } },
  cells: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      position: true,
      phrase: { select: { id: true, text: true, emoji: true } },
      checked: {
        select: { id: true, userId: true, user: { select: { id: true, name: true } } },
      },
    },
  },
} satisfies Prisma.BingoCardSelect;

export type PlayCard = Prisma.BingoCardGetPayload<{ select: typeof playCardSelect }>;
export type PlayCell = PlayCard["cells"][number];

const teamCardSummarySelect = {
  id: true,
  label: true,
  rows: true,
  cols: true,
  isActive: true,
  createdAt: true,
  createdById: true,
  playedAt: true,
  cells: { select: { checked: { select: { id: true } } } },
} satisfies Prisma.BingoCardSelect;

export type TeamCardSummary = Prisma.BingoCardGetPayload<{
  select: typeof teamCardSummarySelect;
}>;

const teamOverviewSelect = {
  id: true,
  name: true,
  inviteCode: true,
  createdById: true,
  _count: { select: { members: true } },
} satisfies Prisma.TeamSelect;

export type TeamOverview = Prisma.TeamGetPayload<{ select: typeof teamOverviewSelect }>;

const phraseSelect = {
  id: true,
  text: true,
  emoji: true,
  isDefault: true,
} satisfies Prisma.PhraseSelect;

export type TeamPhrase = Prisma.PhraseGetPayload<{ select: typeof phraseSelect }>;

export async function getUserTeams(userId: string) {
  return prisma.team.findMany({
    where: { members: { some: { userId } } },
    include: {
      ...teamMembersInclude,
      _count: { select: { cards: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTeamOverview(teamId: string) {
  return prisma.team.findUnique({ where: { id: teamId }, select: teamOverviewSelect });
}

export async function getTeamCards(teamId: string) {
  return prisma.bingoCard.findMany({
    where: { teamId },
    select: teamCardSummarySelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function getPlayCard(cardId: string) {
  return prisma.bingoCard.findUnique({ where: { id: cardId }, select: playCardSelect });
}

/** Phrases globales + phrases personnalisées de l'équipe. */
export async function getTeamPhrases(teamId: string) {
  const [defaults, custom] = await Promise.all([
    prisma.phrase.findMany({
      where: { isDefault: true },
      select: phraseSelect,
      orderBy: { text: "asc" },
    }),
    prisma.phrase.findMany({
      where: { teamId, isDefault: false },
      select: phraseSelect,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { defaults, custom };
}

export async function getAdminUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      createdAt: true,
      teams: {
        select: {
          role: true,
          team: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function getAdminInvites() {
  return prisma.inviteToken.findMany({
    orderBy: { expiresAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });
}
