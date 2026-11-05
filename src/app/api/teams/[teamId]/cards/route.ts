import { NextResponse } from "next/server";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { shuffleArray, getCenterPosition } from "@/lib/bingo";
import { getTeamMembership } from "@/lib/authz";
import { getTeamCards, playCardSelect } from "@/lib/data";
import { createCardSchema } from "@/lib/schemas/card";
import { parseJsonBody } from "@/lib/schemas/parse";

type RouteContext = { params: Promise<{ teamId: string }> };

const FREE_PHRASE_ID = "default-free";

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  const membership = await getTeamMembership(auth.session.user.id, teamId);
  if (!membership) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json(await getTeamCards(teamId));
}

export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;
  const userId = auth.session.user.id;

  const membership = await getTeamMembership(userId, teamId);
  if (!membership) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const parsed = await parseJsonBody(req, createCardSchema);
  if (!parsed.ok) return parsed.response;

  const { label, rows, cols, freeCenter, phraseIds } = parsed.data;

  const totalCells = rows * cols;
  const centerPos = freeCenter ? getCenterPosition(rows, cols) : null;
  const neededPhrases = centerPos !== null ? totalCells - 1 : totalCells;

  if (phraseIds.length < neededPhrases) {
    return NextResponse.json(
      { error: `Il faut au moins ${neededPhrases} phrases` },
      { status: 400 }
    );
  }

  const validPhrases = await prisma.phrase.findMany({
    where: {
      id: { in: phraseIds },
      OR: [{ isDefault: true }, { teamId }],
    },
    select: { id: true },
  });

  if (validPhrases.length < neededPhrases) {
    return NextResponse.json({ error: "Certaines phrases sont invalides" }, { status: 400 });
  }

  const shuffled = shuffleArray(validPhrases.map((p) => p.id)).slice(0, neededPhrases);

  if (centerPos !== null) {
    // Phrase technique de la case FREE (affichée ★ FREE côté client)
    await prisma.phrase.upsert({
      where: { id: FREE_PHRASE_ID },
      update: {},
      create: { id: FREE_PHRASE_ID, text: "FREE", emoji: "★", isDefault: false },
    });
  }

  let phraseIndex = 0;
  const cells = Array.from({ length: totalCells }, (_, position) =>
    position === centerPos
      ? { position, phraseId: FREE_PHRASE_ID, checked: { create: { userId } } }
      : { position, phraseId: shuffled[phraseIndex++] }
  );

  const card = await prisma.bingoCard.create({
    data: {
      teamId,
      createdById: userId,
      label,
      rows,
      cols,
      freeCenter: centerPos !== null,
      cells: { create: cells },
    },
    select: playCardSelect,
  });

  return NextResponse.json(card, { status: 201 });
}
