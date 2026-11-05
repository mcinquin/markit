import { detectBingo, getCheckedPositions, getFreeCenterPosition } from "@/lib/bingo";
import type { PlayCard } from "@/lib/data";
import type { BingoPattern } from "@/types";

export type CheckedBy = { userId?: string; name: string | null };

/** Ids des cases cochées (la case FREE est cochée en BDD à la création). */
export function getCheckedCellIds(card: PlayCard): Set<string> {
  return new Set(card.cells.filter((cell) => cell.checked.length > 0).map((cell) => cell.id));
}

export function getCardPatterns(card: PlayCard): BingoPattern[] {
  const positions = getCheckedPositions(
    card.cells,
    getCheckedCellIds(card),
    getFreeCenterPosition(card)
  );
  return detectBingo(positions, card.rows, card.cols);
}

/** Copie de la grille avec une case cochée (par `checkedBy`) ou décochée (`null`). */
export function setCellChecked(
  card: PlayCard,
  cellId: string,
  checkedBy: CheckedBy | null
): PlayCard {
  return {
    ...card,
    cells: card.cells.map((cell) => {
      if (cell.id !== cellId) return cell;
      if (!checkedBy) return { ...cell, checked: [] };

      const previous = cell.checked[0];
      const userId = checkedBy.userId ?? previous?.userId ?? "";
      return {
        ...cell,
        checked: [
          {
            id: previous?.id ?? `live-${cellId}`,
            userId,
            user: { id: userId, name: checkedBy.name ?? previous?.user.name ?? null },
          },
        ],
      };
    }),
  };
}
