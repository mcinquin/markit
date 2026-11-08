import { findNewBingoPatterns } from "@/lib/bingo-achievements";
import type { BingoPattern } from "@/types";

describe("findNewBingoPatterns", () => {
  const row0: BingoPattern = { type: "row", index: 0, positions: [0, 1, 2] };
  const col1: BingoPattern = { type: "column", index: 1, positions: [1, 4, 7] };
  const diag: BingoPattern = { type: "diagonal", index: 0, positions: [0, 4, 8] };

  it("retourne tous les patterns s'il n'y a rien en base", () => {
    expect(findNewBingoPatterns([row0, col1], [])).toEqual([row0, col1]);
  });

  it("filtre les patterns déjà persistés", () => {
    expect(findNewBingoPatterns([row0, col1, diag], [{ type: "row", index: 0 }])).toEqual([
      col1,
      diag,
    ]);
  });

  it("retourne un tableau vide si rien de nouveau", () => {
    expect(
      findNewBingoPatterns([row0], [{ type: "row", index: 0 }, { type: "column", index: 1 }])
    ).toEqual([]);
  });
});
