import type { AccountProfile } from "@/lib/account";

export interface BingoCardWithCells {
  id: string;
  teamId: string;
  label: string;
  rows: number;
  cols: number;
  freeCenter: boolean;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  playedAt: Date | string | null;
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
  checkedAt: Date | string;
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

export type TeamMemberUser = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
};

export type DashboardTeam = {
  id: string;
  name: string;
  inviteCode: string;
  createdById?: string | null;
  members: { user: TeamMemberUser; role?: string }[];
  _count: { cards: number };
};

export type TeamWithMembers = {
  id: string;
  name: string;
  inviteCode: string;
  members: {
    user: TeamMemberUser;
    role: string;
  }[];
};

export type PhraseItem = {
  id: string;
  text: string;
  emoji: string | null;
  isDefault?: boolean;
  teamId?: string | null;
};

export type AdminInvite = {
  id: string;
  token: string;
  note: string | null;
  expiresAt: string;
  usedAt: string | null;
  usedById: string | null;
  createdBy: { name: string | null; email: string };
};

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  teams: {
    role: string;
    team: { id: string; name: string };
  }[];
};

export type { AccountProfile };

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      mustChangePassword?: boolean;
    };
  }

  interface User {
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    mustChangePassword?: boolean;
  }
}
