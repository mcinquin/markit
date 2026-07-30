import { prisma } from "@/lib/prisma";

export async function getUserTeams(userId: string) {
  return prisma.team.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      _count: { select: { cards: true } },
    },
    orderBy: { createdAt: "desc" },
  });
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
