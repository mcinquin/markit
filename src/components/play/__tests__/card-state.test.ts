import type { PlayCard } from "@/lib/data";
import { getCardPatterns, getCheckedCellIds, setCellChecked } from "../card-state";

function makeCard(checkedIds: string[] = []): PlayCard {
  return {
    id: "card",
    label: "Test",
    rows: 3,
    cols: 3,
    freeCenter: true,
    isActive: true,
    team: { id: "team", name: "Équipe" },
    cells: Array.from({ length: 9 }, (_, position) => {
      const id = `cell-${position}`;
      return {
        id,
        position,
        phrase: { id: `p-${position}`, text: `Phrase ${position}`, emoji: null },
        checked: checkedIds.includes(id)
          ? [{ id: `chk-${position}`, userId: "u1", user: { id: "u1", name: "Alice" } }]
          : [],
      };
    }),
  };
}

describe("getCheckedCellIds", () => {
  it("liste les cases ayant un check", () => {
    expect(getCheckedCellIds(makeCard(["cell-0", "cell-4"]))).toEqual(
      new Set(["cell-0", "cell-4"])
    );
  });
});

describe("getCardPatterns", () => {
  it("compte la case FREE dans les motifs", () => {
    // Colonne du milieu : 1, (4 = FREE), 7
    const patterns = getCardPatterns(makeCard(["cell-1", "cell-7"]));
    expect(patterns).toEqual([{ type: "column", index: 1, positions: [1, 4, 7] }]);
  });
});

describe("setCellChecked", () => {
  it("coche une case avec l'auteur", () => {
    const card = setCellChecked(makeCard(), "cell-2", { userId: "u2", name: "Bob" });
    expect(card.cells[2].checked).toEqual([
      { id: "live-cell-2", userId: "u2", user: { id: "u2", name: "Bob" } },
    ]);
  });

  it("conserve l'identité existante si l'événement n'a pas d'userId", () => {
    const card = setCellChecked(makeCard(["cell-0"]), "cell-0", { name: "Alice B." });
    expect(card.cells[0].checked[0]).toEqual({
      id: "chk-0",
      userId: "u1",
      user: { id: "u1", name: "Alice B." },
    });
  });

  it("décoche une case sans muter l'original", () => {
    const original = makeCard(["cell-0"]);
    const card = setCellChecked(original, "cell-0", null);
    expect(card.cells[0].checked).toEqual([]);
    expect(original.cells[0].checked).toHaveLength(1);
  });
});
