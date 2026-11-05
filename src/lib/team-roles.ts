/** Rôles d'équipe, du moins au plus privilégié (miroir de l'enum Prisma `Role`). */
export const TEAM_ROLES = ["MEMBER", "ADMIN", "OWNER"] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

export function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === "string" && (TEAM_ROLES as readonly string[]).includes(value);
}
