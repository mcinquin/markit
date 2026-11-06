import {
  canChangeRole,
  canDeleteCard,
  canDeleteTeam,
  canManagePhrases,
  canRegenerateInviteCode,
  canRemoveMember,
  hasTeamRole,
  type TeamActor,
} from "@/lib/authz-rules";
import type { TeamRole } from "@/lib/team-roles";

function actor(role: TeamRole | null, isSiteAdmin = false, userId = "me"): TeamActor {
  return { userId, role, isSiteAdmin };
}

describe("hasTeamRole", () => {
  it.each([
    ["MEMBER", "MEMBER", true],
    ["MEMBER", "ADMIN", false],
    ["ADMIN", "MEMBER", true],
    ["ADMIN", "OWNER", false],
    ["OWNER", "OWNER", true],
  ] as const)("%s ≥ %s → %s", (role, min, expected) => {
    expect(hasTeamRole(actor(role), min)).toBe(expected);
  });

  it("refuse un non-membre", () => {
    expect(hasTeamRole(actor(null), "MEMBER")).toBe(false);
  });

  it("autorise toujours l'admin du site, même non membre", () => {
    expect(hasTeamRole(actor(null, true), "OWNER")).toBe(true);
  });
});

describe("canManagePhrases", () => {
  it("réserve la gestion des phrases à ADMIN et plus", () => {
    expect(canManagePhrases(actor("MEMBER"))).toBe(false);
    expect(canManagePhrases(actor("ADMIN"))).toBe(true);
    expect(canManagePhrases(actor("OWNER"))).toBe(true);
  });
});

describe("canDeleteCard", () => {
  it("autorise le créateur membre", () => {
    expect(canDeleteCard(actor("MEMBER"), "me")).toBe(true);
  });

  it("refuse la grille d'un autre à un MEMBER", () => {
    expect(canDeleteCard(actor("MEMBER"), "other")).toBe(false);
    expect(canDeleteCard(actor("MEMBER"), null)).toBe(false);
  });

  it("refuse un créateur qui n'est plus membre", () => {
    expect(canDeleteCard(actor(null), "me")).toBe(false);
  });

  it("autorise ADMIN, OWNER et l'admin du site sur toute grille", () => {
    expect(canDeleteCard(actor("ADMIN"), "other")).toBe(true);
    expect(canDeleteCard(actor("OWNER"), null)).toBe(true);
    expect(canDeleteCard(actor(null, true), "other")).toBe(true);
  });
});

describe("canDeleteTeam", () => {
  it("réserve la suppression à OWNER et à l'admin du site", () => {
    expect(canDeleteTeam(actor("MEMBER"))).toBe(false);
    expect(canDeleteTeam(actor("ADMIN"))).toBe(false);
    expect(canDeleteTeam(actor("OWNER"))).toBe(true);
    expect(canDeleteTeam(actor(null, true))).toBe(true);
  });
});

describe("canChangeRole", () => {
  it("refuse à ADMIN et MEMBER", () => {
    expect(canChangeRole(actor("ADMIN"), { role: "MEMBER" }, "ADMIN", 1)).toBe(false);
    expect(canChangeRole(actor("MEMBER"), { role: "MEMBER" }, "ADMIN", 1)).toBe(false);
  });

  it("permet à l'OWNER de promouvoir, rétrograder et nommer un autre OWNER", () => {
    expect(canChangeRole(actor("OWNER"), { role: "MEMBER" }, "ADMIN", 1)).toBe(true);
    expect(canChangeRole(actor("OWNER"), { role: "ADMIN" }, "MEMBER", 1)).toBe(true);
    expect(canChangeRole(actor("OWNER"), { role: "MEMBER" }, "OWNER", 1)).toBe(true);
  });

  it("protège le dernier OWNER", () => {
    expect(canChangeRole(actor("OWNER"), { role: "OWNER" }, "ADMIN", 1)).toBe(false);
    expect(canChangeRole(actor(null, true), { role: "OWNER" }, "MEMBER", 1)).toBe(false);
  });

  it("permet de rétrograder un OWNER s'il en reste un autre", () => {
    expect(canChangeRole(actor("OWNER"), { role: "OWNER" }, "ADMIN", 2)).toBe(true);
  });
});

describe("canRemoveMember", () => {
  it("permet à un membre de quitter l'équipe", () => {
    expect(canRemoveMember(actor("MEMBER"), { userId: "me", role: "MEMBER" }, 1)).toBe(true);
    expect(canRemoveMember(actor("ADMIN"), { userId: "me", role: "ADMIN" }, 1)).toBe(true);
  });

  it("bloque le départ du dernier OWNER", () => {
    expect(canRemoveMember(actor("OWNER"), { userId: "me", role: "OWNER" }, 1)).toBe(false);
    expect(canRemoveMember(actor("OWNER"), { userId: "me", role: "OWNER" }, 2)).toBe(true);
  });

  it("autorise ADMIN/OWNER à retirer un MEMBER", () => {
    expect(canRemoveMember(actor("MEMBER"), { userId: "other", role: "MEMBER" }, 1)).toBe(false);
    expect(canRemoveMember(actor("ADMIN"), { userId: "other", role: "MEMBER" }, 1)).toBe(true);
    expect(canRemoveMember(actor("OWNER"), { userId: "other", role: "MEMBER" }, 1)).toBe(true);
  });

  it("interdit à un ADMIN de retirer un OWNER", () => {
    expect(canRemoveMember(actor("ADMIN"), { userId: "other", role: "OWNER" }, 2)).toBe(false);
    expect(canRemoveMember(actor("OWNER"), { userId: "other", role: "OWNER" }, 2)).toBe(true);
  });

  it("bloque le retrait du dernier OWNER", () => {
    expect(canRemoveMember(actor("OWNER"), { userId: "other", role: "OWNER" }, 1)).toBe(false);
    expect(canRemoveMember(actor(null, true), { userId: "other", role: "OWNER" }, 1)).toBe(false);
  });

  it("autorise l'admin du site à retirer un membre", () => {
    expect(canRemoveMember(actor(null, true), { userId: "other", role: "MEMBER" }, 1)).toBe(true);
  });
});

describe("canRegenerateInviteCode", () => {
  it("réserve la régénération à OWNER et à l'admin du site", () => {
    expect(canRegenerateInviteCode(actor("MEMBER"))).toBe(false);
    expect(canRegenerateInviteCode(actor("ADMIN"))).toBe(false);
    expect(canRegenerateInviteCode(actor("OWNER"))).toBe(true);
    expect(canRegenerateInviteCode(actor(null, true))).toBe(true);
  });
});
