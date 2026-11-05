import { NextResponse } from "next/server";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { canDeleteOwnedResource, getTeamMembership } from "@/lib/authz";
import { teamMembersInclude } from "@/lib/data";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  if (!auth.profile.isAdmin && !(await getTeamMembership(auth.session.user.id, teamId))) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      ...teamMembersInclude,
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

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { createdById: true },
  });
  if (!team) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (!canDeleteOwnedResource(auth.session.user.id, team.createdById, auth.profile.isAdmin)) {
    return NextResponse.json({ error: "Suppression non autorisée" }, { status: 403 });
  }

  await prisma.team.delete({ where: { id: teamId } });
  return NextResponse.json({ ok: true });
}
