export type CellUpdatedEvent = {
  cellId: string;
  checked: boolean;
  userName: string;
};

export type BingoAchievedEvent = {
  userName: string;
  type: "row" | "column" | "diagonal";
  index: number;
};

/**
 * Diffuse une mise à jour de case à tous les joueurs de la grille.
 * No-op si Socket.io n'est pas monté (ex. `next dev` sans server.js).
 */
export function emitCellUpdated(cardId: string, event: CellUpdatedEvent) {
  global.io?.to(`card:${cardId}`).emit("cell-updated", event);
}

/**
 * Diffuse un bingo validé côté serveur à tous les joueurs de la grille
 * (y compris celui qui a coché la case gagnante).
 */
export function emitBingoAchieved(cardId: string, event: BingoAchievedEvent) {
  global.io?.to(`card:${cardId}`).emit("bingo-achieved", event);
}
