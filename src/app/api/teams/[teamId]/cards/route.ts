import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shuffleArray, getCenterPosition } from "@/lib/bingo";
import { getTeamMembership } from "@/lib/authz";

const MAX_LABEL_LENGTH = 150;
const MAX_GRID_SIZE = 10;
const MIN_GRID_SIZE = 2;

export async function GET(_req: Request, { params }: { params: { teamId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const membership = await getTeamMembership(session.user.id, params.teamId);
  if (!membership) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const cards = await prisma.bingoCard.findMany({
    where: { teamId: params.teamId },
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

export async function POST(req: Request, { params }: { params: { teamId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const membership = await getTeamMembership(session.user.id, params.teamId);
  if (!membership) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json();
  const { label, rows, cols, freeCenter, phraseIds } = body;

  if (!label || typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ error: "Label requis" }, { status: 400 });
  }
  if (label.trim().length > MAX_LABEL_LENGTH) {
    return NextResponse.json({ error: `Label trop long (max ${MAX_LABEL_LENGTH} caractères)` }, { status: 400 });
  }

  const r = parseInt(rows, 10);
  const c = parseInt(cols, 10);
  if (!r || !c || r < MIN_GRID_SIZE || c < MIN_GRID_SIZE || r > MAX_GRID_SIZE || c > MAX_GRID_SIZE) {
    return NextResponse.json(
      { error: `Dimensions invalides (${MIN_GRID_SIZE}–${MAX_GRID_SIZE})` },
      { status: 400 }
    );
  }

  const totalCells = r * c;
  const centerPos = freeCenter ? getCenterPosition(r, c) : null;
  const neededPhrases = centerPos !== null ? totalCells - 1 : totalCells;

  if (!Array.isArray(phraseIds) || phraseIds.length < neededPhrases) {
    return NextResponse.json(
      { error: `Il faut au moins ${neededPhrases} phrases` },
      { status: 400 }
    );
  }

  // Vérifie que les phraseIds fournis appartiennent bien à cette équipe ou sont des phrases globales
  const validPhrases = await prisma.phrase.findMany({
    where: {
      id: { in: phraseIds },
      OR: [{ isDefault: true }, { teamId: params.teamId }],
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
      teamId: params.teamId,
      label: label.trim(),
      rows: r,
      cols: c,
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
        data: { cellId: freeCell.id, userId: session.user.id },
      });
    }
  }

  return NextResponse.json(card, { status: 201 });
}
