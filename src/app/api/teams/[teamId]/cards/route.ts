import { NextResponse } from "next/server";
import { requireApiAccountReady } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { shuffleArray, getCenterPosition } from "@/lib/bingo";
import { getTeamMembership } from "@/lib/authz";
import { createCardSchema } from "@/lib/schemas/card";
import { parseJsonBody } from "@/lib/schemas/parse";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  const membership = await getTeamMembership(auth.session.user.id, teamId);
  if (!membership) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const cards = await prisma.bingoCard.findMany({
    where: { teamId },
    include: {
      cells: {
        include: {
          phrase: true,
          checked: { include: { user: { select: { id: true, name: true } } } },
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(cards);
}

export async function POST(req: Request, { params }: RouteContext) {
  const auth = await requireApiAccountReady();
  if (!auth.ok) return auth.response;

  const { teamId } = await params;

  const membership = await getTeamMembership(auth.session.user.id, teamId);
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

  const validIds = validPhrases.map((p) => p.id);
  const shuffled = shuffleArray(validIds).slice(0, neededPhrases);

  const cellsData: { phraseId: string; position: number }[] = [];
  let phraseIndex = 0;
  for (let pos = 0; pos < totalCells; pos++) {
    if (centerPos !== null && pos === centerPos) continue;
    cellsData.push({ phraseId: shuffled[phraseIndex], position: pos });
    phraseIndex++;
  }

  const card = await prisma.bingoCard.create({
    data: {
      teamId,
      label,
      rows,
      cols,
      freeCenter: centerPos !== null ? Boolean(freeCenter) : false,
      cells: { create: cellsData },
    },
    include: {
      cells: {
        include: {
          phrase: true,
          checked: { include: { user: { select: { id: true, name: true } } } },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (centerPos !== null && freeCenter) {
    const freeCell = card.cells.find((cell) => cell.position === centerPos);
    if (freeCell) {
      await prisma.checkedCell.create({
        data: { cellId: freeCell.id, userId: auth.session.user.id },
      });
    }
  }

  return NextResponse.json(card, { status: 201 });
}
