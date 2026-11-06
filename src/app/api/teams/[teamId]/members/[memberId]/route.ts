import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError } from "@/lib/api-errors";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getTeamActor } from "@/lib/authz";
import {
  canChangeRole,
  canRemoveMember,
  hasTeamRole,
  type TeamActor,
} from "@/lib/authz-rules";
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
  if (!actor) return apiError("notFound", 404);
  if (!hasTeamRole(actor, "OWNER")) {
    return apiError("ownerOnlyRoles", 403);
  }

  const parsed = await parseJsonBody(req, updateMemberRoleSchema);
  if (!parsed.ok) return parsed.response;
  const { role } = parsed.data;

  try {
    return await updateRole(actor, teamId, memberId, role);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return apiError("concurrentUpdate", 409);
    }
    throw err;
  }
}

/**
 * Retire un membre (ADMIN+) ou quitte l'équipe (soi-même).
 * Le dernier OWNER doit d'abord transférer la propriété.
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId, memberId } = await params;

  const actor = await getTeamActor(auth.session.user.id, teamId, auth.profile.isAdmin);
  if (!actor) return apiError("notFound", 404);

  try {
    return await removeMember(actor, teamId, memberId);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return apiError("concurrentUpdate", 409);
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
      if (!target) return { status: 404, error: "memberNotFound" } as const;

      const ownerCount = await tx.teamMember.count({ where: { teamId, role: "OWNER" } });
      if (!canChangeRole(actor, target, role, ownerCount)) {
        return { status: 409, error: "lastOwner" } as const;
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
    return apiError(result.error, result.status);
  }
  return NextResponse.json(result.member);
}

async function removeMember(actor: TeamActor, teamId: string, memberId: string) {
  const result = await prisma.$transaction(
    async (tx) => {
      const target = await tx.teamMember.findFirst({
        where: { id: memberId, teamId },
        select: { id: true, userId: true, role: true },
      });
      if (!target) return { status: 404, error: "memberNotFound" } as const;

      const ownerCount = await tx.teamMember.count({ where: { teamId, role: "OWNER" } });
      if (!canRemoveMember(actor, target, ownerCount)) {
        const isLastOwner = target.role === "OWNER" && ownerCount <= 1;
        if (isLastOwner) return { status: 409, error: "lastOwner" } as const;
        return { status: 403, error: "deleteForbidden" } as const;
      }

      await tx.teamMember.delete({ where: { id: target.id } });
      return { status: 200, left: target.userId === actor.userId } as const;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  if (result.status !== 200) {
    return apiError(result.error, result.status);
  }
  return NextResponse.json({ ok: true, left: result.left });
}
