/**
 * Tests d'authz via mock Prisma (pas de BDD réelle).
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    teamMember: {
      findUnique: jest.fn(),
    },
    bingoCard: {
      findUnique: jest.fn(),
    },
    phrase: {
      findUnique: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getTeamMembership,
  getCardIfMember,
  getPhraseIfMember,
  canDeleteOwnedResource,
  canDeleteTeam,
  canDeleteCard,
} from "@/lib/authz";

const mockedPrisma = prisma as unknown as {
  teamMember: { findUnique: jest.Mock };
  bingoCard: { findUnique: jest.Mock };
  phrase: { findUnique: jest.Mock };
  team: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
};

describe("getTeamMembership", () => {
  it("délègue à prisma avec la clé composite", async () => {
    mockedPrisma.teamMember.findUnique.mockResolvedValue({ id: "m1" });
    const result = await getTeamMembership("u1", "t1");
    expect(mockedPrisma.teamMember.findUnique).toHaveBeenCalledWith({
      where: { userId_teamId: { userId: "u1", teamId: "t1" } },
    });
    expect(result).toEqual({ id: "m1" });
  });
});

describe("getCardIfMember", () => {
  it("retourne null si la grille n'existe pas", async () => {
    mockedPrisma.bingoCard.findUnique.mockResolvedValue(null);
    expect(await getCardIfMember("u1", "c1")).toBeNull();
  });

  it("retourne null si non membre", async () => {
    mockedPrisma.bingoCard.findUnique.mockResolvedValue({
      id: "c1",
      teamId: "t1",
      createdById: "u2",
      rows: 5,
      cols: 5,
      freeCenter: true,
      isActive: true,
    });
    mockedPrisma.teamMember.findUnique.mockResolvedValue(null);
    expect(await getCardIfMember("u1", "c1")).toBeNull();
  });

  it("retourne la grille si membre", async () => {
    const card = {
      id: "c1",
      teamId: "t1",
      createdById: "u1",
      rows: 5,
      cols: 5,
      freeCenter: true,
      isActive: true,
    };
    mockedPrisma.bingoCard.findUnique.mockResolvedValue(card);
    mockedPrisma.teamMember.findUnique.mockResolvedValue({ id: "m1" });
    expect(await getCardIfMember("u1", "c1")).toEqual(card);
  });
});

describe("getPhraseIfMember", () => {
  it("autorise les phrases globales", async () => {
    mockedPrisma.phrase.findUnique.mockResolvedValue({
      id: "p1",
      isDefault: true,
      teamId: null,
    });
    const phrase = await getPhraseIfMember("u1", "p1");
    expect(phrase?.isDefault).toBe(true);
  });

  it("refuse une phrase d'équipe sans membership", async () => {
    mockedPrisma.phrase.findUnique.mockResolvedValue({
      id: "p1",
      isDefault: false,
      teamId: "t1",
    });
    mockedPrisma.teamMember.findUnique.mockResolvedValue(null);
    expect(await getPhraseIfMember("u1", "p1")).toBeNull();
  });
});

describe("canDeleteOwnedResource", () => {
  it("autorise l'admin", () => {
    expect(canDeleteOwnedResource("u1", "u2", true)).toBe(true);
  });

  it("autorise le créateur", () => {
    expect(canDeleteOwnedResource("u1", "u1", false)).toBe(true);
  });

  it("refuse un non-créateur non-admin", () => {
    expect(canDeleteOwnedResource("u1", "u2", false)).toBe(false);
  });

  it("refuse si pas de créateur et non-admin", () => {
    expect(canDeleteOwnedResource("u1", null, false)).toBe(false);
  });
});

describe("canDeleteTeam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retourne false si équipe absente", async () => {
    mockedPrisma.team.findUnique.mockResolvedValue(null);
    mockedPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    expect(await canDeleteTeam("u1", "t1")).toBe(false);
  });

  it("autorise le créateur", async () => {
    mockedPrisma.team.findUnique.mockResolvedValue({ createdById: "u1" });
    mockedPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    expect(await canDeleteTeam("u1", "t1")).toBe(true);
  });

  it("autorise l'admin sur une équipe d'autrui", async () => {
    mockedPrisma.team.findUnique.mockResolvedValue({ createdById: "u2" });
    mockedPrisma.user.findUnique.mockResolvedValue({ isAdmin: true });
    expect(await canDeleteTeam("u1", "t1")).toBe(true);
  });
});

describe("canDeleteCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuse un membre non créateur", async () => {
    mockedPrisma.bingoCard.findUnique.mockResolvedValue({ createdById: "u2" });
    mockedPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    expect(await canDeleteCard("u1", "c1")).toBe(false);
  });

  it("autorise le créateur de la grille", async () => {
    mockedPrisma.bingoCard.findUnique.mockResolvedValue({ createdById: "u1" });
    mockedPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    expect(await canDeleteCard("u1", "c1")).toBe(true);
  });
});
