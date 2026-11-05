export type CellUpdatedEvent = {
  cellId: string;
  checked: boolean;
  userName: string;
};

/**
 * Diffuse une mise à jour de case à tous les joueurs de la grille.
 * No-op si Socket.io n'est pas monté (ex. `next dev` sans server.js).
 */
export function emitCellUpdated(cardId: string, event: CellUpdatedEvent) {
  global.io?.to(`card:${cardId}`).emit("cell-updated", event);
}
