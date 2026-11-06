import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { apiError } from "@/lib/api-errors";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getTeamActor } from "@/lib/authz";
import { canRegenerateInviteCode } from "@/lib/authz-rules";

type RouteContext = { params: Promise<{ teamId: string }> };

const MAX_INVITE_ATTEMPTS = 5;

/** Régénère le code d'invitation (OWNER de l'équipe ou admin du site). */
export async function POST(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  const actor = await getTeamActor(auth.session.user.id, teamId, auth.profile.isAdmin);
  if (!actor) return apiError("notFound", 404);
  if (!canRegenerateInviteCode(actor)) {
    return apiError("inviteCodeForbidden", 403);
  }

  for (let attempt = 0; attempt < MAX_INVITE_ATTEMPTS; attempt++) {
    const inviteCode = nanoid();
    try {
      const team = await prisma.team.update({
        where: { id: teamId },
        data: { inviteCode },
        select: { inviteCode: true },
      });
      return NextResponse.json(team);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue;
      }
      throw err;
    }
  }

  return apiError("serverError", 500);
}
