import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getTeamActor, getTeamMembership } from "@/lib/authz";
import { canDeleteTeam } from "@/lib/authz-rules";
import { teamMembersInclude } from "@/lib/data";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  if (!auth.profile.isAdmin && !(await getTeamMembership(auth.session.user.id, teamId))) {
    return apiError("notFound", 404);
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      ...teamMembersInclude,
      _count: { select: { cards: true } },
    },
  });

  if (!team) return apiError("notFound", 404);

  return NextResponse.json(team);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
  if (!team) return apiError("notFound", 404);

  const actor = await getTeamActor(auth.session.user.id, teamId, auth.profile.isAdmin);
  if (!actor) return apiError("notFound", 404);

  if (!canDeleteTeam(actor)) {
    return apiError("deleteForbidden", 403);
  }

  await prisma.team.delete({ where: { id: teamId } });
  return NextResponse.json({ ok: true });
}
