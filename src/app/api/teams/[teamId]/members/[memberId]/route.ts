import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getTeamActor } from "@/lib/authz";
import { canChangeRole, hasTeamRole, type TeamActor } from "@/lib/authz-rules";
import type { TeamRole } from "@/lib/team-roles";
import { updateMemberRoleSchema } from "@/lib/schemas/team";
import { parseJsonBody } from "@/lib/schemas/parse";

type RouteContext = { params: Promise<{ teamId: string; memberId: string }> };

/** Change le rôle d'un membre (OWNER de l'équipe ou admin du site). */
export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId, memberId } = await params;

  const actor = await getTeamActor(auth.session.user.id, teamId, auth.profile.isAdmin);
  if (!actor) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!hasTeamRole(actor, "OWNER")) {
    return NextResponse.json(
      { error: "Seul le propriétaire de l'équipe peut changer les rôles" },
      { status: 403 }
    );
  }

  const parsed = await parseJsonBody(req, updateMemberRoleSchema);
  if (!parsed.ok) return parsed.response;
  const { role } = parsed.data;

  try {
    return await updateRole(actor, teamId, memberId, role);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return NextResponse.json({ error: "Modification concurrente, réessaie" }, { status: 409 });
    }
    throw err;
  }
}

async function updateRole(actor: TeamActor, teamId: string, memberId: string, role: TeamRole) {
  // Sérialisable : deux OWNER qui se rétrogradent en même temps ne vident pas l'équipe
  const result = await prisma.$transaction(
    async (tx) => {
      const target = await tx.teamMember.findFirst({
        where: { id: memberId, teamId },
        select: { id: true, role: true },
      });
      if (!target) return { status: 404, error: "Membre introuvable" } as const;

      const ownerCount = await tx.teamMember.count({ where: { teamId, role: "OWNER" } });
      if (!canChangeRole(actor, target, role, ownerCount)) {
        return { status: 409, error: "L'équipe doit garder au moins un propriétaire" } as const;
      }

      const member = await tx.teamMember.update({
        where: { id: target.id },
        data: { role },
        select: { id: true, role: true },
      });
      return { status: 200, member } as const;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  if (result.status !== 200) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.member);
}
