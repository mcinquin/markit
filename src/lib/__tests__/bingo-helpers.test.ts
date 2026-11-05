import { getCheckedPositions, getFreeCenterPosition, getPatternLabel } from "@/lib/bingo";

describe("getFreeCenterPosition", () => {
  it("retourne le centre si activé sur grille impaire", () => {
    expect(getFreeCenterPosition({ rows: 5, cols: 5, freeCenter: true })).toBe(12);
  });

  it("retourne null si désactivé", () => {
    expect(getFreeCenterPosition({ rows: 5, cols: 5, freeCenter: false })).toBeNull();
  });

  it("retourne null sur grille paire", () => {
    expect(getFreeCenterPosition({ rows: 4, cols: 4, freeCenter: true })).toBeNull();
  });
});

describe("getCheckedPositions", () => {
  const cells = [
    { id: "a", position: 0 },
    { id: "b", position: 1 },
    { id: "c", position: 2 },
  ];

  it("inclut les cases cochées et la case FREE", () => {
    expect(getCheckedPositions(cells, new Set(["a"]), 2)).toEqual(new Set([0, 2]));
  });

  it("ignore la case FREE quand absente", () => {
    expect(getCheckedPositions(cells, new Set(["b"]), null)).toEqual(new Set([1]));
  });
});

describe("getPatternLabel", () => {
  it("formate chaque type de motif", () => {
    expect(getPatternLabel({ type: "row", index: 0, positions: [] })).toBe("Ligne 1");
    expect(getPatternLabel({ type: "column", index: 2, positions: [] })).toBe("Colonne 3");
    expect(getPatternLabel({ type: "diagonal", index: 0, positions: [] })).toBe("Diag ↘");
    expect(getPatternLabel({ type: "diagonal", index: 1, positions: [] })).toBe("Diag ↗");
  });
});
