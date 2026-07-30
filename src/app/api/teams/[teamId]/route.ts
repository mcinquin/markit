import { NextResponse } from "next/server";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { canDeleteTeam, getTeamMembership } from "@/lib/authz";
import { isAdmin } from "@/lib/admin";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;
  const userId = auth.session.user.id;

  const [membership, userIsAdmin] = await Promise.all([
    getTeamMembership(userId, teamId),
    isAdmin(userId),
  ]);

  if (!membership && !userIsAdmin) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      _count: { select: { cards: true } },
    },
  });

  if (!team) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json(team);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;
  const userId = auth.session.user.id;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, createdById: true },
  });
  if (!team) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (!(await canDeleteTeam(userId, teamId))) {
    return NextResponse.json({ error: "Suppression non autorisée" }, { status: 403 });
  }

  await prisma.team.delete({ where: { id: teamId } });
  return NextResponse.json({ ok: true });
}
