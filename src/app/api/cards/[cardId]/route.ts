import { NextResponse } from "next/server";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { canDeleteOwnedResource, getCardIfMember } from "@/lib/authz";
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
    select: { createdById: true },
  });
  if (!card) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (!canDeleteOwnedResource(auth.session.user.id, card.createdById, auth.profile.isAdmin)) {
    return NextResponse.json({ error: "Suppression non autorisée" }, { status: 403 });
  }

  await prisma.bingoCard.delete({ where: { id: cardId } });
  return NextResponse.json({ ok: true });
}
