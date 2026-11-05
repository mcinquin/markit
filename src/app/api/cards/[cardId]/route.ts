import { NextResponse } from "next/server";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getCardIfMember, getTeamActor } from "@/lib/authz";
import { canDeleteCard } from "@/lib/authz-rules";
import { getPlayCard } from "@/lib/data";
import { updateCardSchema } from "@/lib/schemas/card";
import { parseJsonBody } from "@/lib/schemas/parse";

type RouteContext = { params: Promise<{ cardId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { cardId } = await params;

  if (!auth.profile.isAdmin && !(await getCardIfMember(auth.session.user.id, cardId))) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const card = await getPlayCard(cardId);
  if (!card) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json(card);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { cardId } = await params;

  const access = await getCardIfMember(auth.session.user.id, cardId);
  if (!access) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const parsed = await parseJsonBody(req, updateCardSchema);
  if (!parsed.ok) return parsed.response;

  const card = await prisma.bingoCard.update({
    where: { id: cardId },
    data: {
      isActive: parsed.data.isActive,
      playedAt: parsed.data.isActive ? new Date() : undefined,
    },
  });

  return NextResponse.json(card);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { cardId } = await params;

  const card = await prisma.bingoCard.findUnique({
    where: { id: cardId },
    select: { teamId: true, createdById: true },
  });
  if (!card) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const actor = await getTeamActor(auth.session.user.id, card.teamId, auth.profile.isAdmin);
  if (!actor) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (!canDeleteCard(actor, card.createdById)) {
    return NextResponse.json({ error: "Suppression non autorisée" }, { status: 403 });
  }

  await prisma.bingoCard.delete({ where: { id: cardId } });
  return NextResponse.json({ ok: true });
}
