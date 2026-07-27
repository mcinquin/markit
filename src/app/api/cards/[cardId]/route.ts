import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCardIfMember } from "@/lib/authz";

type RouteContext = { params: Promise<{ cardId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { cardId } = await params;

  // Vérifie que l'utilisateur est membre de l'équipe propriétaire
  const access = await getCardIfMember(session.user.id, cardId);
  if (!access) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

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

  return NextResponse.json(card);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { cardId } = await params;

  const access = await getCardIfMember(session.user.id, cardId);
  if (!access) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json();
  if (typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "Champ isActive invalide" }, { status: 400 });
  }

  const card = await prisma.bingoCard.update({
    where: { id: cardId },
    data: {
      isActive: body.isActive,
      playedAt: body.isActive ? new Date() : undefined,
    },
  });

  return NextResponse.json(card);
}
