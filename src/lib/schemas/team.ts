import { z } from "zod";

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

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type JoinTeamInput = z.infer<typeof joinTeamSchema>;
