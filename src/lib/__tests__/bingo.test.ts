import { detectBingo, getCenterPosition, shuffleArray } from "@/lib/bingo";

describe("detectBingo", () => {
  it("détecte une ligne complète", () => {
    const checked = new Set([0, 1, 2]);
    const patterns = detectBingo(checked, 3, 3);
    expect(patterns.some((p) => p.type === "row" && p.index === 0)).toBe(true);
  });

  it("détecte une colonne complète", () => {
    const checked = new Set([1, 4, 7]);
    const patterns = detectBingo(checked, 3, 3);
    expect(patterns.some((p) => p.type === "column" && p.index === 1)).toBe(true);
  });

  it("détecte les diagonales sur grille carrée", () => {
    const main = detectBingo(new Set([0, 4, 8]), 3, 3);
    expect(main.some((p) => p.type === "diagonal" && p.index === 0)).toBe(true);

    const anti = detectBingo(new Set([2, 4, 6]), 3, 3);
    expect(anti.some((p) => p.type === "diagonal" && p.index === 1)).toBe(true);
  });

  it("ne détecte rien si incomplet", () => {
    expect(detectBingo(new Set([0, 1]), 3, 3)).toHaveLength(0);
  });

  it("ignore les diagonales sur grille non carrée", () => {
    const patterns = detectBingo(new Set([0, 5, 10]), 2, 3);
    expect(patterns.every((p) => p.type !== "diagonal")).toBe(true);
  });
});

describe("getCenterPosition", () => {
  it("retourne le centre pour une grille impaire", () => {
    expect(getCenterPosition(5, 5)).toBe(12);
  });

  it("retourne null pour dimensions paires", () => {
    expect(getCenterPosition(4, 4)).toBeNull();
    expect(getCenterPosition(5, 4)).toBeNull();
  });
});

describe("shuffleArray", () => {
  it("conserve les éléments", () => {
    const input = [1, 2, 3, 4, 5];
    const output = shuffleArray(input);
    expect(output).toHaveLength(input.length);
    expect([...output].sort()).toEqual([...input].sort());
    expect(output).not.toBe(input);
  });
});
