import { BingoPattern } from "@/types";

/**
 * Detects bingo patterns (rows, columns, diagonals) in a grid.
 * Returns an array of winning patterns found.
 */
export function detectBingo(
  checkedPositions: Set<number>,
  rows: number,
  cols: number
): BingoPattern[] {
  const patterns: BingoPattern[] = [];

  // Check rows
  for (let r = 0; r < rows; r++) {
    const rowPositions: number[] = [];
    for (let c = 0; c < cols; c++) {
      rowPositions.push(r * cols + c);
    }
    if (rowPositions.every((pos) => checkedPositions.has(pos))) {
      patterns.push({ type: "row", index: r, positions: rowPositions });
    }
  }

  // Check columns
  for (let c = 0; c < cols; c++) {
    const colPositions: number[] = [];
    for (let r = 0; r < rows; r++) {
      colPositions.push(r * cols + c);
    }
    if (colPositions.every((pos) => checkedPositions.has(pos))) {
      patterns.push({ type: "column", index: c, positions: colPositions });
    }
  }

  // Check main diagonal (only if square grid)
  if (rows === cols) {
    const mainDiag: number[] = [];
    for (let i = 0; i < rows; i++) {
      mainDiag.push(i * cols + i);
    }
    if (mainDiag.every((pos) => checkedPositions.has(pos))) {
      patterns.push({ type: "diagonal", index: 0, positions: mainDiag });
    }

    // Check anti-diagonal
    const antiDiag: number[] = [];
    for (let i = 0; i < rows; i++) {
      antiDiag.push(i * cols + (cols - 1 - i));
    }
    if (antiDiag.every((pos) => checkedPositions.has(pos))) {
      patterns.push({ type: "diagonal", index: 1, positions: antiDiag });
    }
  }

  return patterns;
}

/**
 * Returns the center position for "FREE" cell.
 * Returns null if grid has even dimensions.
 */
export function getCenterPosition(rows: number, cols: number): number | null {
  if (rows % 2 === 0 || cols % 2 === 0) return null;
  return Math.floor(rows / 2) * cols + Math.floor(cols / 2);
}

/**
 * Shuffles array using Fisher-Yates algorithm.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
