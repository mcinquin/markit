import { z } from "zod";
import { TEAM_ROLES } from "@/lib/team-roles";

export const createTeamSchema = z.object({
  name: z
    .string({ error: "Nom requis" })
    .trim()
    .min(1, "Nom requis")
    .max(100, "Nom trop long (max 100 caractères)"),
});

export const joinTeamSchema = z.object({
  inviteCode: z.string({ error: "Code requis" }).trim().min(1, "Code requis"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(TEAM_ROLES, { error: "Rôle invalide" }),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type JoinTeamInput = z.infer<typeof joinTeamSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
