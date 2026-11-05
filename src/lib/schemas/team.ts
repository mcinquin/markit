import { z } from "zod";
import { TEAM_ROLES } from "@/lib/team-roles";
import { errorKey as msg } from "@/lib/error-keys";

export const MAX_TEAM_NAME_LENGTH = 100;

export const createTeamSchema = z.object({
  name: z
    .string({ error: msg("teamNameRequired") })
    .trim()
    .min(1, msg("teamNameRequired"))
    .max(MAX_TEAM_NAME_LENGTH, msg("teamNameTooLong")),
});

export const joinTeamSchema = z.object({
  inviteCode: z.string({ error: msg("inviteCodeRequired") }).trim().min(1, msg("inviteCodeRequired")),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(TEAM_ROLES, { error: msg("roleInvalid") }),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type JoinTeamInput = z.infer<typeof joinTeamSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
