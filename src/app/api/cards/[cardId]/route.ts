import { NextResponse } from "next/server";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { canDeleteCard, getCardIfMember } from "@/lib/authz";
import { isAdmin } from "@/lib/admin";
import { updateCardSchema } from "@/lib/schemas/card";
import { parseJsonBody } from "@/lib/schemas/parse";

type RouteContext = { params: Promise<{ cardId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { cardId } = await params;
  const userId = auth.session.user.id;

  const [access, userIsAdmin] = await Promise.all([
    getCardIfMember(userId, cardId),
    isAdmin(userId),
  ]);
  if (!access && !userIsAdmin) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const card = await prisma.bingoCard.findUnique({
    where: { id: cardId },
    include: {
      cells: {
        include: {
          phrase: true,
          checked: { include: { user: { select: { id: true, name: true } } } },
        },
        orderBy: { position: "asc" },
      },
      team: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
          },
        },
      },
    },
  });

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
  const userId = auth.session.user.id;

  const card = await prisma.bingoCard.findUnique({
    where: { id: cardId },
    select: { id: true, createdById: true },
  });
  if (!card) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (!(await canDeleteCard(userId, cardId))) {
    return NextResponse.json({ error: "Suppression non autorisée" }, { status: 403 });
  }

  await prisma.bingoCard.delete({ where: { id: cardId } });
  return NextResponse.json({ ok: true });
}
