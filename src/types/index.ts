export interface BingoCardWithCells {
  id: string;
  teamId: string;
  label: string;
  rows: number;
  cols: number;
  freeCenter: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  playedAt: Date | null;
  cells: CellWithPhrase[];
}

export interface CellWithPhrase {
  id: string;
  cardId: string;
  phraseId: string;
  position: number;
  phrase: {
    id: string;
    text: string;
    emoji: string | null;
  };
  checked: CheckedCellInfo[];
}

export interface CheckedCellInfo {
  id: string;
  cellId: string;
  userId: string;
  checkedAt: Date;
  user: {
    id: string;
    name: string | null;
  };
}

export interface BingoPattern {
  type: "row" | "column" | "diagonal";
  index: number;
  positions: number[];
}

export type TeamWithMembers = {
  id: string;
  name: string;
  inviteCode: string;
  members: {
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
    role: string;
  }[];
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
