import { Prisma, type BingoPatternType } from "@prisma/client";
import { detectBingo, getCheckedPositions, getFreeCenterPosition } from "@/lib/bingo";
import { prisma } from "@/lib/prisma";
import { emitBingoAchieved } from "@/lib/realtime";
import type { BingoPattern } from "@/types";

export type CardGeometry = {
  rows: number;
  cols: number;
  freeCenter: boolean;
};

/** Diff patterns currently on the board against those already persisted. */
export function findNewBingoPatterns(
  current: BingoPattern[],
  existing: ReadonlyArray<{ type: BingoPatternType; index: number }>
): BingoPattern[] {
  const known = new Set(existing.map((p) => `${p.type}:${p.index}`));
  return current.filter((p) => !known.has(`${p.type}:${p.index}`));
}

/**
 * After a cell check, recompute bingo patterns, persist any new ones, and emit
 * `bingo-achieved` for each successful insert (race-safe via unique constraint).
 */
export async function persistNewBingos(params: {
  cardId: string;
  userId: string;
  userName: string;
  geometry: CardGeometry;
}): Promise<BingoPattern[]> {
  const { cardId, userId, userName, geometry } = params;

  const cells = await prisma.cell.findMany({
    where: { cardId },
    select: {
      id: true,
      position: true,
      checked: { select: { id: true } },
    },
  });

  const checkedCellIds = new Set(
    cells.filter((cell) => cell.checked.length > 0).map((cell) => cell.id)
  );
  const freeCenterPosition = getFreeCenterPosition(geometry);
  const positions = getCheckedPositions(cells, checkedCellIds, freeCenterPosition);
  const patterns = detectBingo(positions, geometry.rows, geometry.cols);
  if (patterns.length === 0) return [];

  const existing = await prisma.bingo.findMany({
    where: { cardId },
    select: { type: true, index: true },
  });
  const newcomers = findNewBingoPatterns(patterns, existing);
  if (newcomers.length === 0) return [];

  const created: BingoPattern[] = [];

  for (const pattern of newcomers) {
    try {
      await prisma.bingo.create({
        data: {
          cardId,
          userId,
          type: pattern.type,
          index: pattern.index,
        },
      });
      created.push(pattern);
      emitBingoAchieved(cardId, {
        userName,
        type: pattern.type,
        index: pattern.index,
      });
    } catch (err) {
      // Concurrent check already persisted this pattern — skip emit.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue;
      }
      throw err;
    }
  }

  return created;
}
