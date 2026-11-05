import type { AccountProfile } from "@/lib/account";

export interface BingoPattern {
  type: "row" | "column" | "diagonal";
  index: number;
  positions: number[];
}

/** `Date` quand la donnée vient d'un Server Component, `string` après un fetch JSON. */
export type DateValue = Date | string;

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

export type AdminInvite = {
  id: string;
  token: string;
  note: string | null;
  expiresAt: DateValue;
  usedAt: DateValue | null;
  usedById: string | null;
  createdBy: { name: string | null; email: string };
};

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  createdAt: DateValue;
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
